// Autenticación propia: firma el token JWT al iniciar sesión,
// lo valida en cada petición y revisa el rol del usuario.
import { SignJWT, jwtVerify } from "jose";
import { pool } from "./db.js";

// Sin JWT_SECRET cualquiera podría falsificar tokens, así que no arrancamos
if (!process.env.JWT_SECRET) {
  throw new Error("Falta la variable de entorno JWT_SECRET");
}

// jose necesita el secreto como bytes, no como texto
const SECRETO = new TextEncoder().encode(process.env.JWT_SECRET);

// Crea el token del usuario: guarda nombre, rol y sucursal; el id va en "sub".
// Firmado con HS256 y válido por 8 horas (un turno de trabajo).
export async function firmarToken(u) {
  return new SignJWT({ nombre: u.nombre, rol: u.rol, sucursal_id: u.sucursal_id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRETO);
}

// Middleware: deja pasar solo peticiones con un token válido de un usuario activo.
// El token llega en el encabezado "Authorization: Bearer <token>".
export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    // Verifica la firma y que no haya expirado (si falla, salta al catch)
    const { payload } = await jwtVerify(token, SECRETO);
    // Si Carlos desactivó al usuario, se corta el acceso aunque el token no haya expirado
    const { rows: [u] } = await pool.query(
      "SELECT activo, password_cambiado_en FROM usuarios WHERE id = $1", [payload.sub]);
    if (!u?.activo) throw new Error("inactivo");
    // Si Admin reinició la contraseña, los tokens emitidos ANTES de ese momento ya no sirven.
    // iat (fecha de emisión del token) viene en segundos; getTime() en milisegundos.
    if (u.password_cambiado_en && payload.iat * 1000 <= u.password_cambiado_en.getTime())
      throw new Error("sesión anterior al reinicio de contraseña");
    // Deja los datos del usuario disponibles para las rutas siguientes
    req.user = { id: Number(payload.sub), nombre: payload.nombre, rol: payload.rol, sucursal_id: payload.sucursal_id };
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

// Middleware: deja pasar solo a los roles indicados, ej. requireRole("Admin", "Gerente").
// Se usa siempre después de requireAuth.
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.rol) ? next() : res.status(403).json({ error: "Sin permiso" });
