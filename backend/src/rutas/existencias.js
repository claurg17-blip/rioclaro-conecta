// Rutas de existencias (inventario por sucursal).
// Se montan en app.js bajo /api/existencias, DESPUÉS de requireAuth.
//   GET /api/existencias?sucursal=&q=&bajo_minimo=  → todos los roles
//     sucursal     (opcional) id de la sucursal; sin él, se ven las 5 sucursales
//     q            (opcional) busca por nombre, SKU o alias del producto
//     bajo_minimo  (opcional) "true" para ver solo lo que está por debajo del mínimo
import { Router } from "express";
import { pool } from "../db.js";

export const existenciasRouter = Router();

existenciasRouter.get("/", async (req, res) => {
  // Sucursal: si viene, debe ser un entero válido
  let sucursal = null;
  if (req.query.sucursal !== undefined && req.query.sucursal !== "") {
    sucursal = Number(req.query.sucursal);
    if (!Number.isInteger(sucursal) || sucursal <= 0) return res.status(400).json({ error: "Sucursal no válida" });
  }

  const q = String(req.query.q ?? "").trim();
  // En LIKE, % y _ son comodines; los "escapamos" para buscarlos como texto normal
  const patron = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const soloBajoMinimo = req.query.bajo_minimo === "true";

  // bajo_minimo es la "bandera" que el frontend usa para pintar en rojo
  const { rows } = await pool.query(
    `SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad,
            s.id AS sucursal_id, s.nombre AS sucursal,
            e.cantidad, e.minimo, (e.cantidad < e.minimo) AS bajo_minimo, e.actualizado_en
     FROM existencias e
     JOIN productos p ON p.id = e.producto_id
     JOIN sucursales s ON s.id = e.sucursal_id
     WHERE p.activo
       AND ($1::int IS NULL OR e.sucursal_id = $1)
       AND ($2 = '' OR p.nombre ILIKE $3 OR p.sku ILIKE $3
            OR EXISTS (SELECT 1 FROM producto_alias a WHERE a.producto_id = p.id AND a.alias ILIKE $3))
       AND (NOT $4 OR e.cantidad < e.minimo)
     ORDER BY p.nombre, s.nombre
     LIMIT 200`,
    [sucursal, q, patron, soloBajoMinimo]);
  res.json(rows);
});
