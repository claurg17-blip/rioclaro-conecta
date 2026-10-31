// Ruta para consultar clientes (la usan los formularios de pedidos y seguimientos).
// Se monta en app.js bajo /api/clientes, DESPUÉS de requireAuth.
//   GET /api/clientes?q=texto → Ventas, Gerente, Admin
//     q (opcional) busca por nombre, teléfono o correo. Máximo 100 resultados.
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const clientesRouter = Router();

// Bodega no la necesita: en pedidos ya ve el nombre del cliente,
// y así no recibe teléfonos ni correos que no usa
clientesRouter.get("/", requireRole("Ventas", "Gerente", "Admin"), async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  // En LIKE, % y _ son comodines; los "escapamos" para buscarlos como texto normal
  const patron = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

  const { rows } = await pool.query(
    `SELECT id, nombre, telefono, email, tipo
     FROM clientes
     WHERE $1 = '' OR nombre ILIKE $2 OR telefono ILIKE $2 OR email ILIKE $2
     ORDER BY nombre
     LIMIT 100`,
    [q, patron]);
  res.json(rows);
});
