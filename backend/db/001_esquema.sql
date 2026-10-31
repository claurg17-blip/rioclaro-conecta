-- Active: 1792869158314@@server888330595.postgres.database.azure.com@5432@rioclaro
-- Active: 1792869158314@@server888330595.postgres.database.azure.com@5432@azure_maintenance@public
CREATE TABLE sucursales (id SERIAL PRIMARY KEY, nombre TEXT UNIQUE NOT NULL);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  usuario TEXT UNIQUE NOT NULL,             -- nombre de inicio de sesión en minúsculas, ej. "mariana"
  nombre TEXT NOT NULL, email TEXT,
  password_hash TEXT NOT NULL,              -- hash bcrypt; NUNCA la contraseña en texto plano
  rol TEXT NOT NULL CHECK (rol IN ('Admin','Gerente','Ventas','Bodega')),
  sucursal_id INT REFERENCES sucursales(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE,     -- Carlos puede desactivar un acceso
  debe_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ, creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY, sku TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
  unidad TEXT NOT NULL, precio_venta NUMERIC(10,2), activo BOOLEAN DEFAULT TRUE
);
CREATE TABLE producto_alias (
  id SERIAL PRIMARY KEY, producto_id INT NOT NULL REFERENCES productos(id),
  alias TEXT NOT NULL, sucursal_id INT REFERENCES sucursales(id)
);
CREATE TABLE existencias (
  producto_id INT REFERENCES productos(id), sucursal_id INT REFERENCES sucursales(id),
  cantidad INT NOT NULL DEFAULT 0, minimo INT NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (producto_id, sucursal_id)
);
CREATE TABLE movimientos (
  id SERIAL PRIMARY KEY, producto_id INT NOT NULL REFERENCES productos(id),
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  tipo TEXT CHECK (tipo IN ('entrada','salida','ajuste')), cantidad INT NOT NULL,
  usuario_id INT REFERENCES usuarios(id), nota TEXT, creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT, email TEXT, tipo TEXT);
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY, folio TEXT UNIQUE NOT NULL, cliente_id INT REFERENCES clientes(id),
  sucursal_id INT REFERENCES sucursales(id),
  estado TEXT CHECK (estado IN ('Recibido','Surtido','Enviado','Entregado','Cancelado')) DEFAULT 'Recibido',
  fecha_compromiso DATE, creado_en TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE pedido_detalle (
  pedido_id INT REFERENCES pedidos(id), producto_id INT REFERENCES productos(id),
  cantidad INT NOT NULL, precio NUMERIC(10,2), PRIMARY KEY (pedido_id, producto_id)
);
CREATE TABLE pedido_eventos (
  id SERIAL PRIMARY KEY, pedido_id INT REFERENCES pedidos(id), estado TEXT, nota TEXT,
  usuario_id INT REFERENCES usuarios(id), creado_en TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE seguimientos (
  id SERIAL PRIMARY KEY, pedido_id INT REFERENCES pedidos(id), cliente_id INT REFERENCES clientes(id),
  canal TEXT, motivo TEXT, descripcion TEXT,
  estado TEXT CHECK (estado IN ('Abierto','En proceso','Cerrado')) DEFAULT 'Abierto',
  asignado_a INT REFERENCES usuarios(id), creado_por INT REFERENCES usuarios(id),
  origen TEXT CHECK (origen IN ('manual','ia')) DEFAULT 'manual',
  creado_en TIMESTAMPTZ DEFAULT now(), primera_respuesta_en TIMESTAMPTZ, cerrado_en TIMESTAMPTZ
);
CREATE TABLE bitacora_ia (
  id SERIAL PRIMARY KEY, usuario_id INT REFERENCES usuarios(id), pregunta TEXT,
  herramientas TEXT[], respuesta TEXT, creado_en TIMESTAMPTZ DEFAULT now()
);
