// Rutas de pedidos y su línea de tiempo (pedido_eventos).
// Se montan en app.js bajo /api/pedidos, DESPUÉS de requireAuth.
//   GET   /api/pedidos?estado=&sucursal=  → Ventas, Gerente, Admin, Bodega: lista
//   GET   /api/pedidos/:folio             → Ventas, Gerente, Admin, Bodega: detalle con productos y eventos
//   POST  /api/pedidos                    → Ventas, Gerente: crear pedido
//   PATCH /api/pedidos/:folio/estado      → Bodega, Gerente: cambiar estado (crea un evento)
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const pedidosRouter = Router();

const ESTADOS = ["Recibido", "Surtido", "Enviado", "Entregado", "Cancelado"];

// Siguiente paso permitido para cada estado. Entregado y Cancelado son finales.
// Desde cualquier estado no final también se puede pasar a Cancelado.
const SIGUIENTE = { Recibido: "Surtido", Surtido: "Enviado", Enviado: "Entregado" };

// Bodega solo puede marcar estos estados (sección 2.1 del diseño)
const ESTADOS_BODEGA = ["Surtido", "Enviado"];

const esIdValido = (v) => Number.isInteger(v) && v > 0;
// Los folios se guardan en mayúsculas, ej. "RC-1042"
const leerFolio = (req) => String(req.params.folio).trim().toUpperCase();

// Arma el detalle completo de un pedido: datos generales, productos y línea de tiempo.
// Devuelve undefined si el folio no existe.
async function buscarDetalle(folio) {
  const { rows: [pedido] } = await pool.query(
    `SELECT pe.id, pe.folio, pe.estado, pe.fecha_compromiso, pe.creado_en,
            pe.sucursal_id, s.nombre AS sucursal,
            pe.cliente_id, c.nombre AS cliente, c.telefono, c.email, c.tipo AS tipo_cliente
     FROM pedidos pe
     LEFT JOIN sucursales s ON s.id = pe.sucursal_id
     LEFT JOIN clientes c ON c.id = pe.cliente_id
     WHERE pe.folio = $1`, [folio]);
  if (!pedido) return undefined;

  // Productos del pedido; el precio es el que tenía el catálogo al momento del pedido
  const { rows: productos } = await pool.query(
    `SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad, d.cantidad,
            d.precio::float AS precio, (d.cantidad * d.precio)::float AS subtotal
     FROM pedido_detalle d JOIN productos p ON p.id = d.producto_id
     WHERE d.pedido_id = $1 ORDER BY p.nombre`, [pedido.id]);

  // Línea de tiempo, de lo más antiguo a lo más reciente, con quién hizo cada cambio
  const { rows: eventos } = await pool.query(
    `SELECT ev.id, ev.estado, ev.nota, ev.creado_en, u.nombre AS usuario
     FROM pedido_eventos ev LEFT JOIN usuarios u ON u.id = ev.usuario_id
     WHERE ev.pedido_id = $1 ORDER BY ev.creado_en, ev.id`, [pedido.id]);

  const total = productos.reduce((suma, p) => suma + p.subtotal, 0);
  return { ...pedido, total, productos, eventos };
}

// GET /api/pedidos?estado=&sucursal=
// Lista los pedidos más recientes primero (máximo 200), con su total
// y la bandera "retrasado" (ya pasó la fecha compromiso y no se ha entregado).
pedidosRouter.get("/", requireRole("Ventas", "Gerente", "Admin", "Bodega"), async (req, res) => {
  const estado = req.query.estado || null;
  if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado no válido" });

  let sucursal = null;
  if (req.query.sucursal !== undefined && req.query.sucursal !== "") {
    sucursal = Number(req.query.sucursal);
    if (!esIdValido(sucursal)) return res.status(400).json({ error: "Sucursal no válida" });
  }

  const { rows } = await pool.query(
    `SELECT pe.folio, pe.estado, pe.fecha_compromiso, pe.creado_en,
            pe.sucursal_id, s.nombre AS sucursal, c.nombre AS cliente,
            COALESCE((SELECT SUM(d.cantidad * d.precio) FROM pedido_detalle d WHERE d.pedido_id = pe.id), 0)::float AS total,
            (pe.fecha_compromiso < CURRENT_DATE AND pe.estado NOT IN ('Entregado', 'Cancelado')) AS retrasado
     FROM pedidos pe
     LEFT JOIN sucursales s ON s.id = pe.sucursal_id
     LEFT JOIN clientes c ON c.id = pe.cliente_id
     WHERE ($1::text IS NULL OR pe.estado = $1)
       AND ($2::int IS NULL OR pe.sucursal_id = $2)
     ORDER BY pe.creado_en DESC
     LIMIT 200`,
    [estado, sucursal]);
  res.json(rows);
});

// GET /api/pedidos/:folio — detalle con productos y línea de tiempo
pedidosRouter.get("/:folio", requireRole("Ventas", "Gerente", "Admin", "Bodega"), async (req, res) => {
  const detalle = await buscarDetalle(leerFolio(req));
  if (!detalle) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(detalle);
});

// POST /api/pedidos
// body: { cliente_id, sucursal_id, fecha_compromiso?, nota?, productos: [{ producto_id, cantidad }] }
// El folio se genera solo y el precio se copia del catálogo en ese momento.
// En una transacción: pedido + productos + primer evento "Recibido".
pedidosRouter.post("/", requireRole("Ventas", "Gerente"), async (req, res) => {
  const { cliente_id, sucursal_id, fecha_compromiso = null, productos } = req.body ?? {};
  const nota = String(req.body?.nota ?? "").trim() || "Pedido registrado";

  // --- Validaciones antes de tocar la base ---
  if (!esIdValido(cliente_id) || !esIdValido(sucursal_id))
    return res.status(400).json({ error: "Cliente y sucursal son obligatorios" });
  if (fecha_compromiso !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha_compromiso)))
    return res.status(400).json({ error: "La fecha compromiso debe tener el formato AAAA-MM-DD" });
  if (!Array.isArray(productos) || productos.length === 0)
    return res.status(400).json({ error: "El pedido debe tener al menos un producto" });
  for (const p of productos) {
    if (!esIdValido(p?.producto_id) || !Number.isInteger(p?.cantidad) || p.cantidad <= 0)
      return res.status(400).json({ error: "Cada producto necesita producto_id y una cantidad entera mayor a 0" });
  }
  // Un mismo producto no puede venir dos veces (la tabla no lo permite)
  if (new Set(productos.map((p) => p.producto_id)).size !== productos.length)
    return res.status(400).json({ error: "Hay productos repetidos; junta sus cantidades en una sola línea" });

  // Para una transacción usamos UNA conexión del pool (todas las consultas van por la misma)
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    // "Candado" para que dos pedidos creados al mismo tiempo no tomen el mismo folio.
    // Se libera solo al terminar la transacción.
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext('folio_pedidos'))");

    // Siguiente folio: el número más alto de los folios "RC-####" + 1
    const { rows: [{ siguiente }] } = await cliente.query(
      `SELECT COALESCE(MAX(substring(folio FROM '^RC-([0-9]+)$')::int), 0) + 1 AS siguiente FROM pedidos`);
    const folio = `RC-${String(siguiente).padStart(4, "0")}`;

    // 1) El pedido (estado inicial: Recibido)
    const { rows: [pedido] } = await cliente.query(
      `INSERT INTO pedidos (folio, cliente_id, sucursal_id, estado, fecha_compromiso)
       VALUES ($1, $2, $3, 'Recibido', $4) RETURNING id`,
      [folio, cliente_id, sucursal_id, fecha_compromiso]);

    // 2) Sus productos, con el precio actual del catálogo (solo productos activos)
    for (const p of productos) {
      const { rowCount } = await cliente.query(
        `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio)
         SELECT $1, id, $3, precio_venta FROM productos WHERE id = $2 AND activo`,
        [pedido.id, p.producto_id, p.cantidad]);
      if (rowCount === 0) {
        await cliente.query("ROLLBACK");
        return res.status(400).json({ error: `El producto ${p.producto_id} no existe o está inactivo` });
      }
    }

    // 3) Primer evento de la línea de tiempo, con el usuario que lo registró
    await cliente.query(
      `INSERT INTO pedido_eventos (pedido_id, estado, nota, usuario_id) VALUES ($1, 'Recibido', $2, $3)`,
      [pedido.id, nota, req.user.id]);

    await cliente.query("COMMIT");
    res.status(201).json(await buscarDetalle(folio));
  } catch (err) {
    await cliente.query("ROLLBACK"); // si algo falló, deshacemos todo
    // 23503 = se hace referencia a algo que no existe; err.constraint dice cuál
    if (err.code === "23503") {
      if (err.constraint?.includes("cliente_id")) return res.status(400).json({ error: "El cliente no existe" });
      if (err.constraint?.includes("sucursal_id")) return res.status(400).json({ error: "La sucursal no existe" });
    }
    // 22008 = fecha imposible, ej. 2026-02-31
    if (err.code === "22008") return res.status(400).json({ error: "La fecha compromiso no es válida" });
    throw err;
  } finally {
    cliente.release(); // devolvemos la conexión al pool (¡siempre!)
  }
});

// PATCH /api/pedidos/:folio/estado — body: { estado, nota? }
// Reglas:
//   - Solo se avanza un paso: Recibido → Surtido → Enviado → Entregado
//   - Cancelado se puede marcar desde cualquier estado que no sea final (solo Gerente)
//   - Bodega solo puede marcar Surtido o Enviado
//   - Entregado y Cancelado ya no cambian
pedidosRouter.patch("/:folio/estado", requireRole("Bodega", "Gerente"), async (req, res) => {
  const folio = leerFolio(req);
  const { estado } = req.body ?? {};
  const nota = String(req.body?.nota ?? "").trim() || null;

  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado no válido" });
  if (req.user.rol === "Bodega" && !ESTADOS_BODEGA.includes(estado))
    return res.status(403).json({ error: "Bodega solo puede marcar pedidos como Surtido o Enviado" });

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    // Leemos el pedido y lo bloqueamos para que nadie más lo cambie al mismo tiempo
    const { rows: [pedido] } = await cliente.query(
      "SELECT id, estado FROM pedidos WHERE folio = $1 FOR UPDATE", [folio]);
    if (!pedido) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // ¿El cambio está permitido desde el estado actual?
    const esFinal = pedido.estado === "Entregado" || pedido.estado === "Cancelado";
    const permitido = !esFinal && (estado === "Cancelado" || SIGUIENTE[pedido.estado] === estado);
    if (!permitido) {
      await cliente.query("ROLLBACK");
      const mensaje = esFinal
        ? `El pedido ya está ${pedido.estado} y no puede cambiar`
        : `De ${pedido.estado} solo se puede pasar a ${SIGUIENTE[pedido.estado]} o Cancelado`;
      return res.status(400).json({ error: mensaje });
    }

    // 1) Nuevo estado del pedido
    await cliente.query("UPDATE pedidos SET estado = $1 WHERE id = $2", [estado, pedido.id]);
    // 2) Evento en la línea de tiempo, con el usuario que hizo el cambio
    await cliente.query(
      "INSERT INTO pedido_eventos (pedido_id, estado, nota, usuario_id) VALUES ($1, $2, $3, $4)",
      [pedido.id, estado, nota, req.user.id]);

    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }

  // Ya fuera de la transacción, regresamos el detalle actualizado
  res.json(await buscarDetalle(folio));
});
