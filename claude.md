```markdown
# Proyecto: Río Claro Conecta
Diseño completo en docs/RioClaro_Conecta_Definicion_Arquitectura_Plan.md (léelo antes de proponer cambios).

## Stack (no cambiar)
- Backend: Node.js 22, Express 5, ES Modules ("type": "module"), pg, jose, bcryptjs, express-rate-limit, @azure/ai-projects 2.x, @azure/identity
- Base de datos: Azure Database for PostgreSQL (SQL plano con pg, sin ORM)
- Frontend: React 19, Vite 8, Tailwind CSS 4 (plugin @tailwindcss/vite), react-router
- Autenticación: PROPIA. Usuarios en la tabla `usuarios` de PostgreSQL, contraseñas con bcryptjs,
  sesión con JWT (HS256, 8 h) firmado con JWT_SECRET. Roles en la columna `rol`: Admin, Gerente, Ventas, Bodega.
  NO usar Entra ID ni MSAL para el login.
- IA: agente de Microsoft Foundry con function calling; el backend ejecuta las herramientas

## Reglas
- Soy principiante: explica brevemente cada archivo que crees.
- Código simple y comentado en español. Nada de TypeScript.
- Nunca escribas secretos en el código; usa variables de entorno (.env).
- Nunca guardes ni muestres contraseñas en texto plano ni las escribas en logs.
- Sistema operativo Windows, terminal PowerShell.
- Haz un solo archivo o función a la vez y espera mi confirmación.
