// Conexión a la base de datos PostgreSQL (Azure Database for PostgreSQL).
// Usamos un "pool": un grupo de conexiones que se reutilizan entre peticiones,
// así no abrimos y cerramos una conexión nueva cada vez.
import pg from "pg";

// pg lee automáticamente las variables de entorno PGHOST, PGUSER, PGPASSWORD,
// PGDATABASE (y PGPORT si existe), que vienen del archivo .env.
// ssl: true es obligatorio para conectarse a Azure Database for PostgreSQL.
export const pool = new pg.Pool({ ssl: true });

// Si una conexión inactiva del pool falla (por ejemplo, el servidor la cierra),
// lo registramos en lugar de dejar que el proceso se caiga.
// Solo mostramos el mensaje, nunca datos de conexión ni contraseñas.
pool.on("error", (err) => {
  console.error("Error inesperado en la conexión a PostgreSQL:", err.message);
});
