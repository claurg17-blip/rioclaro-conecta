// Rutas del catálogo de productos.
// Se montan en app.js bajo /api/productos, DESPUÉS de requireAuth (así ya existe req.user).
//   GET  /api/productos?q=texto  → todos los roles: busca por nombre, SKU o alias
//   POST /api/productos          → solo Admin: alta de producto
//   PUT  /api/productos/:id      → solo Admin: edición de producto
import { Router } from "express";
import { pool } from "../db.js";
import { requireRole } from "../auth.js";

export const productosRouter = Router();

// Convierte el :id de la URL en número; devuelve null si no es un entero válido
function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Revisa los datos de un producto; devuelve un mensaje de error o null si todo está bien
function validarProducto({ sku, nombre, unidad, precio_venta, activo }) {
  if (!String(sku ?? "").trim() || !String(nombre ?? "").trim() || !String(unidad ?? "").trim())
    return "SKU, nombre y unidad son obligatorios";
  if (precio_venta != null && !(typeof precio_venta === "number" && precio_venta >= 0))
    return "El precio debe ser un número mayor o igual a 0";
  if (activo !== undefined && typeof activo !== "boolean") return "activo debe ser true o false";
  return null;
}

// GET /api/productos?q=texto
// Busca en el nombre oficial, el SKU y los alias (los nombres que usa cada sucursal).
// Sin q, devuelve el catálogo completo. Máximo 50 resultados.
// Solo Admin ve también los productos inactivos.
productosRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  // En LIKE, % y _ son comodines; los "escapamos" para buscarlos como texto normal
  const patron = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const soloActivos = req.user.rol !== "Admin";

  const { rows } = await pool.query(
    `SELECT p.id, p.sku, p.nombre, p.unidad, p.precio_venta::float AS precio_venta, p.activo,
            -- lista de alias del producto (vacía si no tiene)
            COALESCE((SELECT array_agg(a.alias ORDER BY a.alias)
                      FROM producto_alias a WHERE a.producto_id = p.id), '{}') AS alias
     FROM productos p
     WHERE ($1 = '' OR p.nombre ILIKE $2 OR p.sku ILIKE $2
            OR EXISTS (SELECT 1 FROM producto_alias a WHERE a.producto_id = p.id AND a.alias ILIKE $2))
       AND (NOT $3 OR p.activo)
     ORDER BY p.nombre
     LIMIT 50`,
    [q, patron, soloActivos]);
  res.json(rows);
});

// POST /api/productos — body: { sku, nombre, unidad, precio_venta?, activo? }
productosRouter.post("/", requireRole("Admin"), async (req, res) => {
  const datos = req.body ?? {};
  const error = validarProducto(datos);
  if (error) return res.status(400).json({ error });

  try {
    const { rows: [p] } = await pool.query(
      `INSERT INTO productos (sku, nombre, unidad, precio_venta, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sku, nombre, unidad, precio_venta::float AS precio_venta, activo`,
      [String(datos.sku).trim().toUpperCase(), String(datos.nombre).trim(), String(datos.unidad).trim(),
       datos.precio_venta ?? null, datos.activo ?? true]);
    res.status(201).json(p);
  } catch (err) {
    // 23505 = valor repetido en una columna UNIQUE (el SKU)
    if (err.code === "23505") return res.status(409).json({ error: "Ya existe un producto con ese SKU" });
    throw err;
  }
});

// PUT /api/productos/:id — body: { sku, nombre, unidad, precio_venta?, activo? }
// Reemplaza los datos del producto; si no se manda activo, se conserva el actual.
productosRouter.put("/:id", requireRole("Admin"), async (req, res) => {
  const id = leerId(req);
  if (!id) return res.status(400).json({ error: "Id no válido" });
  const datos = req.body ?? {};
  const error = validarProducto(datos);
  if (error) return res.status(400).json({ error });

  try {
    const { rows: [p] } = await pool.query(
      `UPDATE productos
       SET sku = $1, nombre = $2, unidad = $3, precio_venta = $4, activo = COALESCE($5, activo)
       WHERE id = $6
       RETURNING id, sku, nombre, unidad, precio_venta::float AS precio_venta, activo`,
      [String(datos.sku).trim().toUpperCase(), String(datos.nombre).trim(), String(datos.unidad).trim(),
       datos.precio_venta ?? null, datos.activo ?? null, id]);
    if (!p) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(p);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ya existe un producto con ese SKU" });
    throw err;
  }
});
