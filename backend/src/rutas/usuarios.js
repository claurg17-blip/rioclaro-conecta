// Rutas para administrar usuarios (solo Admin).
// Se montan en app.js bajo /api/usuarios, DESPUÉS de requireAuth (así ya existe req.user).
//   GET   /api/usuarios                         → lista de usuarios (sin password_hash)
//   POST  /api/usuarios                         → alta con contraseña temporal
//   PATCH /api/usuarios/:id                     → cambia nombre, rol, sucursal o activo
//   POST  /api/usuarios/:id/reiniciar-password  → genera otra contraseña temporal
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const usuariosRouter = Router();

// Todas las rutas de este archivo son solo para Admin
usuariosRouter.use(requireRole("Admin"));

const ROLES = ["Admin", "Gerente", "Ventas", "Bodega"];

// Columnas que se pueden mostrar. password_hash NUNCA se incluye.
const COLUMNAS = `u.id, u.usuario, u.nombre, u.email, u.rol, u.sucursal_id, s.nombre AS sucursal,
  u.activo, u.debe_cambiar_password, u.ultimo_acceso, u.creado_en`;

// Contraseña temporal aleatoria (8 caracteres), igual que en scripts/crear-usuario.mjs
const generarTemporal = () => crypto.randomBytes(6).toString("base64url");

// Busca un usuario por id con el nombre de su sucursal (o undefined si no existe)
async function buscarUsuario(id) {
  const { rows: [u] } = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id WHERE u.id = $1`, [id]);
  return u;
}

// Convierte el :id de la URL en número; devuelve null si no es un entero válido
function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Revisa sucursal_id: puede ser un entero o null (sin sucursal)
const sucursalValida = (v) => v === null || (Number.isInteger(v) && v > 0);

// Traduce errores conocidos de PostgreSQL a mensajes claros; los demás se relanzan
function errorDeBase(err, res) {
  if (err.code === "23505") return res.status(409).json({ error: "Ese nombre de usuario ya existe" });
  if (err.code === "23503") return res.status(400).json({ error: "La sucursal no existe" });
  throw err;
}

// GET /api/usuarios — lista completa, ordenada por nombre
usuariosRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios u LEFT JOIN sucursales s ON s.id = u.sucursal_id ORDER BY u.nombre`);
  res.json(rows);
});

// POST /api/usuarios — body: { usuario, nombre, rol, sucursal_id?, email? }
usuariosRouter.post("/", async (req, res) => {
  const { usuario, nombre, rol, sucursal_id = null, email = null } = req.body ?? {};
  const login = String(usuario ?? "").trim().toLowerCase();
  if (!login || !String(nombre ?? "").trim()) return res.status(400).json({ error: "Usuario y nombre son obligatorios" });
  if (!ROLES.includes(rol)) return res.status(400).json({ error: "Rol no válido" });
  if (!sucursalValida(sucursal_id)) return res.status(400).json({ error: "Sucursal no válida" });

  const temporal = generarTemporal();
  try {
    // En la base solo se guarda el hash; debe_cambiar_password queda en TRUE por defecto
    const { rows: [nuevo] } = await pool.query(
      `INSERT INTO usuarios (usuario, nombre, email, rol, sucursal_id, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [login, String(nombre).trim(), email, rol, sucursal_id, await bcrypt.hash(temporal, 10)]);
    // La contraseña temporal se regresa UNA sola vez; que el navegador no la guarde en caché
    res.set("Cache-Control", "no-store");
    res.status(201).json({ usuario: await buscarUsuario(nuevo.id), passwordTemporal: temporal });
  } catch (err) {
    errorDeBase(err, res);
  }
});

// PATCH /api/usuarios/:id — body con uno o más de: { nombre, rol, sucursal_id, activo }
usuariosRouter.patch("/:id", async (req, res) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: "Id no válido" });
  const datos = req.body ?? {};

  // Validamos solo los campos que vienen en la petición
  if (datos.nombre !== undefined && !String(datos.nombre).trim()) return res.status(400).json({ error: "El nombre no puede quedar vacío" });
  if (datos.rol !== undefined && !ROLES.includes(datos.rol)) return res.status(400).json({ error: "Rol no válido" });
  if (datos.sucursal_id !== undefined && !sucursalValida(datos.sucursal_id)) return res.status(400).json({ error: "Sucursal no válida" });
  if (datos.activo !== undefined && typeof datos.activo !== "boolean") return res.status(400).json({ error: "activo debe ser true o false" });

  // Reglas: un Admin no puede desactivarse ni cambiarse el rol a sí mismo
  if (id === req.user.id && datos.activo === false)
    return res.status(400).json({ error: "No puedes desactivar tu propio usuario" });
  if (id === req.user.id && datos.rol !== undefined && datos.rol !== "Admin")
    return res.status(400).json({ error: "No puedes cambiar tu propio rol" });

  // Armamos el UPDATE solo con los campos recibidos.
  // Los nombres de columna salen de esta lista fija (nunca del usuario); los valores van como $1, $2...
  const campos = [];
  const valores = [];
  for (const columna of ["nombre", "rol", "sucursal_id", "activo"]) {
    if (datos[columna] !== undefined) {
      valores.push(columna === "nombre" ? String(datos.nombre).trim() : datos[columna]);
      campos.push(`${columna} = $${valores.length}`);
    }
  }
  if (campos.length === 0) return res.status(400).json({ error: "No hay cambios que guardar" });

  valores.push(id);

  // ¿Este cambio le podría quitar el acceso de Admin a alguien? (bajarle el rol o desactivarlo)
  const puedeQuitarAdmin = (datos.rol !== undefined && datos.rol !== "Admin") || datos.activo === false;

  // Usamos una transacción para que la revisión del "último Admin" y el UPDATE vayan juntos
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    if (puedeQuitarAdmin) {
      // Regla: siempre debe quedar al menos un Admin activo.
      // FOR UPDATE bloquea a los Admin activos hasta el COMMIT: si dos Admin intentan
      // quitarse el rol el uno al otro al mismo tiempo, el segundo espera y ve el cambio del primero.
      const { rows: admins } = await cliente.query(
        "SELECT id FROM usuarios WHERE rol = 'Admin' AND activo FOR UPDATE");
      const esAdminActivo = admins.some((a) => a.id === id);
      if (esAdminActivo && admins.length === 1) {
        await cliente.query("ROLLBACK");
        return res.status(400).json({ error: "Es el único Admin activo: primero da el rol Admin a otra persona" });
      }
    }

    const { rowCount } = await cliente.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = $${valores.length}`, valores);
    if (rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK"); // si algo falló, deshacemos todo
    return errorDeBase(err, res);
  } finally {
    cliente.release(); // devolvemos la conexión al pool (¡siempre!)
  }

  res.json(await buscarUsuario(id));
});

// POST /api/usuarios/:id/reiniciar-password — nueva temporal y obliga a cambiarla.
// password_cambiado_en = now() cierra las sesiones abiertas de ese usuario (ver requireAuth en auth.js).
usuariosRouter.post("/:id/reiniciar-password", async (req, res) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: "Id no válido" });

  const temporal = generarTemporal();
  const { rowCount } = await pool.query(
    `UPDATE usuarios SET password_hash = $1, debe_cambiar_password = true, password_cambiado_en = now()
     WHERE id = $2`,
    [await bcrypt.hash(temporal, 10), id]);
  if (rowCount === 0) return res.status(404).json({ error: "Usuario no encontrado" });

  // Igual que en el alta: se regresa una sola vez y sin caché
  res.set("Cache-Control", "no-store");
  res.json({ usuario: await buscarUsuario(id), passwordTemporal: temporal });
});
