// Punto de entrada del backend: crea el servidor Express y define las rutas.

// Carga las variables del archivo .env en process.env.
// Va primero para que el resto del código ya encuentre las variables.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { requireAuth, requireRole } from "./auth.js";
import { authRouter } from "./rutas/auth.js";
import { usuariosRouter } from "./rutas/usuarios.js";
import { productosRouter } from "./rutas/productos.js";
import { existenciasRouter } from "./rutas/existencias.js";
import { movimientosRouter } from "./rutas/movimientos.js";
import { pedidosRouter } from "./rutas/pedidos.js";
import { seguimientosRouter } from "./rutas/seguimientos.js";
import { tableroRouter } from "./rutas/tablero.js";
import { clientesRouter } from "./rutas/clientes.js";
import { sucursalesRouter } from "./rutas/sucursales.js";
import { conversar } from "./agente/servicio.js";

const app = express();

// App Service está detrás de un proxy; así el límite de intentos del login ve la IP real
app.set("trust proxy", 1);

// Solo el frontend (FRONTEND_URL) puede llamar a esta API desde el navegador
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Permite leer el cuerpo de las peticiones en formato JSON
app.use(express.json());

// --- Rutas públicas (sin login) ---

// Ruta de salud: sirve para comprobar que el servidor está encendido
app.get("/api/salud", (_req, res) => res.json({ ok: true }));

// Login es público; cambiar-password valida el token por dentro
app.use("/api/auth", authRouter);

// --- A partir de aquí, todo /api requiere login ---
app.use("/api", requireAuth);

// GET /api/me — datos del usuario con sesión iniciada
app.get("/api/me", async (req, res) => {
  // Se lee de la base para tener los datos al día y el nombre de la sucursal
  const { rows: [u] } = await pool.query(
    `SELECT u.id, u.nombre, u.rol, s.nombre AS sucursal
     FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id
     WHERE u.id = $1`, [req.user.id]);
  res.json(u);
});

// Administración de usuarios (el router revisa que el rol sea Admin)
app.use("/api/usuarios", usuariosRouter);

// Catálogo (buscar: todos; alta y edición: Admin) y existencias por sucursal (todos)
app.use("/api/productos", productosRouter);
app.use("/api/existencias", existenciasRouter);

// Movimientos de inventario (Bodega, Gerente, Admin; el router revisa el rol)
app.use("/api/movimientos", movimientosRouter);

// Pedidos y su línea de tiempo (cada ruta revisa su rol)
app.use("/api/pedidos", pedidosRouter);

// Seguimientos (Ventas, Gerente, Admin) y tablero de Inicio (Gerente, Admin)
app.use("/api/seguimientos", seguimientosRouter);
app.use("/api/tablero", tableroRouter);

// Listas para filtros y formularios: clientes (Ventas, Gerente, Admin) y sucursales (todos)
app.use("/api/clientes", clientesRouter);
app.use("/api/sucursales", sucursalesRouter);

// POST /api/agente/chat — asistente de IA (todos los roles)
// body: { mensaje, conversacionId? } → { texto, fuentes, conversacionId }
// Solo tomamos esos dos campos del body; el usuario sale del token (req.user: id, rol, sucursal_id)
const MAX_MENSAJE = 1000; // tope de caracteres por pregunta (evita textos enormes que cuestan tokens)
app.post("/api/agente/chat", requireRole("Admin", "Gerente", "Ventas", "Bodega"), async (req, res) => {
  const mensaje = String(req.body?.mensaje ?? "").trim();
  const conversacionId = req.body?.conversacionId || null;

  if (!mensaje) return res.status(400).json({ error: "Escribe una pregunta" });
  if (mensaje.length > MAX_MENSAJE)
    return res.status(400).json({ error: `La pregunta es muy larga (máximo ${MAX_MENSAJE} caracteres)` });
  if (conversacionId !== null && typeof conversacionId !== "string")
    return res.status(400).json({ error: "Conversación no válida" });

  res.json(await conversar({ mensaje, conversacionId, usuario: req.user }));
});

// Enciende el servidor en el puerto del .env (o 3000 si no está definido)
const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
