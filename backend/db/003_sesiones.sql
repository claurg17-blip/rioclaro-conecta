-- =====================================================================
-- db/003_sesiones.sql — Invalidar sesiones al reiniciar la contraseña
--
-- Agrega a "usuarios" la fecha en que Admin reinició la contraseña.
-- requireAuth (src/auth.js) rechaza cualquier token emitido ANTES de esa fecha,
-- así que las sesiones abiertas se cierran aunque su token aún no expire (8 h).
--
-- Cómo usarlo: ejecútalo UNA vez sobre la base que ya tiene 001 y 002
-- (con psql, pgAdmin o la extensión PostgreSQL de VS Code).
-- Se puede ejecutar de nuevo sin problema (IF NOT EXISTS).
-- =====================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS password_cambiado_en TIMESTAMPTZ;  -- NULL = nunca se ha reiniciado
