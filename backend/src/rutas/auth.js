// Rutas de autenticación: iniciar sesión y cambiar la contraseña.
// Se montan en app.js bajo /api/auth (quedan como /api/auth/login y /api/auth/cambiar-password).
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { pool } from "../db.js";
import { firmarToken, requireAuth } from "../auth.js";

export const authRouter = Router();
const limitador = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }); // 10 intentos / 15 min

// POST /api/auth/login — público (con límite de intentos por IP)
authRouter.post("/login", limitador, async (req, res) => {
  const { usuario, password } = req.body ?? {};
  // Busca al usuario activo (los nombres de usuario se guardan en minúsculas)
  const { rows: [u] } = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1 AND activo", [String(usuario ?? "").toLowerCase()]);
  // Compara la contraseña escrita con el hash guardado; nunca se compara texto plano
  const ok = u && (await bcrypt.compare(password ?? "", u.password_hash));
  if (!ok) return res.status(401).json({ error: "Usuario o contraseña incorrectos" }); // mensaje genérico
  await pool.query("UPDATE usuarios SET ultimo_acceso = now() WHERE id = $1", [u.id]);
  // Devuelve el token y solo los datos que necesita el frontend (nunca el hash)
  res.json({
    token: await firmarToken(u),
    usuario: { nombre: u.nombre, rol: u.rol, debeCambiarPassword: u.debe_cambiar_password },
  });
});

// POST /api/auth/cambiar-password — requiere sesión iniciada
authRouter.post("/cambiar-password", requireAuth, async (req, res) => {
  const { actual, nueva } = req.body ?? {};
  if (!nueva || nueva.length < 8) return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
  // Confirma que la persona conoce su contraseña actual antes de cambiarla
  const { rows: [u] } = await pool.query("SELECT password_hash FROM usuarios WHERE id = $1", [req.user.id]);
  if (!(await bcrypt.compare(actual ?? "", u.password_hash)))
    return res.status(400).json({ error: "La contraseña actual no coincide" });
  // Guarda el hash de la nueva contraseña y quita la marca de "debe cambiarla"
  await pool.query("UPDATE usuarios SET password_hash = $1, debe_cambiar_password = false WHERE id = $2",
    [await bcrypt.hash(nueva, 10), req.user.id]);
  res.json({ ok: true });
});
