// Componente principal: define qué página se muestra en cada dirección (rutas de react-router).
import { Navigate, Route, Routes } from "react-router";
import { RutaProtegida } from "./auth/AuthContext.jsx";
import Layout from "./componentes/Layout.jsx";
import { OPCIONES_MENU } from "./menu.js";
import Login from "./paginas/Login.jsx";
import CambiarPassword from "./paginas/CambiarPassword.jsx";
import Inicio from "./paginas/Inicio.jsx";
import Catalogo from "./paginas/Catalogo.jsx";
import Existencias from "./paginas/Existencias.jsx";
import Pedidos from "./paginas/Pedidos.jsx";
import PedidoDetalle from "./paginas/PedidoDetalle.jsx";
import Seguimientos from "./paginas/Seguimientos.jsx";
import Admin from "./paginas/Admin.jsx";
import Asistente from "./paginas/Asistente.jsx";

// Qué componente dibuja cada ruta del menú.
const PAGINAS = {
  "/": <Inicio />,
  "/catalogo": <Catalogo />,
  "/existencias": <Existencias />,
  "/pedidos": <Pedidos />,
  "/seguimientos": <Seguimientos />,
  "/asistente": <Asistente />,
  "/admin": <Admin />,
};

// Roles de una opción del menú (para rutas extra que no salen en el menú, como el detalle de pedido)
const rolesDe = (ruta) => OPCIONES_MENU.find((o) => o.ruta === ruta).roles;

function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Requieren sesión (cualquier rol). RutaProtegida también obliga a cambiar la contraseña temporal */}
      <Route element={<RutaProtegida />}>
        {/* Pantalla completa, sin menú */}
        <Route path="/cambiar-password" element={<CambiarPassword />} />

        {/* Páginas internas, dentro del Layout (barra superior + menú) */}
        <Route element={<Layout />}>
          {OPCIONES_MENU.map((o) => (
            // Cada ruta solo deja entrar a los roles definidos en menu.js
            <Route key={o.ruta} element={<RutaProtegida roles={o.roles} />}>
              <Route path={o.ruta} element={PAGINAS[o.ruta]} />
            </Route>
          ))}

          {/* Detalle de un pedido (/pedidos/RC-0001): mismos roles que Pedidos */}
          <Route element={<RutaProtegida roles={rolesDe("/pedidos")} />}>
            <Route path="/pedidos/:folio" element={<PedidoDetalle />} />
          </Route>
        </Route>
      </Route>

      {/* Cualquier otra dirección → inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
