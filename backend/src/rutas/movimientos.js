// Rutas de movimientos de inventario (entrada, salida o ajuste).
// Se montan en app.js bajo /api/movimientos, DESPUÉS de requireAuth.
//   POST /api/movimientos → Bodega, Gerente, Admin
//     body: { producto_id, sucursal_id, tipo, cantidad, nota? }
//     - entrada: cantidad positiva, SUMA a la existencia
//     - salida:  cantidad positiva, RESTA a la existencia (no puede quedar negativa)
//     - ajuste:  cantidad con signo (+ o -) para corregir un conteo; la nota es obligatoria
// El movimiento y la existencia se guardan en una TRANSACCIÓN: o se guardan los dos, o ninguno.
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const movimientosRouter = Router();

const TIPOS = ["entrada", "salida", "ajuste"];
const esIdValido = (v) => Number.isInteger(v) && v > 0;

movimientosRouter.post("/", requireRole("Bodega", "Gerente", "Admin"), async (req, res) => {
  const { producto_id, sucursal_id, tipo, cantidad } = req.body ?? {};
  const nota = String(req.body?.nota ?? "").trim() || null;

  // --- Validaciones antes de tocar la base ---
  if (!esIdValido(producto_id) || !esIdValido(sucursal_id))
    return res.status(400).json({ error: "Producto y sucursal son obligatorios" });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo no válido (entrada, salida o ajuste)" });
  if (!Number.isInteger(cantidad) || cantidad === 0)
    return res.status(400).json({ error: "La cantidad debe ser un número entero distinto de 0" });
  if (tipo !== "ajuste" && cantidad < 0)
    return res.status(400).json({ error: "En entradas y salidas la cantidad debe ser positiva" });
  if (tipo === "ajuste" && !nota)
    return res.status(400).json({ error: "Explica el motivo del ajuste en la nota" });

  // Cuánto cambia la existencia: la salida resta, entrada y ajuste suman (el ajuste ya trae su signo)
  const cambio = tipo === "salida" ? -cantidad : cantidad;

  // Para una transacción usamos UNA conexión del pool (todas las consultas van por la misma)
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    // Leemos la existencia actual y la "bloqueamos" (FOR UPDATE) hasta el COMMIT,
    // para que dos salidas al mismo tiempo no se salten la validación
    const { rows: [actual] } = await cliente.query(
      "SELECT cantidad FROM existencias WHERE producto_id = $1 AND sucursal_id = $2 FOR UPDATE",
      [producto_id, sucursal_id]);
    const disponible = actual?.cantidad ?? 0; // si no hay registro, la existencia es 0

    // Regla: la existencia nunca puede quedar negativa
    if (disponible + cambio < 0) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({ error: `No hay suficiente existencia. Disponible: ${disponible}`, disponible });
    }

    // 1) Registramos el movimiento con el usuario que lo hizo (queda el rastro)
    const { rows: [movimiento] } = await cliente.query(
      `INSERT INTO movimientos (producto_id, sucursal_id, tipo, cantidad, usuario_id, nota)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, producto_id, sucursal_id, tipo, cantidad, usuario_id, nota, creado_en`,
      [producto_id, sucursal_id, tipo, cantidad, req.user.id, nota]);

    // 2) Actualizamos la existencia; si el producto aún no tenía registro en esa sucursal, se crea
    const { rows: [existencia] } = await cliente.query(
      `INSERT INTO existencias (producto_id, sucursal_id, cantidad)
       VALUES ($1, $2, $3)
       ON CONFLICT (producto_id, sucursal_id)
       DO UPDATE SET cantidad = existencias.cantidad + EXCLUDED.cantidad, actualizado_en = now()
       RETURNING cantidad, minimo, (cantidad < minimo) AS bajo_minimo, actualizado_en`,
      [producto_id, sucursal_id, cambio]);

    await cliente.query("COMMIT");
    res.status(201).json({ movimiento, existencia });
  } catch (err) {
    await cliente.query("ROLLBACK"); // si algo falló, deshacemos todo
    // 23503 = se hace referencia a algo que no existe.
    // err.constraint dice cuál referencia falló, ej. "movimientos_sucursal_id_fkey"
    if (err.code === "23503") {
      if (err.constraint?.includes("producto_id")) return res.status(400).json({ error: "El producto no existe" });
      if (err.constraint?.includes("sucursal_id")) return res.status(400).json({ error: "La sucursal no existe" });
    }
    throw err;
  } finally {
    cliente.release(); // devolvemos la conexión al pool (¡siempre!)
  }
});
