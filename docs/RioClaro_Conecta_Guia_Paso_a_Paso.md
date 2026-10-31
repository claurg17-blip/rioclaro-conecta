# Río Claro Conecta — Guía de implementación paso a paso (para principiantes)

> Esta guía acompaña al documento de diseño \*\*`RioClaro\_Conecta\_Definicion\_Arquitectura\_Plan.md`\*\*. El diseño dice \*\*qué\*\* construir; esta guía dice \*\*cómo, con qué herramienta y dónde dar clic\*\*.
> Entorno: Windows · VS Code · terminal \*\*PowerShell\*\* · \*\*Claude Code\*\* como copiloto · Paso 0 ya realizado.
> \*\*Login:\*\* usuarios y contraseñas propios guardados en PostgreSQL (no se usa Microsoft Entra ID para el inicio de sesión).

\---

## Cómo leer esta guía

Cada acción tiene una etiqueta que indica **dónde** se hace:

|Etiqueta|Dónde|Cómo abrirlo|
|-|-|-|
|**\[TERMINAL]**|Terminal PowerShell dentro de VS Code|Menú *Terminal → New Terminal* (o `Ctrl + ``)|
|**\[CLAUDE]**|Panel de Claude Code en VS Code|Ícono de Claude en la barra lateral (o `Ctrl + Esc`)|
|**\[VS CODE]**|Editor o extensiones de VS Code|Barra lateral izquierda|
|**\[PORTAL]**|Portal de Azure|https://portal.azure.com|
|**\[FOUNDRY]**|Portal de Microsoft Foundry|https://ai.azure.com|
|**\[NAVEGADOR]**|Chrome o Edge|Para probar la app|

Cada paso termina con **✔ Verifica** (cómo saber que salió bien) y, cuando aplica, con un **Prompt para Claude** listo para copiar.

> \*\*Truco para el portal de Azure:\*\* los menús cambian de nombre con frecuencia. Si no encuentras una opción, usa la \*\*barra de búsqueda de arriba\*\* del portal (o la caja \*Search\* del menú izquierdo dentro de cada recurso) y escribe el nombre de la opción, por ejemplo "Identity" o "Networking".

### Reglas de oro con Claude Code

1. **Lee antes de aceptar.** Claude te muestra los cambios (diff) y pide permiso para ejecutar comandos. Acepta solo lo que entiendas; si no entiendes algo, pregúntale "explícame qué hace este comando".
2. **Nunca pegues contraseñas ni secretos en el chat.** Escríbelos tú directamente en el archivo `.env`.
3. **Pídele una cosa a la vez.** Un archivo o una función por prompt funciona mejor que "hazme toda la app".
4. **Guarda tu avance con Git** al terminar cada paso (*commit*). Si algo se rompe, puedes regresar.
5. **Los comandos de Azure (`az ...`) ejecútalos tú** en la terminal, para entender qué recurso estás creando y cuánto cuesta.

### Hoja de valores (llénala conforme avances)

Crea un archivo **fuera** del proyecto (por ejemplo `Documentos\\rioclaro-valores.txt`) y anota aquí lo que vayas obteniendo. Lo usarás muchas veces.

```
SUSCRIPCION\_ID      =
GRUPO\_RECURSOS      =
APP\_BACKEND         = (nombre del App Service del backend)
APP\_FRONTEND        = (nombre del App Service del frontend)
URL\_BACKEND         = https://<APP\_BACKEND>.azurewebsites.net
URL\_FRONTEND        = https://<APP\_FRONTEND>.azurewebsites.net
PG\_SERVIDOR         = <servidor>.postgres.database.azure.com
PG\_USUARIO          =
FOUNDRY\_RECURSO     =
FOUNDRY\_ENDPOINT    = https://<recurso>.services.ai.azure.com/api/projects/<proyecto>
MODELO\_DEPLOYMENT   = gpt-4.1-mini
KEYVAULT            = kv-rioclaro-<iniciales>
USUARIOS\_PRUEBA     = carlos / mariana / tono / vendedor / ernesto (contraseñas temporales)
USUARIO\_REVISOR     = revisor / contraseña definitiva para el docente
```

\---

## Paso 1 — Preparar el proyecto en VS Code (≈ 30 min)

### 1.1 Crear las carpetas

**\[TERMINAL]**

```powershell
cd $HOME\\Documents
mkdir rioclaro-conecta
cd rioclaro-conecta
mkdir backend, frontend, docs
git init
code .
```

Se abre una ventana nueva de VS Code en la carpeta del proyecto. **A partir de aquí trabaja siempre en esa ventana.**

### 1.2 Copiar los documentos de diseño

**\[VS CODE]** Arrastra `RioClaro\_Conecta\_Definicion\_Arquitectura\_Plan.md` y esta guía a la carpeta `docs/`. Así Claude Code puede leerlos.

### 1.3 Instalar las extensiones

**\[VS CODE]** Ícono de *Extensions* (cuatro cuadritos) o `Ctrl + Shift + X`. Busca e instala:

|Extensión|Para qué|
|-|-|
|**Azure App Service** (Microsoft)|Desplegar backend y frontend con clic derecho|
|**Azure Resources** (Microsoft)|Ver tus recursos de Azure dentro de VS Code|
|**PostgreSQL** (Microsoft)|Conectarte a la base de datos y ejecutar SQL|
|**Claude Code** (Anthropic)|Tu copiloto (ya debes tenerlo)|

Después de instalar las extensiones de Azure aparece un ícono de **Azure** en la barra lateral. Dale clic → *Sign in to Azure* e inicia sesión con tu cuenta de estudiante.

### 1.4 Archivo `.gitignore`

**\[CLAUDE]**

> Crea un archivo .gitignore en la raíz para un proyecto Node + Vite que ignore node\_modules, .env, .env.\*, dist y archivos .zip. Solo ese archivo.

### 1.5 Archivo `CLAUDE.md` (memoria del proyecto para Claude)

Claude Code lee automáticamente un archivo `CLAUDE.md` en la raíz. Ponle el contexto del proyecto para no repetirlo en cada prompt.

**\[VS CODE]** Crea `CLAUDE.md` en la raíz con este contenido:

```markdown
# Proyecto: Río Claro Conecta
Diseño completo en docs/RioClaro\_Conecta\_Definicion\_Arquitectura\_Plan.md (léelo antes de proponer cambios).

## Stack (no cambiar)
- Backend: Node.js 22, Express 5, ES Modules ("type": "module"), pg, jose, bcryptjs, express-rate-limit, @azure/ai-projects 2.x, @azure/identity
- Base de datos: Azure Database for PostgreSQL (SQL plano con pg, sin ORM)
- Frontend: React 19, Vite 8, Tailwind CSS 4 (plugin @tailwindcss/vite), react-router
- Autenticación: PROPIA. Usuarios en la tabla `usuarios` de PostgreSQL, contraseñas con bcryptjs,
  sesión con JWT (HS256, 8 h) firmado con JWT\_SECRET. Roles en la columna `rol`: Admin, Gerente, Ventas, Bodega.
  NO usar Entra ID ni MSAL para el login.
- IA: agente de Microsoft Foundry con function calling; el backend ejecuta las herramientas

## Reglas
- Soy principiante: explica brevemente cada archivo que crees.
- Código simple y comentado en español. Nada de TypeScript.
- Nunca escribas secretos en el código; usa variables de entorno (.env).
- Nunca guardes ni muestres contraseñas en texto plano ni las escribas en logs.
- Sistema operativo Windows, terminal PowerShell.
- Haz un solo archivo o función a la vez y espera mi confirmación.
```

### 1.6 Primer commit

**\[TERMINAL]**

```powershell
git add .
git commit -m "Estructura inicial del proyecto"
```

✔ **Verifica:** en VS Code ves `backend/`, `frontend/`, `docs/`, `.gitignore` y `CLAUDE.md`.

\---

## Paso 2 — Base de datos PostgreSQL (≈ 1.5 h)

### 2.1 Abrir el firewall

1. **\[PORTAL]** Barra de búsqueda → `Azure Database for PostgreSQL flexible servers` → abre tu servidor.
2. Si en *Overview* el estado es **Stopped** → botón **Start** (espera 2-3 min).
3. Menú izquierdo *Settings →* **Networking**.
4. Marca ☑ **Allow public access from any Azure service within Azure to this server**.
5. Clic en **+ Add current client IP address** (agrega la IP de tu casa).
6. **Save**.
7. Copia en tu hoja de valores el **Server name** (*Overview → Endpoint / Server name*) y el **Administrator login**.

### 2.2 Conectarte desde VS Code

1. **\[VS CODE]** Ícono del elefante (extensión PostgreSQL) → **+ Add Connection**.
2. Llena: *Server name* = `PG\_SERVIDOR`, *Authentication* = **Password**, *User* = `PG\_USUARIO`, la contraseña, *Database* = `postgres` y **SSL mode = require**.
3. **Connect**.
4. Clic derecho en la conexión → **New Query** y ejecuta:

```sql
   CREATE DATABASE rioclaro;
   ```

5. Edita la conexión (o crea otra) para que use la base `rioclaro`.

### 2.3 Crear las tablas (incluye la tabla de usuarios)

1. **\[VS CODE]** Crea `backend/db/001\_esquema.sql` y pega el SQL de la sección **3.4** del documento de diseño.
La tabla `usuarios` ya incluye `usuario`, `password\_hash`, `rol`, `sucursal\_id`, `activo` y `debe\_cambiar\_password`.
2. Con el archivo abierto, botón **Run** (▷ arriba a la derecha) → elige la conexión `rioclaro`.

### 2.4 Datos de prueba

**\[CLAUDE]**

> Lee backend/db/001\_esquema.sql y las secciones 2 y 3.4 de docs/RioClaro\_Conecta\_Definicion\_Arquitectura\_Plan.md. Crea backend/db/002\_datos.sql con datos de prueba realistas de una distribuidora de productos de limpieza en México: las 5 sucursales (Guadalajara, Zapopan, León, Querétaro, Aguascalientes), 30 productos con SKU, alias por sucursal (incluye "Cloro 1L", "CLORO LITRO" y "Blanqueador 1000ml" como alias de CL-001), existencias por sucursal con algunos productos bajo el mínimo, 15 clientes (hoteles, restaurantes, escuelas, tiendas), 25 pedidos en distintos estados con su detalle y eventos, y 6 seguimientos (4 del mismo hotel por el mismo retraso). NO insertes usuarios: se crean con un script que cifra las contraseñas.

**\[VS CODE]** Revisa el archivo y ejecútalo igual que el anterior (botón **Run**).

> ⚠️ Los usuarios \*\*no\*\* se insertan con SQL a mano, porque la contraseña debe guardarse cifrada (hash bcrypt). Se crean en el Paso 3.4 con un script.

✔ **Verifica:**

```sql
SELECT p.sku, a.alias FROM productos p JOIN producto\_alias a ON a.producto\_id = p.id WHERE p.sku = 'CL-001';
```

Debe regresar los 3 alias del cloro.

**\[TERMINAL]** `git add . ; git commit -m "Base de datos y datos de prueba"`

> 💡 \*\*Ahorro:\*\* cuando termines tu sesión de trabajo, \*\*\[PORTAL]\*\* servidor PostgreSQL → \*Overview\* → \*\*Stop\*\*. Al día siguiente → \*\*Start\*\*.

\---

## Paso 3 — Backend con Express 5 y login propio (≈ 1 a 2 días)

### 3.1 Iniciar el proyecto de Node

**\[TERMINAL]**

```powershell
cd backend



Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


npm init -y
npm pkg set type=module
npm pkg set scripts.dev="node --watch src/app.js"
npm pkg set scripts.start="node src/app.js"
npm pkg set engines.node=">=22"
npm i express@5 cors pg jose bcryptjs express-rate-limit dotenv @azure/ai-projects @azure/identity
```

> `bcryptjs` cifra las contraseñas, `jose` crea y valida los tokens JWT y `express-rate-limit` limita los intentos de login.

### 3.2 Generar el secreto del JWT

El backend firma los tokens de sesión con un secreto. Genera uno aleatorio:

**\[TERMINAL]**

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado (64 caracteres). Lo usarás en el `.env` y después en Key Vault.

### 3.3 Archivo `.env`

**\[VS CODE]** Crea `backend/.env` **tú mismo** (no se lo pidas a Claude, porque lleva tus secretos):

```
PORT=3000
PGHOST=<PG\_SERVIDOR>
PGUSER=<PG\_USUARIO>
PGPASSWORD=<tu contraseña de PostgreSQL>
PGDATABASE=rioclaro
JWT\_SECRET=<el valor que generaste en 3.2>
FRONTEND\_URL=http://localhost:5173
FOUNDRY\_PROJECT\_ENDPOINT=
MODEL\_DEPLOYMENT=gpt-4.1-mini
AGENT\_NAME=asistente-rioclaro
AGENTE\_HABILITADO=true
```

✔ Revisa que `.env` aparezca en gris en el explorador de VS Code (significa que Git lo ignora).

### 3.4 Conexión, login y usuarios

Pide **un prompt a la vez**, revisa y prueba antes del siguiente.

|#|Prompt para **\[CLAUDE]**|Prueba|
|-|-|-|
|1|*Crea backend/src/db.js y backend/src/app.js según la sección 6 Paso 3 del documento de diseño. Por ahora solo la ruta GET /api/salud y una ruta GET /api/db-prueba (temporal, sin auth) que haga SELECT count(*) FROM productos.\*|**\[TERMINAL]** `npm run dev` → **\[NAVEGADOR]** `http://localhost:3000/api/salud` y `/api/db-prueba`|
|2|*Crea backend/scripts/crear-usuario.mjs exactamente como en el Paso 1 de la sección 6 del documento de diseño.*|Ver 3.5|
|3|*Crea backend/src/auth.js (firmarToken, requireAuth, requireRole) y backend/src/rutas/auth.js (login y cambiar-password) como en el documento de diseño. Conéctalos en app.js con app.set("trust proxy", 1), protege todo /api excepto /api/salud y /api/auth/login, y agrega GET /api/me que regrese id, nombre, rol y sucursal.*  |Ver 3.6|
|4|*Crea backend/src/rutas/usuarios.js, solo para el rol Admin: listar (sin password\_hash), crear con contraseña temporal aleatoria que se regresa una sola vez, cambiar nombre/rol/sucursal, activar o desactivar y reiniciar contraseña (genera otra temporal y pone debe\_cambiar\_password=true). Un Admin no puede desactivarse a sí mismo.*|Ver 3.6|

### 3.5 Crear los usuarios de prueba

Con el backend detenido o en otra terminal, **\[TERMINAL]** (en la carpeta `backend`):

```powershell
node scripts/crear-usuario.mjs carlos "Carlos Soporte" Admin / Ro0Cy7wG
node scripts/crear-usuario.mjs ernesto "Don Ernesto" Gerente / EMiPu81W
node scripts/crear-usuario.mjs mariana "Mariana León" Gerente León / 2U0alL-1
node scripts/crear-usuario.mjs tono "Toño Bodega" Bodega León / aBQvTlEF
node scripts/crear-usuario.mjs vendedor "Vendedor Qro" Ventas Querétaro / GdCkBray
node scripts/crear-usuario.mjs revisor "Revisor Docente" Gerente /q0XLEb7d
```

Cada comando imprime una **contraseña temporal**. **Anótala** en tu hoja de valores; no se puede volver a ver (solo reiniciar).

✔ **Verifica** en **\[VS CODE]** (extensión PostgreSQL):

```sql
SELECT usuario, rol, sucursal\_id, activo, debe\_cambiar\_password, left(password\_hash, 7) AS hash FROM usuarios;
```

Debes ver 6 usuarios y el hash empezando con `$2a$10$` o `$2b$10$`, nunca la contraseña real. 📸 Esta captura sirve como evidencia de privacidad.

### 3.6 Probar el login desde la terminal

Con `npm run dev` corriendo en una terminal, abre **otra terminal** (ícono **+**) y ejecuta en **\[TERMINAL]**:

```powershell
# 1) Login (cambia la contraseña temporal de mariana)
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login `
     -ContentType "application/json" -Body '{"usuario":"mariana","password":"2U0alL-2"}'
$r.usuario

# 2) Usar el token
$h = @{ Authorization = "Bearer $($r.token)" }
Invoke-RestMethod -Uri http://localhost:3000/api/me -Headers $h

# 3) Una ruta solo para Admin debe fallar con 403 para mariana
Invoke-RestMethod -Uri http://localhost:3000/api/usuarios -Headers $h
```

✔ **Verifica:**

* El paso 1 muestra el nombre, `rol = Gerente` y `debeCambiarPassword = True`.
* El paso 2 regresa los datos de Mariana.
* El paso 3 da **403 Sin permiso**. Repite el paso 1 con `carlos` y el paso 3 sí debe listar los usuarios.
* Con una contraseña incorrecta, el paso 1 da **401 Usuario o contraseña incorrectos**.

> En PowerShell, el acento grave `` ` `` al final de una línea significa "el comando continúa en la siguiente línea".

### 3.7 El resto de la API

|#|Prompt para **\[CLAUDE]**|
|-|-|
|5 |*Crea backend/src/rutas/productos.js y existencias.js según la tabla 3.5 del diseño, con búsqueda por nombre, SKU o alias.*|
|6  |*Crea backend/src/rutas/movimientos.js: un POST que en una transacción inserte el movimiento (con usuario\_id = req.user.id) y actualice existencias. Valida que una salida no deje la existencia negativa.*|
|7|*Crea backend/src/rutas/pedidos.js: lista, detalle por folio con eventos, alta y cambio de estado (que inserte en pedido\_eventos con el usuario).*|
|8|*Crea backend/src/rutas/seguimientos.js y tablero.js. El tablero regresa: seguimientos abiertos, vencidos (más de 15 min sin primera respuesta) y productos bajo mínimo por sucursal.*|

Pruébalas con `Invoke-RestMethod` como en 3.6 o espera al frontend.

> Si la terminal muestra un error, \*\*cópialo completo\*\* y pégalo en Claude: \*"Al correr npm run dev salió este error: ... ¿qué significa y cómo lo arreglo?"\*

**\[TERMINAL]** `git add . ; git commit -m "Backend API con login propio"`

\---

## Paso 4 — Frontend con React 19 + Vite 8 + Tailwind 4 (≈ 2 días)

### 4.1 Crear el proyecto

**\[TERMINAL]** Abre una **terminal nueva** (ícono **+**) para dejar el backend corriendo en la primera.

```powershell
cd $HOME\\Documents\\rioclaro-conecta
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm i react-router
npm i -D tailwindcss @tailwindcss/vite
```

> Si `npm create vite` avisa que la carpeta `frontend` ya existe, elige la opción para \*\*continuar sin borrar\*\* (está vacía).

### 4.2 Archivos `.env` del frontend  

**\[VS CODE]** Crea `frontend/.env`:

```
VITE\_API\_URL=http://localhost:3000
```

Y `frontend/.env.production` (se usa al publicar):

```
VITE\_API\_URL=https://<APP\_BACKEND>.azurewebsites.net
```

> En el frontend \*\*no va ningún secreto\*\*: todo lo que está en Vite lo puede ver cualquiera desde el navegador.

### 4.3 Construir el frontend con Claude

|#|Prompt para **\[CLAUDE]**|Prueba|
|-|-|-|
|1|*Configura Tailwind 4 en frontend con el plugin @tailwindcss/vite (vite.config.js e index.css). Limpia el contenido de ejemplo de Vite.*|**\[TERMINAL]** `npm run dev` → `http://localhost:5173`|
|2|*Crea frontend/src/api.js como en el documento de diseño y frontend/src/auth/AuthContext.jsx con login, logout, usuario actual y un componente RutaProtegida que reciba los roles permitidos. Guarda token y usuario en sessionStorage.*|—|
|3|*Crea la página Login (usuario y contraseña, botón "Entrar", mensaje de error, diseño mobile-first con Tailwind y el nombre "Río Claro Conecta") y la página CambiarPassword (actual, nueva y confirmar; mínimo 8 caracteres). Si al entrar debeCambiarPassword es true, manda obligatoriamente a CambiarPassword. Configura react-router.*|Entra con `mariana` y su temporal → te pide cambiar contraseña<br />Recuerda borrar /api/db-prueba cuando agreguemos la autenticación.|
|4  |*Crea un layout mobile-first: barra superior con el nombre y rol del usuario y botón Salir, y menú (abajo en celular, a la izquierda en escritorio) con: Inicio, Catálogo, Existencias, Pedidos, Seguimientos, Asistente y Admin. Muestra cada opción solo a los roles de la tabla 2.1 del diseño.*|Entra como `tono` y como `mariana`: el menú cambia|
|5 |*Crea la página Catálogo con buscador que llame a /api/productos?q=.*|Busca "cloro litro"|
|6 |*Crea la página Existencias con filtro por sucursal, filas en rojo bajo mínimo y un formulario para registrar movimientos.*|Registra una salida|
|7  |*Crea la página Pedidos (lista con filtros) y el detalle con línea de tiempo de eventos y botón para cambiar estado.*|Abre un pedido|
|8 (SIGUE ESTO)|*Crea la página Seguimientos con semáforo (verde < 10 min, amarillo 10-15, rojo > 15) y alta de seguimiento.*|Crea un seguimiento|
|9|*Crea la página Inicio con las tarjetas del tablero.*|Entra como `ernesto`|
|10|*Crea la página Admin (solo rol Admin) con la tabla de usuarios, botón "Nuevo usuario" que muestre la contraseña temporal UNA sola vez en un recuadro para copiarla, y acciones para cambiar rol o sucursal, Desactivar/Activar y Reiniciar contraseña.*|Como `carlos`, crea un usuario y desactívalo|

### 4.4 Probar la seguridad del login  

**\[NAVEGADOR]**

1. Entra con `vendedor` y cambia su contraseña.
2. En otra ventana, entra como `carlos` → Admin → **Desactivar** a `vendedor`.
3. Regresa a la ventana de `vendedor` y da clic en cualquier menú → debe mandarte al **login** (sesión cortada).
4. Intenta entrar como `vendedor` → "Usuario o contraseña incorrectos".
5. Reactívalo desde Admin.

*(Opcional)* Para ver qué trae el token: `F12` → *Application* → *Session Storage* → copia el valor de `token` y pégalo en **https://jwt.ms**. Verás `rol`, `sucursal\_id` y `exp` (la expiración). El token **no** contiene la contraseña.

✔ **Verifica:** con `mariana` ves catálogo, existencias y pedidos con datos reales; con `tono` no aparece el menú Admin.

**\[TERMINAL]** `git add . ; git commit -m "Frontend módulos y login"`

\---

## Paso 5 — Agente de IA en Microsoft Foundry (≈ 1 día)

### 5.1 Crear el recurso y el proyecto de Foundry

1. **\[FOUNDRY]** https://ai.azure.com → inicia sesión con tu cuenta de **estudiante** (la que tiene la suscripción).
2. Si arriba aparece un interruptor **"New Foundry"**, déjalo **activado**.
3. **Create project** (o *+ Create new*). Llena:

   * Project name: `rioclaro`
   * Clic en **Advanced options** (o *Customize*):

     * Subscription: tu suscripción de estudiante
     * Resource group: **tu grupo de recursos existente**
     * Foundry resource: crea uno nuevo, por ejemplo `foundry-rioclaro-<iniciales>`
     * Region: **East US 2** (si da error de política o "RequestDisallowedByAzure", prueba otra región: tu suscripción de estudiante solo permite algunas)
4. **Create** y espera 2-5 minutos.
5. En la página de inicio del proyecto copia el **Project endpoint** → `FOUNDRY\_ENDPOINT` en tu hoja de valores y en `backend/.env` (`FOUNDRY\_PROJECT\_ENDPOINT`).

### 5.2 Desplegar el modelo

1. **\[FOUNDRY]** Menú → **Models** / **Model catalog** (en el portal nuevo puede estar en *Discover → Models* o *Build → Models*).
2. Busca `gpt-4.1-mini` → ábrelo → **Deploy** (o *Use this model*) → **Customize**.
3. Configura:

   * Deployment name: `gpt-4.1-mini` (igual que `MODEL\_DEPLOYMENT`)
   * Deployment type: **Global Standard**
   * **Tokens per minute rate limit: 10K** (mueve el control hacia la izquierda; es tu freno de gasto)
   * Content filter: **DefaultV2** (déjalo por defecto)
4. **Deploy**.
5. Prueba en el **Playground** (botón *Open in playground*): escribe "Hola, ¿qué puedes hacer?".

> Si dice que no tienes \*\*cuota\*\* para ese modelo: intenta `gpt-4o-mini` o `gpt-5-mini` y actualiza `MODEL\_DEPLOYMENT` en `.env`.

📸 **Captura para la entrega:** la pantalla del deployment con el modelo, el tipo y el filtro de contenido.

### 5.3 Darte permiso para crear el agente

1. **\[PORTAL]** Busca el recurso `foundry-rioclaro-<iniciales>` (tipo *Foundry* / *AI Services*).
2. Menú izquierdo **Access control (IAM)** → **+ Add → Add role assignment**.
3. Pestaña *Role* → busca **Foundry User** (si no aparece, busca **Azure AI User**; es el mismo rol con su nombre anterior) → **Next**.
4. *Assign access to:* **User, group, or service principal** → **+ Select members** → tu cuenta → **Select**.
5. **Review + assign** (dos veces).

> Los permisos tardan entre 1 y 10 minutos en aplicar. Este permiso es para \*\*tu cuenta de Azure\*\* (la que usas para programar), no tiene nada que ver con los usuarios de la app.

### 5.4 Iniciar sesión en la terminal

**\[TERMINAL]**

```powershell
az login
az account show --query "{suscripcion:name, tenant:tenantId}" -o table
```

Debe mostrar tu suscripción de estudiante. El SDK de Foundry usa esta sesión cuando corres el código en tu PC.

### 5.5 Crear los archivos del agente

**\[CLAUDE]** (un prompt a la vez):

1. > \*Crea backend/src/agente/instrucciones.js y backend/src/agente/herramientas.js exactamente como en las secciones 5.2 y 5.3 del documento de diseño.\*
2. > \*Crea backend/scripts/crear-agente.mjs como en la sección 5.4.\*
3. > \*Crea backend/src/agente/ejecutor.js como en la sección 5.5 (los permisos se revisan con usuario.rol), completando consultar\_pedido (folio, cliente.nombre, sucursal, estado, fecha\_compromiso y eventos; si viene cliente, sus últimos 5 pedidos) y registrar\_seguimiento (INSERT con origen='ia', creado\_por = usuario.id, asignado al gerente de la sucursal del pedido si existe). Regresa solo los campos necesarios.\*
4. > \*Crea backend/src/agente/servicio.js como en la sección 5.6 y conecta la ruta POST /api/agente/chat en app.js (usa req.user con id, rol y sucursal\_id).\*

### 5.6 Crear el agente en Foundry

**\[TERMINAL]** (en la carpeta `backend`)

```powershell
node scripts/crear-agente.mjs
```

✔ Debe imprimir `Agente asistente-rioclaro versión 1 listo`.
**\[FOUNDRY]** Menú **Agents** → aparece `asistente-rioclaro`. Ábrelo para ver sus instrucciones y herramientas. 📸 Captura.

> \*\*Errores comunes:\*\* `401/403 PermissionDenied` → espera unos minutos a que aplique el rol (5.3) o vuelve a correr `az login`. `DeploymentNotFound` → el nombre en `MODEL\_DEPLOYMENT` no coincide con el del deployment.

### 5.7 Pantalla del Asistente

**\[CLAUDE]**

> \*Crea la página Asistente en el frontend: chat estilo mensajería, aviso fijo arriba "Estás hablando con un asistente de IA. Verifica antes de prometer al cliente.", muestra las fuentes debajo de cada respuesta, guarda el conversacionId en el estado, indicador de "escribiendo…" y manejo de errores. En celular debe ocupar toda la pantalla.\*

✔ **Verifica** (con `npm run dev` en las dos terminales):

* Como `tono`: *"¿cuánto cloro de litro nos queda?"* → muestra la existencia con su "Fuente:".
* Como `mariana`: *"¿cómo va el pedido RC-0005?"* → muestra el estado y la sucursal.
* Como `mariana`: *"registra una queja del hotel por retraso en RC-0005"* → **primero pide confirmación**.
* Como `tono`: intenta registrar una queja → debe decir que no tiene permiso.
* *"¿cuánto cuesta un Ferrari?"* → dice que no puede ayudar con eso.

**\[TERMINAL]** `git add . ; git commit -m "Agente Foundry"`

\---

## Paso 6 — Publicar en Azure (≈ 1 día) (SIGUE ESTO)

> Orden recomendado: \*\*6.1 → 6.2 → 6.3 → 6.4 → 6.5\*\*. Si te saltas uno, la app falla en Azure aunque funcione en tu PC.
> La base de datos es la \*\*misma\*\* en tu PC y en Azure, así que los usuarios que creaste en el Paso 3.5 ya existen en la versión publicada.

### 6.1 Identidad administrada del backend

Sirve para que el backend se conecte a Foundry y a Key Vault **sin guardar llaves**. No tiene relación con el login de los empleados.

1. **\[PORTAL]** Abre el App Service del **backend** → menú izquierdo *Settings →* **Identity**.
2. Pestaña **System assigned** → Status **On** → **Save** → **Yes**.
3. Ve al recurso **Foundry** → **Access control (IAM)** → **+ Add role assignment** → rol **Foundry User** (o *Azure AI User*) → **Next**.
4. *Assign access to:* **Managed identity** → **+ Select members** → *Managed identity:* **App Service** → elige tu backend → **Select** → **Review + assign**.

### 6.2 Key Vault para los secretos

1. **\[PORTAL]** Busca **Key vaults** → **+ Create**:

   * Resource group: el tuyo · Name: `kv-rioclaro-<iniciales>` · Region: la misma de tus App Services · Pricing tier: **Standard**
   * Pestaña *Access configuration*: **Azure role-based access control** (recomendado)
   * **Review + create → Create**.
2. En el Key Vault → **Access control (IAM)** → agrega dos asignaciones:

   * **Key Vault Secrets Officer** → *User* → **tu cuenta** (para crear secretos).
   * **Key Vault Secrets User** → *Managed identity* → *App Service* → **tu backend** (para leerlos).



📸 Toma una captura: es evidencia de Privacidad y seguridad para la entrega.



3. Espera 1-2 min → menú *Objects →* **Secrets** → **+ Generate/Import** y crea **dos** secretos:

|Name|Secret value|
|-|-|
|`PG-PASSWORD`|Tu contraseña de PostgreSQL|
|`JWT-SECRET`|El mismo valor de `JWT\_SECRET` de tu `backend/.env`|

> Si usas un `JWT-SECRET` distinto al de tu PC no pasa nada malo: solo los tokens creados en tu PC no servirán en Azure (y viceversa). Usar el mismo te evita confusiones.

### 6.3 Configurar el App Service del backend (SIGUE ESTO)

1. **\[PORTAL]** Backend → *Settings →* **Environment variables** → pestaña **App settings** → **+ Add** por cada variable:

|Name|Value|
|-|-|
|`PGHOST`|`<PG\_SERVIDOR>`|
|`PGUSER`|`<PG\_USUARIO>`|
|`PGPASSWORD`|`@Microsoft.KeyVault(VaultName=kv-rioclaro-CRG;SecretName=PG-PASSWORD)`|
|`PGDATABASE`|`rioclaro`|
|`JWT\_SECRET`|`@Microsoft.KeyVault(VaultName=kv-rioclaro-CRG;SecretName=JWT-SECRET)`|
|`FRONTEND\_URL`|`https://<APP\_FRONTEND>.azurewebsites.net`|
|`FOUNDRY\_PROJECT\_ENDPOINT`|`<FOUNDRY\_ENDPOINT>`|
|`MODEL\_DEPLOYMENT`|`gpt-4.1-mini`|
|`AGENT\_NAME`|`asistente-rioclaro`|
|`AGENTE\_HABILITADO`|`true`|
|`SCM\_DO\_BUILD\_DURING\_DEPLOYMENT`|`true`|

**Apply → Confirm.** (No agregues `PORT`: Azure la pone sola.)
✔ En las filas de `PGPASSWORD` y `JWT\_SECRET` debe aparecer una **palomita verde "Key vault Reference"**. Si sale una cruz roja, revisa el rol del paso 6.2. 📸 Captura.
2. *Settings →* **Configuration** → pestaña **General settings** (o *Stack settings*):

* Stack: **Node** · Version: **Node 22 LTS**
* **Startup Command:** `npm start`
* **Save**.

### 6.4 Desplegar el backend desde VS Code

1. **\[VS CODE]** Ícono de **Azure** → sección *Resources* → tu suscripción → **App Services** → clic derecho en tu backend → **Deploy to Web App…**
2. Cuando pregunte la carpeta, elige **`backend`** (no la raíz).
3. Confirma **Deploy**. Abajo a la derecha verás el progreso (2-5 min).
4. **\[NAVEGADOR]** `https://<APP\_BACKEND>.azurewebsites.net/api/salud` → `{"ok":true}`.
5. **\[TERMINAL]** prueba el login publicado:

```powershell
   Invoke-RestMethod -Method Post -Uri https://<APP\_BACKEND>.azurewebsites.net/api/auth/login `
     -ContentType "application/json" -Body '{"usuario":"carlos","password":"<su contraseña>"}'
   ```

> \*\*Si falla:\*\* \*\*\[PORTAL]\*\* backend → \*Monitoring →\* \*\*Log stream\*\* muestra los errores en vivo. Copia el error y pégalo en Claude.

### 6.5 Desplegar el frontend

1. **\[TERMINAL]** (en `frontend`)

```powershell
   npm run build
   ```

   Se crea la carpeta `frontend/dist` usando `.env.production`.

2. **\[PORTAL]** App Service del **frontend** → *Settings →* **Configuration** → *General settings*:

   * Stack: **Node 22 LTS**
   * **Startup Command:** `pm2 serve /home/site/wwwroot --no-daemon --spa`
   * **Save**.
3. **\[VS CODE]** Azure → App Services → clic derecho en el **frontend** → **Deploy to Web App…** → elige la carpeta **`frontend/dist`**.
4. **\[NAVEGADOR]** `https://<APP\_FRONTEND>.azurewebsites.net` → inicia sesión.

> Si la app carga pero el login o los datos fallan con un error de \*\*CORS\*\* (lo ves con `F12 → Console`), revisa que `FRONTEND\_URL` del backend sea exactamente la URL del frontend, con `https://` y sin `/` al final.

### 6.6 Botones de apagado (para Carlos)

**\[CLAUDE]**

> \*En la página Admin agrega una tarjeta "Asistente IA" que muestre si está habilitado (agrega GET /api/agente/estado) y un texto con las instrucciones para apagarlo desde el portal.\*

* **Apagar solo la IA:** **\[PORTAL]** backend → *Environment variables* → `AGENTE\_HABILITADO` = `false` → **Apply** (la app se reinicia sola en \~1 min).
* **Quitar el acceso a una persona:** **\[NAVEGADOR]** app → Admin → **Desactivar** (se corta de inmediato).
* **Apagar todo:** **\[PORTAL]** App Service → **Stop**.

**\[TERMINAL]** `git add . ; git commit -m "Despliegue en Azure"`

\---

## Paso 7 — Pruebas finales y capturas (≈ medio día)

### 7.1 Prepara al usuario del docente

1. **\[NAVEGADOR]** Ventana **InPrivate** (`Ctrl + Shift + N` en Edge) → URL del frontend → entra como `revisor` con su contraseña temporal.
2. Cámbiala por una contraseña **definitiva** que pondrás en tu documento de entrega (no uses una que utilices en otros sitios).
3. Recorre la app como lo haría el docente.

### 7.2 Lista de capturas 📸

|#|Qué capturar|Dónde|
|-|-|-|
|1|Pantalla de login|App|
|2|Cambio de contraseña obligatorio en el primer acceso|App|
|3|Pantalla Admin con usuarios, roles y uno desactivado|App (como `carlos`)|
|4|Tabla `usuarios` con `password\_hash` (sin contraseñas visibles)|\[VS CODE] PostgreSQL|
|5|Catálogo buscando "cloro litro" (aparecen los alias)|App|
|6|Existencias con productos bajo mínimo en rojo|App|
|7|Detalle de pedido con línea de tiempo|App|
|8|Seguimientos con semáforo|App|
|9|Chat: existencia con "Fuente:"|App (también en vista celular: F12 → ícono de celular)|
|10|Chat: el agente pide confirmación antes de registrar|App|
|11|Chat: "no encontré" ante un producto inexistente|App|
|12|Bodega sin permiso para registrar queja|App|
|13|Deployment del modelo con filtro de contenido|\[FOUNDRY]|
|14|Agente con sus 3 herramientas|\[FOUNDRY] Agents|
|15|`PGPASSWORD` y `JWT\_SECRET` con palomita de Key Vault|\[PORTAL] backend → Environment variables|
|16|Identity del backend activa y su rol en Foundry|\[PORTAL]|
|17|Asistente apagado (`AGENTE\_HABILITADO=false`)|App|
|18|Costo acumulado|\[PORTAL] Cost Management → Cost analysis|

### 7.3 Redactar el Markdown de entrega

**\[CLAUDE]**

> \*Con base en docs/RioClaro\_Conecta\_Definicion\_Arquitectura\_Plan.md, crea docs/ENTREGA.md para el docente: problema, solución, arquitectura (diagramas Mermaid), cómo entrar (URL, usuario revisor y su contraseña: la escribo yo después, deja el marcador), recorrido con capturas (deja marcadores !\[](capturas/01-login.png) etc. según la lista del Paso 7.2 de la guía), tabla de IA responsable con evidencia, costos y siguiente fase. Tono claro y profesional.\*

Guarda tus capturas en `docs/capturas/` con los nombres que usó Claude, y escribe tú la contraseña del revisor en `ENTREGA.md`.

\---

## Paso 8 — Problemas comunes

|Síntoma|Causa probable|Solución|
|-|-|-|
|`npm` no se reconoce|Node no está en el PATH|Cierra y vuelve a abrir VS Code; `node -v` debe mostrar v22|
|PowerShell: "la ejecución de scripts está deshabilitada"|Política de ejecución de Windows|`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`|
|`ECONNREFUSED` o *timeout* a PostgreSQL|Servidor detenido o IP no permitida|\[PORTAL] Start + Networking → agrega tu IP (cambia si cambias de red)|
|`no pg\_hba.conf entry` / error SSL|Conexión sin SSL|`ssl: true` en `db.js`; SSL mode = require en la extensión|
|`crear-usuario.mjs`: *duplicate key*|El usuario ya existe|Usa otro nombre o reinicia su contraseña desde Admin|
|"Usuario o contraseña incorrectos" con la contraseña correcta|Usuario desactivado o escrito con mayúsculas/espacios|Revisa `activo` en la tabla; el usuario se guarda en minúsculas|
|"Too many requests" (429) al hacer login|Límite de 10 intentos en 15 min|Espera 15 minutos o reinicia el backend en tu PC|
|Error al arrancar: *"Zero-length key is not supported"* o similar|Falta `JWT\_SECRET`|Revisa `backend/.env` o la variable en Azure (palomita de Key Vault)|
|401 en todo justo después de publicar|Token creado con otro `JWT\_SECRET` o expirado|Cierra sesión y vuelve a entrar|
|403 "Sin permiso"|El rol del usuario no tiene acceso|Cámbialo en Admin; cierra sesión y vuelve a entrar (el rol va dentro del token)|
|Error de CORS en la consola del navegador|`FRONTEND\_URL` incorrecta|Paso 6.3|
|Foundry: `PermissionDenied`|Falta rol o no ha propagado|Pasos 5.3 / 6.1, espera unos minutos|
|El agente responde sin usar datos|Instrucciones o descripciones vagas|Mejora las descripciones en `herramientas.js` y vuelve a correr `crear-agente.mjs`|
|La app en Azure muestra "Application Error"|Falla al arrancar|\[PORTAL] *Log stream*; revisa el Startup Command y las variables|
|Página en blanco al recargar una ruta del frontend|Falta `--spa`|Startup command del Paso 6.5|

\---

## Paso 9 — Cuidar el crédito (40 USD)

* **Cada día al terminar:** \[PORTAL] PostgreSQL → **Stop**.
* **Una vez por semana:** \[PORTAL] *Cost Management → Cost analysis*, filtra por tu grupo de recursos.
* **No crees** recursos que no estén en esta guía (AI Search, Cosmos DB, contenedores, Application Insights).
* **Después de la calificación:** borra el recurso Foundry y el Key Vault, y detén o elimina PostgreSQL.

\---

### Resumen de cuándo usar cada herramienta

|Necesito…|Herramienta|
|-|-|
|Crear o editar código|**\[CLAUDE]**, revisando cada cambio en **\[VS CODE]**|
|Instalar paquetes, correr la app, Git, `az login`, crear el agente, crear usuarios iniciales, probar el login|**\[TERMINAL]**|
|Ejecutar SQL y revisar tablas|**\[VS CODE]** extensión PostgreSQL|
|Dar de alta, desactivar o cambiar el rol de empleados|**\[NAVEGADOR]** app → Admin (como `carlos`)|
|Modelo, agente, playground|**\[FOUNDRY]**|
|Firewall de BD, identidad, permisos (IAM), Key Vault, variables, logs, costos|**\[PORTAL]**|
|Publicar backend y frontend|**\[VS CODE]** extensión Azure App Service|
|Probar como usuario final|**\[NAVEGADOR]** en ventana InPrivate|



