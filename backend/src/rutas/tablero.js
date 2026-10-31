// Ruta del tablero de Inicio (indicadores para Don Ernesto y los gerentes).
// Se monta en app.js bajo /api/tablero, DESPUÉS de requireAuth.
//   GET /api/tablero → Gerente, Admin
// Regresa:
//   seguimientos.abiertos   → cuántos no están cerrados (Abierto + En proceso)
//   seguimientos.vencidos   → cuántos llevan más de 15 min sin primera respuesta, y cuáles son
//   bajo_minimo             → por cada sucursal, los productos por debajo del mínimo
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const tableroRouter = Router();

// Misma regla de "vencido" que en rutas/seguimientos.js
const VENCIDO = `sg.primera_respuesta_en IS NULL AND sg.estado <> 'Cerrado'
  AND sg.creado_en < now() - interval '15 minutes'`;

tableroRouter.get("/", requireRole("Gerente", "Admin"), async (_req, res) => {
  // Las tres consultas no dependen entre sí, así que las lanzamos al mismo tiempo
  const [conteos, vencidos, bajoMinimo] = await Promise.all([
    // 1) Conteos de seguimientos
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE sg.estado <> 'Cerrado')::int     AS abiertos,
              COUNT(*) FILTER (WHERE sg.estado = 'Abierto')::int      AS sin_atender,
              COUNT(*) FILTER (WHERE sg.estado = 'En proceso')::int   AS en_proceso,
              COUNT(*) FILTER (WHERE ${VENCIDO})::int                 AS vencidos
       FROM seguimientos sg`),

    // 2) Lista de vencidos, del más antiguo al más reciente (los más urgentes arriba)
    pool.query(
      `SELECT sg.id, pe.folio, c.nombre AS cliente, sg.canal, sg.motivo, ua.nombre AS responsable,
              FLOOR(EXTRACT(EPOCH FROM (now() - sg.creado_en)) / 60)::int AS minutos_sin_respuesta
       FROM seguimientos sg
       LEFT JOIN pedidos pe ON pe.id = sg.pedido_id
       LEFT JOIN clientes c ON c.id = sg.cliente_id
       LEFT JOIN usuarios ua ON ua.id = sg.asignado_a
       WHERE ${VENCIDO}
       ORDER BY sg.creado_en`),

    // 3) Productos bajo mínimo agrupados por sucursal.
    //    Salen las 5 sucursales aunque no tengan nada bajo mínimo (total 0, lista vacía).
    pool.query(
      `SELECT s.id AS sucursal_id, s.nombre AS sucursal,
              COUNT(p.id)::int AS total,
              COALESCE(
                json_agg(json_build_object(
                  'producto_id', p.id, 'sku', p.sku, 'nombre', p.nombre,
                  'cantidad', e.cantidad, 'minimo', e.minimo) ORDER BY p.nombre)
                FILTER (WHERE p.id IS NOT NULL),
                '[]') AS productos
       FROM sucursales s
       LEFT JOIN existencias e ON e.sucursal_id = s.id AND e.cantidad < e.minimo
       LEFT JOIN productos p ON p.id = e.producto_id AND p.activo
       GROUP BY s.id, s.nombre
       ORDER BY s.nombre`),
  ]);

  res.json({
    seguimientos: { ...conteos.rows[0], lista_vencidos: vencidos.rows },
    bajo_minimo: bajoMinimo.rows,
  });
});
