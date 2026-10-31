// Ejecutor de herramientas del agente.
// Cuando el modelo pide una herramienta (function calling), servicio.js llama a
// ejecutarHerramienta(nombre, args, usuario). Aquí:
//   1) se revisa que el rol del usuario tenga permiso para esa herramienta,
//   2) se consulta o se escribe en PostgreSQL,
//   3) se regresa SOLO lo necesario (nada de teléfonos, correos ni costos).
// Los errores se regresan como { error: "..." } para que el agente le explique
// al usuario qué pasó, en lugar de inventar un dato.
import { pool } from "../db.js";

// Qué roles pueden usar cada herramienta (Bodega no registra seguimientos)
const PERMISOS = {
  buscar_existencias: ["Admin", "Gerente", "Ventas", "Bodega"],
  consultar_pedido: ["Admin", "Gerente", "Ventas", "Bodega"],
  registrar_seguimiento: ["Admin", "Gerente", "Ventas"],
};

// La herramienta manda valores sin acentos (ver herramientas.js); aquí se traducen
// a como se guardan en la base, igual que los seguimientos capturados en la app.
const CANALES = { telefono: "teléfono", whatsapp: "WhatsApp", correo: "correo" };
const MOTIVOS = {
  retraso: "Retraso", faltante: "Faltante", producto_danado: "Producto dañado",
  duda: "Duda", otro: "Otro",
};

// Los folios se guardan en mayúsculas, ej. "RC-1042"
const normalizarFolio = (folio) => String(folio).trim().toUpperCase();

// --- buscar_existencias: producto por nombre, alias o SKU, con existencias por sucursal ---
async function buscarExistencias(args) {
  const { rows } = await pool.query(
    `SELECT DISTINCT p.sku, p.nombre, s.nombre AS sucursal, e.cantidad, e.minimo, e.actualizado_en
       FROM productos p
       LEFT JOIN producto_alias a ON a.producto_id = p.id
       JOIN existencias e ON e.producto_id = p.id
       JOIN sucursales s ON s.id = e.sucursal_id
      WHERE (p.nombre ILIKE $1 OR p.sku ILIKE $1 OR a.alias ILIKE $1)
        AND ($2::text IS NULL OR s.nombre ILIKE $2)
      ORDER BY p.sku, s.nombre LIMIT 50`,
    [`%${args.texto.trim().split(/\s+/).join("%")}%`, args.sucursal]
  );
  return rows.length ? { fuente: "existencias", resultados: rows } : { mensaje: "Sin coincidencias" };
}

// --- consultar_pedido: por folio (con su historial) o últimos 5 pedidos de un cliente ---
async function consultarPedido(args) {
  // Campos que regresamos de cada pedido; la fecha compromiso como texto AAAA-MM-DD
  const CAMPOS = `pe.id, pe.folio, c.nombre AS cliente, s.nombre AS sucursal, pe.estado,
                  to_char(pe.fecha_compromiso, 'YYYY-MM-DD') AS fecha_compromiso`;
  const DESDE = `FROM pedidos pe
                 LEFT JOIN clientes c ON c.id = pe.cliente_id
                 LEFT JOIN sucursales s ON s.id = pe.sucursal_id`;

  // 1) Por folio: un pedido con su línea de tiempo
  if (args.folio) {
    const folio = normalizarFolio(args.folio);
    const { rows: [pedido] } = await pool.query(`SELECT ${CAMPOS} ${DESDE} WHERE pe.folio = $1`, [folio]);
    if (!pedido) return { mensaje: `No existe el pedido ${folio}` };

    // Historial del pedido, del más antiguo al más reciente (sin el nombre de quién lo hizo)
    const { rows: eventos } = await pool.query(
      `SELECT estado, nota, creado_en AS fecha
         FROM pedido_eventos WHERE pedido_id = $1 ORDER BY creado_en, id`,
      [pedido.id]);

    const { id, ...datos } = pedido; // el id interno no le sirve al agente
    return { fuente: "pedidos", pedido: { ...datos, eventos } };
  }

  // 2) Por cliente: sus últimos 5 pedidos (sin historial; para verlo, se consulta por folio)
  if (args.cliente) {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS} ${DESDE}
        WHERE c.nombre ILIKE $1
        ORDER BY pe.creado_en DESC LIMIT 5`,
      [`%${args.cliente.trim().split(/\s+/).join("%")}%`]);
    if (!rows.length) return { mensaje: `No hay pedidos de un cliente parecido a "${args.cliente}"` };
    return { fuente: "pedidos", pedidos: rows.map(({ id, ...datos }) => datos) };
  }

  return { error: "Indica el folio del pedido (RC-0000) o el nombre del cliente." };
}

// --- registrar_seguimiento: queja o duda ligada a un pedido, registrada por la IA ---
async function registrarSeguimiento(args, usuario) {
  const folio = normalizarFolio(args.folio);
  const canal = CANALES[args.canal];
  const motivo = MOTIVOS[args.motivo];
  const descripcion = String(args.descripcion ?? "").trim();

  if (!canal) return { error: "Canal no válido (teléfono, WhatsApp o correo)." };
  if (!motivo) return { error: "Motivo no válido." };
  if (!descripcion) return { error: "Falta la descripción del seguimiento." };

  // El pedido nos da el cliente y la sucursal
  const { rows: [pedido] } = await pool.query(
    "SELECT id, cliente_id, sucursal_id FROM pedidos WHERE folio = $1", [folio]);
  if (!pedido) return { error: `No existe el pedido ${folio}; no se registró el seguimiento.` };

  // Gerente activo de la sucursal del pedido (si hay varios, el de id más bajo)
  const { rows: [gerente] } = await pool.query(
    `SELECT id, nombre FROM usuarios
      WHERE rol = 'Gerente' AND activo AND sucursal_id = $1
      ORDER BY id LIMIT 1`,
    [pedido.sucursal_id]);

  // origen 'ia' = lo registró el asistente; creado_por = el empleado que platicaba con él
  const { rows: [nuevo] } = await pool.query(
    `INSERT INTO seguimientos (pedido_id, cliente_id, canal, motivo, descripcion, asignado_a, creado_por, origen)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ia') RETURNING id, estado`,
    [pedido.id, pedido.cliente_id, canal, motivo, descripcion, gerente?.id ?? null, usuario.id]);

  return {
    fuente: "seguimientos",
    seguimiento: {
      id: nuevo.id, folio, estado: nuevo.estado, canal, motivo,
      asignado_a: gerente?.nombre ?? "Sin asignar (la sucursal no tiene gerente activo)",
    },
  };
}

// Qué función atiende cada herramienta
const FUNCIONES = {
  buscar_existencias: buscarExistencias,
  consultar_pedido: consultarPedido,
  registrar_seguimiento: registrarSeguimiento,
};

export async function ejecutarHerramienta(nombre, args, usuario) {
  if (!PERMISOS[nombre]?.includes(usuario.rol))
    return { error: "El usuario no tiene permiso para esta consulta." };

  try {
    return await FUNCIONES[nombre](args, usuario);
  } catch (err) {
    // Solo el mensaje técnico va al log; al agente le damos un aviso general
    console.error(`Error en la herramienta ${nombre}:`, err.message);
    return { error: "No se pudo consultar la base de datos. Intenta de nuevo en un momento." };
  }
}
