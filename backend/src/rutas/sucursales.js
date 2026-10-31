// Ruta para consultar las sucursales (la usan los filtros y formularios del frontend:
// existencias, movimientos, pedidos y usuarios).
// Se monta en app.js bajo /api/sucursales, DESPUÉS de requireAuth.
//   GET /api/sucursales → todos los roles
import { Router } from "express";
import { pool } from "../db.js";

export const sucursalesRouter = Router();

sucursalesRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT id, nombre FROM sucursales ORDER BY nombre");
  res.json(rows);
});
