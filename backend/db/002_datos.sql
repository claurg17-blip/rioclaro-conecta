-- =====================================================================
-- db/002_datos.sql — Datos de prueba de Río Claro Conecta
-- Distribuidora de productos de limpieza con 5 sucursales.
--
-- Cómo usarlo:
--   1. Ejecuta primero 001_esquema.sql en una base VACÍA.
--   2. Ejecuta este archivo UNA sola vez (si lo corres dos veces, falla
--      por los folios y nombres repetidos, y no se guarda nada).
--
-- Notas:
--   * NO inserta usuarios: se crean con un script que cifra las contraseñas.
--     Por eso usuario_id, asignado_a y creado_por quedan en NULL.
--   * Las fechas son RELATIVAS a now() / CURRENT_DATE. Así, el día que
--     cargues los datos, el semáforo de seguimientos y los pedidos
--     retrasados se ven "vivos" en el tablero.
--   * Para no depender de los id numéricos, se buscan los registros por
--     SKU, nombre de sucursal, nombre de cliente o folio.
-- =====================================================================

SET client_encoding = 'UTF8';   -- para que acentos y ñ se guarden bien desde Windows

BEGIN;   -- todo o nada: si algo falla, no queda la base a medias

-- ---------------------------------------------------------------------
-- 1. Sucursales
-- ---------------------------------------------------------------------
INSERT INTO sucursales (nombre) VALUES
  ('Guadalajara'), ('Zapopan'), ('León'), ('Querétaro'), ('Aguascalientes');

-- ---------------------------------------------------------------------
-- 2. Productos (30) — catálogo oficial con SKU y precio en pesos (MXN)
-- ---------------------------------------------------------------------
INSERT INTO productos (sku, nombre, unidad, precio_venta) VALUES
  ('CL-001', 'Cloro 1 L',                                   'botella 1 L',     18.50),
  ('CL-002', 'Cloro galón 3.785 L',                         'galón',           52.00),
  ('CL-003', 'Cloro garrafa 20 L',                          'garrafa 20 L',   230.00),
  ('DG-001', 'Desengrasante industrial 1 L',                'botella 1 L',     45.00),
  ('DG-002', 'Desengrasante industrial 20 L',               'garrafa 20 L',   690.00),
  ('DT-001', 'Detergente en polvo 1 kg',                    'bolsa 1 kg',      38.00),
  ('DT-002', 'Detergente en polvo 10 kg',                   'saco 10 kg',     345.00),
  ('DT-003', 'Detergente líquido para ropa 5 L',            'garrafa 5 L',    165.00),
  ('LT-001', 'Lavatrastes líquido 1 L',                     'botella 1 L',     35.00),
  ('LT-002', 'Lavatrastes líquido 20 L',                    'garrafa 20 L',   560.00),
  ('LP-001', 'Limpiador multiusos lavanda 1 L',             'botella 1 L',     28.00),
  ('LP-002', 'Limpiador multiusos lavanda 20 L',            'garrafa 20 L',   410.00),
  ('LP-003', 'Limpiavidrios 1 L',                           'botella 1 L',     39.00),
  ('DS-001', 'Desinfectante en aerosol 400 ml',             'lata 400 ml',     89.00),
  ('DS-002', 'Gel antibacterial 70% 1 L',                   'botella 1 L',     85.00),
  ('DS-003', 'Jabón líquido para manos 1 L',                'botella 1 L',     42.00),
  ('DS-004', 'Jabón líquido para manos 20 L',               'garrafa 20 L',   640.00),
  ('PP-001', 'Papel higiénico jumbo (caja 6 rollos 500 m)', 'caja',           480.00),
  ('PP-002', 'Toalla interdoblada (caja 2000 hojas)',       'caja',           390.00),
  ('PP-003', 'Toalla en rollo para manos (caja 6 rollos)',  'caja',           520.00),
  ('BS-001', 'Bolsa negra para basura 90x120',              'kg',              42.00),
  ('BS-002', 'Bolsa negra para basura 60x90',               'kg',              40.00),
  ('FR-001', 'Fibra verde (paquete 10 piezas)',             'paquete',         55.00),
  ('FR-002', 'Franela roja (paquete 6 piezas)',             'paquete',         95.00),
  ('JG-001', 'Jerga de algodón',                            'pieza',           22.00),
  ('TR-001', 'Trapeador de algodón con bastón',             'pieza',           65.00),
  ('ES-001', 'Escoba de plástico con bastón',               'pieza',           75.00),
  ('CB-001', 'Cubeta de plástico 12 L',                     'pieza',           58.00),
  ('AR-001', 'Aromatizante ambiental 1 L',                  'botella 1 L',     48.00),
  ('SR-001', 'Ácido muriático 1 L',                         'botella 1 L',     26.00);

-- ---------------------------------------------------------------------
-- 3. Alias por sucursal — los nombres "viejos" de cada Excel.
--    sucursal NULL = alias que usan en todas las sucursales.
-- ---------------------------------------------------------------------
INSERT INTO producto_alias (producto_id, alias, sucursal_id)
SELECT p.id, a.alias, s.id
FROM (VALUES
  -- Los tres alias del caso, todos apuntan a CL-001
  ('CL-001', 'Cloro 1L',                'Guadalajara'),
  ('CL-001', 'CLORO LITRO',             'León'),
  ('CL-001', 'Blanqueador 1000ml',      'Querétaro'),
  ('CL-001', 'Cloro de litro',          'Zapopan'),
  ('CL-001', 'CLORO 1 LT',              'Aguascalientes'),
  ('CL-002', 'Cloro galon',             'Guadalajara'),
  ('CL-002', 'CLORO GALÓN',             'León'),
  ('CL-003', 'Cloro porrón 20L',        'Zapopan'),
  ('CL-003', 'Cloro garrafa 20',        'Querétaro'),
  ('DG-001', 'Desengrasante 1L',        'Guadalajara'),
  ('DG-001', 'DESENGRASANTE IND LT',    'León'),
  ('DT-001', 'Detergente 1 kilo',       'Zapopan'),
  ('DT-001', 'Jabón en polvo 1kg',      'Aguascalientes'),
  ('LT-001', 'Lavatrastes litro',       'Guadalajara'),
  ('LT-001', 'Jabón trastes 1L',        'Querétaro'),
  ('LP-001', 'MULTIUSOS LAVANDA',       'León'),
  ('LP-001', 'Limpiador piso lavanda',  'Aguascalientes'),
  ('PP-001', 'Papel jumbo',             'Zapopan'),
  ('PP-001', 'PH JUMBO CAJA',           'León'),
  ('BS-001', 'BOLSA 90X120',            'Guadalajara'),
  ('BS-001', 'Bolsa negra jumbo',       'Querétaro'),
  ('JG-001', 'Jerga',                   'Aguascalientes'),
  ('SR-001', 'Sarricida litro',         'Guadalajara'),
  ('SR-001', 'Ácido muriático',         'Querétaro'),
  ('DS-002', 'Gel antibacterial litro', NULL)
) AS a(sku, alias, sucursal)
JOIN productos p ON p.sku = a.sku
LEFT JOIN sucursales s ON s.nombre = a.sucursal;   -- LEFT JOIN para permitir sucursal NULL

-- ---------------------------------------------------------------------
-- 4. Existencias — 30 productos x 5 sucursales = 150 filas.
--    Paso A: cada producto tiene su mínimo; la cantidad inicial es de
--            2 a 5 veces ese mínimo (nadie queda bajo el mínimo todavía).
--    Paso B: abajo se ajustan a mano los casos interesantes.
-- ---------------------------------------------------------------------
INSERT INTO existencias (producto_id, sucursal_id, cantidad, minimo, actualizado_en)
SELECT p.id,
       s.id,
       m.minimo * (2 + (p.id + s.id) % 4),                       -- entre 2x y 5x el mínimo
       m.minimo,
       now() - ((p.id * 7 + s.id * 5) % 48) * interval '1 hour'  -- fechas de actualización variadas
FROM (VALUES
  ('CL-001', 60), ('CL-002', 30), ('CL-003', 10), ('DG-001', 24), ('DG-002', 5),
  ('DT-001', 40), ('DT-002', 8),  ('DT-003', 12), ('LT-001', 24), ('LT-002', 5),
  ('LP-001', 36), ('LP-002', 6),  ('LP-003', 18), ('DS-001', 12), ('DS-002', 15),
  ('DS-003', 18), ('DS-004', 4),  ('PP-001', 10), ('PP-002', 10), ('PP-003', 8),
  ('BS-001', 20), ('BS-002', 20), ('FR-001', 15), ('FR-002', 10), ('JG-001', 30),
  ('TR-001', 8),  ('ES-001', 8),  ('CB-001', 10), ('AR-001', 12), ('SR-001', 20)
) AS m(sku, minimo)
JOIN productos p ON p.sku = m.sku
CROSS JOIN sucursales s;   -- CROSS JOIN = cada producto con cada sucursal

-- Paso B: valores fijos para las historias de usuario
UPDATE existencias e
SET cantidad = v.cantidad, actualizado_en = now() - v.hace
FROM (VALUES
  -- Cloro 1 L en todas las sucursales (pregunta de Toño: "¿cuánto cloro de litro nos queda?")
  ('CL-001', 'Guadalajara',    180, interval '3 hours'),
  ('CL-001', 'Zapopan',         95, interval '5 hours'),
  ('CL-001', 'León',            12, interval '35 minutes'),  -- BAJO MÍNIMO (60)
  ('CL-001', 'Querétaro',      240, interval '2 hours'),
  ('CL-001', 'Aguascalientes',  70, interval '1 day'),
  -- Otros productos BAJO MÍNIMO (se ven en rojo en el tablero de Don Ernesto)
  ('DS-002', 'Guadalajara',      4, interval '6 hours'),     -- mínimo 15
  ('PP-001', 'Zapopan',          3, interval '4 hours'),     -- mínimo 10
  ('TR-001', 'Zapopan',          0, interval '1 day'),       -- mínimo 8 (agotado)
  ('LT-001', 'León',             9, interval '50 minutes'),  -- mínimo 24
  ('DG-002', 'Querétaro',        2, interval '7 hours'),     -- mínimo 5
  ('BS-001', 'Aguascalientes',   6, interval '3 hours'),     -- mínimo 20
  ('DS-003', 'Aguascalientes',   5, interval '9 hours')      -- mínimo 18
) AS v(sku, sucursal, cantidad, hace)
JOIN productos p  ON p.sku = v.sku
JOIN sucursales s ON s.nombre = v.sucursal
WHERE e.producto_id = p.id AND e.sucursal_id = s.id;

-- ---------------------------------------------------------------------
-- 5. Clientes (15) — hoteles, restaurantes, escuelas y tiendas
-- ---------------------------------------------------------------------
INSERT INTO clientes (nombre, telefono, email, tipo) VALUES
  ('Hotel Las Palmas',                  '477 210 4580', 'compras@hotellaspalmas.ejemplo.mx',  'Hotel'),
  ('Hotel Jardín Tapatío',              '33 3614 2290', 'almacen@jardintapatio.ejemplo.mx',   'Hotel'),
  ('Hotel Real de Santiago',            '442 215 7731', 'compras@realdesantiago.ejemplo.mx',  'Hotel'),
  ('Hotel Los Arcos',                   '449 918 3360', 'gerencia@hotellosarcos.ejemplo.mx',  'Hotel'),
  ('Restaurante La Fonda de Doña Lupe', '33 3826 5512', 'fondadonalupe@ejemplo.mx',           'Restaurante'),
  ('Mariscos El Faro',                  '33 3165 0947', 'elfaro.zapopan@ejemplo.mx',          'Restaurante'),
  ('Taquería Los Compadres',            '477 763 1208', 'loscompadres.leon@ejemplo.mx',       'Restaurante'),
  ('Cafetería La Parroquia del Centro', '442 212 6645', 'administracion@laparroquia.ejemplo.mx','Restaurante'),
  ('Colegio Montessori Arboledas',      '33 3633 8810', 'mantenimiento@montessoriarb.ejemplo.mx','Escuela'),
  ('Escuela Primaria Benito Juárez',    '449 145 2273', 'direccion.bjuarez@ejemplo.mx',       'Escuela'),
  ('Instituto Educativo del Valle',     '442 248 9054', 'servicios@institutodelvalle.ejemplo.mx','Escuela'),
  ('Abarrotes Don Chuy',                '33 3617 4421', 'donchuy.abarrotes@ejemplo.mx',       'Tienda'),
  ('Minisúper La Esperanza',            '33 3110 7368', 'minisuperlaesperanza@ejemplo.mx',    'Tienda'),
  ('Tienda El Ahorro',                  '449 976 0185', 'tiendaelahorro@ejemplo.mx',          'Tienda'),
  ('Ferretería y Abarrotes San Miguel', '477 714 3392', 'sanmiguel.leon@ejemplo.mx',          'Tienda');

-- ---------------------------------------------------------------------
-- 6. Pedidos (25) — folios RC-1030 a RC-1054
--    hace       = cuánto tiempo hace que se creó el pedido
--    compromiso = días respecto a hoy (negativo = fecha ya pasada)
--    Estados: 10 Entregado, 5 Enviado, 4 Surtido, 4 Recibido, 2 Cancelado
-- ---------------------------------------------------------------------
INSERT INTO pedidos (folio, cliente_id, sucursal_id, estado, fecha_compromiso, creado_en)
SELECT v.folio, c.id, s.id, v.estado, CURRENT_DATE + v.compromiso, now() - v.hace
FROM (VALUES
  ('RC-1030', 'Hotel Jardín Tapatío',              'Guadalajara',    'Entregado', interval '20 days 2 hours', -17),
  ('RC-1031', 'Abarrotes Don Chuy',                'Guadalajara',    'Entregado', interval '19 days 5 hours', -17),
  ('RC-1032', 'Mariscos El Faro',                  'Zapopan',        'Entregado', interval '18 days 1 hour',  -16),
  ('RC-1033', 'Escuela Primaria Benito Juárez',    'Aguascalientes', 'Entregado', interval '17 days 3 hours', -14),
  ('RC-1034', 'Taquería Los Compadres',            'León',           'Cancelado', interval '16 days 4 hours', -14),
  ('RC-1035', 'Hotel Real de Santiago',            'Querétaro',      'Entregado', interval '15 days 2 hours', -12),
  ('RC-1036', 'Colegio Montessori Arboledas',      'Zapopan',        'Entregado', interval '14 days 6 hours', -11),
  ('RC-1037', 'Hotel Las Palmas',                  'León',           'Entregado', interval '13 days 3 hours', -10),
  ('RC-1038', 'Tienda El Ahorro',                  'Aguascalientes', 'Entregado', interval '12 days 1 hour',   -9),
  ('RC-1039', 'Cafetería La Parroquia del Centro', 'Querétaro',      'Entregado', interval '10 days 4 hours',  -8),
  ('RC-1040', 'Minisúper La Esperanza',            'Zapopan',        'Cancelado', interval '9 days 2 hours',   -6),
  ('RC-1041', 'Hotel Los Arcos',                   'Aguascalientes', 'Entregado', interval '8 days 5 hours',   -5),
  -- RC-1042: el caso del Hotel Las Palmas. León no tenía cloro de litro,
  -- se surtió desde Querétaro y va RETRASADO (compromiso hace 2 días).
  ('RC-1042', 'Hotel Las Palmas',                  'Querétaro',      'Enviado',   interval '4 days 3 hours',   -2),
  ('RC-1043', 'Restaurante La Fonda de Doña Lupe', 'Guadalajara',    'Enviado',   interval '3 days 2 hours',    0),
  ('RC-1044', 'Ferretería y Abarrotes San Miguel', 'León',           'Enviado',   interval '3 days 5 hours',    0),
  ('RC-1045', 'Instituto Educativo del Valle',     'Querétaro',      'Enviado',   interval '2 days 4 hours',    1),
  ('RC-1046', 'Hotel Jardín Tapatío',              'Zapopan',        'Enviado',   interval '2 days 6 hours',    1),
  ('RC-1047', 'Mariscos El Faro',                  'Zapopan',        'Surtido',   interval '1 day 20 hours',    1),
  ('RC-1048', 'Taquería Los Compadres',            'León',           'Surtido',   interval '1 day 2 hours',     1),
  ('RC-1049', 'Hotel Real de Santiago',            'Querétaro',      'Surtido',   interval '22 hours',          2),
  ('RC-1050', 'Tienda El Ahorro',                  'Aguascalientes', 'Surtido',   interval '18 hours',          2),
  ('RC-1051', 'Abarrotes Don Chuy',                'Guadalajara',    'Recibido',  interval '3 hours',           2),
  ('RC-1052', 'Colegio Montessori Arboledas',      'Zapopan',        'Recibido',  interval '2 hours',           3),
  ('RC-1053', 'Hotel Los Arcos',                   'Aguascalientes', 'Recibido',  interval '1 hour 10 minutes', 3),
  ('RC-1054', 'Cafetería La Parroquia del Centro', 'Querétaro',      'Recibido',  interval '25 minutes',        4)
) AS v(folio, cliente, sucursal, estado, hace, compromiso)
JOIN clientes c   ON c.nombre = v.cliente
JOIN sucursales s ON s.nombre = v.sucursal;

-- ---------------------------------------------------------------------
-- 7. Detalle de pedidos — el precio se copia del catálogo al momento
--    del pedido (si después cambia el precio, el pedido no se altera).
-- ---------------------------------------------------------------------
INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio)
SELECT pe.id, p.id, v.cantidad, p.precio_venta
FROM (VALUES
  ('RC-1030', 'CL-003', 4), ('RC-1030', 'DS-004', 2), ('RC-1030', 'PP-001', 8), ('RC-1030', 'BS-001', 15),
  ('RC-1031', 'CL-001', 48), ('RC-1031', 'DT-001', 30), ('RC-1031', 'LP-001', 24), ('RC-1031', 'FR-001', 10),
  ('RC-1032', 'DG-002', 2), ('RC-1032', 'LT-002', 2), ('RC-1032', 'CL-003', 3),
  ('RC-1033', 'PP-001', 12), ('RC-1033', 'DS-003', 20), ('RC-1033', 'CL-002', 10), ('RC-1033', 'TR-001', 6),
  ('RC-1034', 'DG-001', 12), ('RC-1034', 'LT-001', 24),
  ('RC-1035', 'CL-003', 5), ('RC-1035', 'DT-002', 6), ('RC-1035', 'PP-002', 10),
  ('RC-1036', 'CL-003', 2), ('RC-1036', 'PP-001', 10), ('RC-1036', 'ES-001', 8), ('RC-1036', 'JG-001', 20),
  ('RC-1037', 'CL-001', 72), ('RC-1037', 'DS-003', 24), ('RC-1037', 'BS-001', 10),
  ('RC-1038', 'CL-001', 36), ('RC-1038', 'DT-001', 24), ('RC-1038', 'LP-003', 12), ('RC-1038', 'SR-001', 12),
  ('RC-1039', 'LT-001', 18), ('RC-1039', 'DG-001', 6), ('RC-1039', 'PP-003', 4),
  ('RC-1040', 'CL-001', 24), ('RC-1040', 'FR-002', 5),
  ('RC-1041', 'DT-003', 10), ('RC-1041', 'CL-002', 12), ('RC-1041', 'AR-001', 12), ('RC-1041', 'PP-001', 6),
  -- RC-1042 (Hotel Las Palmas, surtido desde Querétaro)
  ('RC-1042', 'CL-001', 96), ('RC-1042', 'DS-003', 24), ('RC-1042', 'PP-001', 10), ('RC-1042', 'BS-001', 15),
  ('RC-1043', 'DG-002', 1), ('RC-1043', 'LT-002', 2), ('RC-1043', 'FR-001', 6),
  ('RC-1044', 'CL-001', 36), ('RC-1044', 'SR-001', 24), ('RC-1044', 'CB-001', 10), ('RC-1044', 'ES-001', 6),
  ('RC-1045', 'PP-001', 15), ('RC-1045', 'DS-002', 10), ('RC-1045', 'LP-002', 2),
  ('RC-1046', 'CL-003', 4), ('RC-1046', 'PP-002', 8), ('RC-1046', 'DS-001', 12),
  ('RC-1047', 'DG-001', 12), ('RC-1047', 'LT-002', 2), ('RC-1047', 'CL-003', 2),
  ('RC-1048', 'LT-001', 12), ('RC-1048', 'DG-001', 6), ('RC-1048', 'JG-001', 10),
  ('RC-1049', 'DT-002', 5), ('RC-1049', 'DS-004', 2), ('RC-1049', 'BS-001', 20),
  ('RC-1050', 'DT-001', 36), ('RC-1050', 'CL-001', 48), ('RC-1050', 'LP-001', 24),
  ('RC-1051', 'CL-002', 12), ('RC-1051', 'FR-001', 12), ('RC-1051', 'AR-001', 6),
  ('RC-1052', 'DS-003', 15), ('RC-1052', 'PP-003', 4), ('RC-1052', 'TR-001', 4),
  ('RC-1053', 'PP-001', 8), ('RC-1053', 'CL-003', 3), ('RC-1053', 'DS-002', 6),
  ('RC-1054', 'LT-001', 12), ('RC-1054', 'PP-002', 4), ('RC-1054', 'LP-003', 6)
) AS v(folio, sku, cantidad)
JOIN pedidos pe  ON pe.folio = v.folio
JOIN productos p ON p.sku = v.sku;

-- ---------------------------------------------------------------------
-- 8. Eventos de pedidos (línea de tiempo)
--    Paso A: eventos "normales". Cada pedido recibe un evento por cada
--            estado que ya alcanzó (Recibido → Surtido → Enviado → Entregado).
--            RC-1042 se omite porque lleva eventos especiales (paso C).
-- ---------------------------------------------------------------------
INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
SELECT pe.id, e.estado, e.nota, pe.creado_en + e.desfase
FROM pedidos pe
JOIN (VALUES
  (1, 'Recibido',  'Pedido registrado',                       interval '0 minutes'),
  (2, 'Surtido',   'Mercancía surtida y empacada en bodega',  interval '4 hours'),
  (3, 'Enviado',   'Salió a ruta de reparto',                 interval '1 day'),
  (4, 'Entregado', 'Entregado; el cliente firmó de recibido', interval '2 days')
) AS e(orden, estado, nota, desfase)
  ON e.orden <= CASE pe.estado          -- hasta qué paso llegó cada pedido
                  WHEN 'Recibido'  THEN 1
                  WHEN 'Surtido'   THEN 2
                  WHEN 'Enviado'   THEN 3
                  WHEN 'Entregado' THEN 4
                  WHEN 'Cancelado' THEN 1   -- los cancelados solo se recibieron
                END
WHERE pe.folio <> 'RC-1042';

-- Paso B: evento de cancelación con su motivo
INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
SELECT pe.id, 'Cancelado', v.nota, pe.creado_en + v.desfase
FROM (VALUES
  ('RC-1034', 'El cliente canceló: ya había comprado con otro proveedor', interval '6 hours'),
  ('RC-1040', 'Pedido duplicado; se capturó dos veces por teléfono',      interval '1 hour')
) AS v(folio, nota, desfase)
JOIN pedidos pe ON pe.folio = v.folio;

-- Paso C: línea de tiempo de RC-1042 (el pedido retrasado del hotel)
INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
SELECT pe.id, v.estado, v.nota, now() - v.hace
FROM (VALUES
  ('Recibido', 'Pedido tomado en León. León sin cloro 1 L suficiente; se surte desde Querétaro', interval '4 days 3 hours'),
  ('Surtido',  'Surtido en bodega Querétaro; espera de unidad para la ruta a León',              interval '3 days'),
  ('Enviado',  'Salió a ruta Querétaro–León con 1 día de retraso por falta de unidad',           interval '1 day 2 hours')
) AS v(estado, nota, hace)
JOIN pedidos pe ON pe.folio = 'RC-1042';

-- ---------------------------------------------------------------------
-- 9. Seguimientos (6)
--    4 del Hotel Las Palmas por el MISMO retraso de RC-1042 (historial).
--    Semáforo de primera respuesta: verde < 10 min, amarillo 10–15, rojo > 15.
--    hace     = cuándo se registró
--    respuesta / cierre = minutos después de registrarse (NULL = aún no)
-- ---------------------------------------------------------------------
INSERT INTO seguimientos (pedido_id, cliente_id, canal, motivo, descripcion, estado, origen,
                          creado_en, primera_respuesta_en, cerrado_en)
SELECT pe.id, c.id, v.canal, v.motivo, v.descripcion, v.estado, v.origen,
       now() - v.hace,
       now() - v.hace + v.respuesta,   -- si respuesta es NULL, el resultado es NULL
       now() - v.hace + v.cierre
FROM (VALUES
  -- 1) Primera queja: verde (8 min) y cerrada
  ('RC-1042', 'Hotel Las Palmas', 'teléfono', 'Retraso',
   'El pedido no llegó en la fecha prometida. Se le explicó que sale de Querétaro.',
   'Cerrado', 'manual', interval '2 days', interval '8 minutes', interval '2 hours'),
  -- 2) Segunda queja: amarillo (14 min) y cerrada
  ('RC-1042', 'Hotel Las Palmas', 'WhatsApp', 'Retraso',
   'Vuelven a preguntar por el pedido; se les está acabando el cloro de la lavandería.',
   'Cerrado', 'manual', interval '1 day 4 hours', interval '14 minutes', interval '3 hours'),
  -- 3) Tercera queja: rojo (32 min) y en proceso
  ('RC-1042', 'Hotel Las Palmas', 'correo', 'Retraso',
   'El gerente del hotel pide por escrito la fecha y hora de entrega.',
   'En proceso', 'manual', interval '5 hours', interval '32 minutes', NULL),
  -- 4) Cuarta queja: abierta SIN respuesta hace 25 min → VENCIDA (rojo)
  ('RC-1042', 'Hotel Las Palmas', 'teléfono', 'Retraso',
   'Llaman otra vez: la unidad no ha llegado y amenazan con cambiar de proveedor.',
   'Abierto', 'manual', interval '25 minutes', NULL, NULL),
  -- 5) Duda reciente registrada por el asistente: abierta, 6 min → verde
  ('RC-1047', 'Mariscos El Faro', 'WhatsApp', 'Duda',
   '¿Se pueden agregar 2 garrafas más de lavatrastes 20 L antes de que salga el pedido?',
   'Abierto', 'ia', interval '6 minutes', NULL, NULL),
  -- 6) Producto dañado en un pedido ya entregado: cerrado
  ('RC-1036', 'Colegio Montessori Arboledas', 'correo', 'Producto dañado',
   'Una garrafa de cloro 20 L llegó golpeada y con fuga. Se repuso en la siguiente ruta.',
   'Cerrado', 'manual', interval '11 days', interval '9 minutes', interval '1 day')
) AS v(folio, cliente, canal, motivo, descripcion, estado, origen, hace, respuesta, cierre)
JOIN pedidos pe  ON pe.folio = v.folio
JOIN clientes c  ON c.nombre = v.cliente;

COMMIT;   -- guarda todo

 