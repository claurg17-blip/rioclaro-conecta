// Rutas de seguimientos (quejas y dudas de clientes) con semáforo de primera respuesta.
// Se montan en app.js bajo /api/seguimientos, DESPUÉS de requireAuth.
//   GET   /api/seguimientos?estado=&cliente=&folio=  → Ventas, Gerente, Admin: lista con semáforo
//   POST  /api/seguimientos                         → Ventas, Gerente, Admin: registrar
//   PATCH /api/seguimientos/:id                     → Ventas, Gerente, Admin: cambiar estado o responsable
//
// Semáforo (tiempo entre que se registró y la primera respuesta; si no hay respuesta, hasta ahora):
//   verde < 10 min · amarillo 10–15 min · rojo > 15 min
// "Vencido" = sigue sin primera respuesta y ya pasaron más de 15 minutos.
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const seguimientosRouter = Router();

// Todas las rutas de este archivo son para Ventas, Gerente y Admin (Bodega no)
seguimientosRouter.use(requireRole("Ventas", "Gerente", "Admin"));

const ESTADOS = ["Abierto", "En proceso", "Cerrado"];
const CANALES = ["teléfono", "WhatsApp", "correo"];
const esIdValido = (v) => Number.isInteger(v) && v > 0;

// Minutos hasta la primera respuesta (o hasta ahora, si aún no hay respuesta).
// Se usa en la lista y al regresar un seguimiento.
const MINUTOS = `EXTRACT(EPOCH FROM (COALESCE(sg.primera_respuesta_en, now()) - sg.creado_en)) / 60`;

// Columnas que regresamos de cada seguimiento, con nombres legibles y el semáforo ya calculado
const COLUMNAS = `sg.id, sg.estado, sg.canal, sg.motivo, sg.descripcion, sg.origen,
  sg.creado_en, sg.primera_respuesta_en, sg.cerrado_en,
  pe.folio, sg.cliente_id, c.nombre AS cliente,
  sg.asignado_a, ua.nombre AS responsable, uc.nombre AS creado_por,
  FLOOR(${MINUTOS})::int AS minutos_respuesta,
  CASE WHEN ${MINUTOS} < 10 THEN 'verde' WHEN ${MINUTOS} <= 15 THEN 'amarillo' ELSE 'rojo' END AS semaforo,
  (sg.primera_respuesta_en IS NULL AND sg.estado <> 'Cerrado'
   AND sg.creado_en < now() - interval '15 minutes') AS vencido`;

const DESDE = `FROM seguimientos sg
  LEFT JOIN pedidos pe ON pe.id = sg.pedido_id
  LEFT JOIN clientes c ON c.id = sg.cliente_id
  LEFT JOIN usuarios ua ON ua.id = sg.asignado_a
  LEFT JOIN usuarios uc ON uc.id = sg.creado_por`;

// Busca un seguimiento por id (o undefined si no existe)
async function buscarSeguimiento(id) {
  const { rows: [s] } = await pool.query(`SELECT ${COLUMNAS} ${DESDE} WHERE sg.id = $1`, [id]);
  return s;
}

// Revisa que el responsable exista y esté activo; devuelve un mensaje de error o null
async function validarResponsable(id) {
  if (!esIdValido(id)) return "Responsable no válido";
  const { rows: [u] } = await pool.query("SELECT activo FROM usuarios WHERE id = $1", [id]);
  return u?.activo ? null : "El responsable no existe o está desactivado";
}

// GET /api/seguimientos?estado=&cliente=&folio=
// Primero los no cerrados (los vencidos arriba), luego los más recientes. Máximo 200.
seguimientosRouter.get("/", async (req, res) => {
  const estado = req.query.estado || null;
  if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado no válido" });

  let cliente = null;
  if (req.query.cliente !== undefined && req.query.cliente !== "") {
    cliente = Number(req.query.cliente);
    if (!esIdValido(cliente)) return res.status(400).json({ error: "Cliente no válido" });
  }
  const folio = req.query.folio ? String(req.query.folio).trim().toUpperCase() : null;

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE}
     WHERE ($1::text IS NULL OR sg.estado = $1)
       AND ($2::int IS NULL OR sg.cliente_id = $2)
       AND ($3::text IS NULL OR pe.folio = $3)
     ORDER BY (sg.estado = 'Cerrado'), vencido DESC, sg.creado_en DESC
     LIMIT 200`,
    [estado, cliente, folio]);
  res.json(rows);
});

// POST /api/seguimientos
// body: { folio?, cliente_id?, canal, motivo, descripcion, asignado_a? }
// - Se registra contra un pedido (folio), un cliente, o ambos. Si solo viene el folio,
//   el cliente se toma del pedido.
// - Si no se indica responsable, queda asignado a quien lo registra.
seguimientosRouter.post("/", async (req, res) => {
  const { cliente_id = null, canal } = req.body ?? {};
  const folio = req.body?.folio ? String(req.body.folio).trim().toUpperCase() : null;
  const motivo = String(req.body?.motivo ?? "").trim();
  const descripcion = String(req.body?.descripcion ?? "").trim();
  const asignado_a = req.body?.asignado_a ?? req.user.id;

  // --- Validaciones ---
  if (!folio && cliente_id === null)
    return res.status(400).json({ error: "Indica el pedido (folio) o el cliente" });
  if (cliente_id !== null && !esIdValido(cliente_id)) return res.status(400).json({ error: "Cliente no válido" });
  if (!CANALES.includes(canal)) return res.status(400).json({ error: "Canal no válido (teléfono, WhatsApp o correo)" });
  if (!motivo || !descripcion) return res.status(400).json({ error: "Motivo y descripción son obligatorios" });
  const errorResponsable = await validarResponsable(asignado_a);
  if (errorResponsable) return res.status(400).json({ error: errorResponsable });

  // Si viene folio, buscamos el pedido (y de ahí el cliente, si no lo mandaron)
  let pedido_id = null;
  let cliente = cliente_id;
  if (folio) {
    const { rows: [pe] } = await pool.query("SELECT id, cliente_id FROM pedidos WHERE folio = $1", [folio]);
    if (!pe) return res.status(400).json({ error: "El pedido no existe" });
    pedido_id = pe.id;
    cliente = cliente ?? pe.cliente_id;
  }

  try {
    // origen 'manual': lo registró una persona desde la app (el asistente usará 'ia')
    const { rows: [nuevo] } = await pool.query(
      `INSERT INTO seguimientos (pedido_id, cliente_id, canal, motivo, descripcion, asignado_a, creado_por, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual') RETURNING id`,
      [pedido_id, cliente, canal, motivo, descripcion, asignado_a, req.user.id]);
    res.status(201).json(await buscarSeguimiento(nuevo.id));
  } catch (err) {
    // 23503 = el cliente no existe
    if (err.code === "23503" && err.constraint?.includes("cliente_id"))
      return res.status(400).json({ error: "El cliente no existe" });
    throw err;
  }
});

// PATCH /api/seguimientos/:id — body con uno o ambos: { estado, asignado_a }
// Reglas:
//   - La primera vez que sale de "Abierto" se guarda primera_respuesta_en (detiene el semáforo)
//   - Solo Gerente y Admin pueden cerrar (sección 2.1 del diseño); al cerrar se guarda cerrado_en
//   - Un seguimiento cerrado ya no cambia
seguimientosRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!esIdValido(id)) return res.status(400).json({ error: "Id no válido" });
  const { estado, asignado_a } = req.body ?? {};

  if (estado === undefined && asignado_a === undefined)
    return res.status(400).json({ error: "No hay cambios que guardar" });
  if (estado !== undefined && !ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado no válido" });
  if (estado === "Cerrado" && !["Gerente", "Admin"].includes(req.user.rol))
    return res.status(403).json({ error: "Solo Gerente o Admin pueden cerrar un seguimiento" });
  if (asignado_a !== undefined) {
    const errorResponsable = await validarResponsable(asignado_a);
    if (errorResponsable) return res.status(400).json({ error: errorResponsable });
  }

  const { rows: [actual] } = await pool.query("SELECT estado FROM seguimientos WHERE id = $1", [id]);
  if (!actual) return res.status(404).json({ error: "Seguimiento no encontrado" });
  if (actual.estado === "Cerrado") return res.status(400).json({ error: "El seguimiento ya está cerrado" });

  // Un solo UPDATE; COALESCE deja el valor actual cuando el dato no viene.
  //   primera_respuesta_en: se llena una sola vez, cuando el estado deja de ser "Abierto"
  //   cerrado_en: se llena al cerrar
  // "AND estado <> 'Cerrado'" evita cambiarlo si alguien lo cerró justo antes
  const { rowCount } = await pool.query(
    `UPDATE seguimientos SET
       estado = COALESCE($1, estado),
       asignado_a = COALESCE($2, asignado_a),
       primera_respuesta_en = CASE WHEN primera_respuesta_en IS NULL AND COALESCE($1, estado) <> 'Abierto'
                                   THEN now() ELSE primera_respuesta_en END,
       cerrado_en = CASE WHEN $1 = 'Cerrado' THEN now() ELSE cerrado_en END
     WHERE id = $3 AND estado <> 'Cerrado'`,
    [estado ?? null, asignado_a ?? null, id]);
  if (rowCount === 0) return res.status(400).json({ error: "El seguimiento ya está cerrado" });

  res.json(await buscarSeguimiento(id));
});
