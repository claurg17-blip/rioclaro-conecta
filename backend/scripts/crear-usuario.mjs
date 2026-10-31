// Script para crear un usuario nuevo en la tabla `usuarios`.
// Genera una contraseña temporal aleatoria, guarda solo su hash (bcrypt)
// y la muestra UNA vez en la terminal para entregarla a la persona.
// El usuario debe cambiarla en su primer acceso (debe_cambiar_password = TRUE por defecto).
//
// Uso (desde la carpeta backend):
//   node scripts/crear-usuario.mjs <usuario> "<Nombre>" <Admin|Gerente|Ventas|Bodega> [Sucursal]
import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../src/db.js";

// Lee los datos que se escribieron después del nombre del script
const [usuario, nombre, rol, sucursal] = process.argv.slice(2);
if (!usuario || !nombre || !rol) {
  console.log('Uso: node scripts/crear-usuario.mjs <usuario> "<Nombre>" <Admin|Gerente|Ventas|Bodega> [Sucursal]');
  process.exit(1);
}
const temporal = crypto.randomBytes(6).toString("base64url"); // contraseña temporal aleatoria
// Inserta el usuario; la sucursal se busca por nombre y en la base solo se guarda el hash
await pool.query(
  `INSERT INTO usuarios (usuario, nombre, rol, sucursal_id, password_hash)
   VALUES ($1, $2, $3, (SELECT id FROM sucursales WHERE nombre = $4), $5)`,
  [usuario.toLowerCase(), nombre, rol, sucursal ?? null, await bcrypt.hash(temporal, 10)]
);
// Se muestra una sola vez para entregarla; no se guarda en ningún archivo
console.log(`Usuario ${usuario} creado. Contraseña temporal: ${temporal}`);
// Cierra las conexiones para que el script termine
await pool.end();
