// Manejo de la sesión en el frontend.
// - AuthProvider: guarda quién inició sesión y lo comparte con toda la app.
// - useAuth(): hook para usar login, logout y el usuario actual desde cualquier página.
// - RutaProtegida: deja pasar solo a usuarios con sesión y con un rol permitido.
//
// El token y el usuario se guardan en sessionStorage: se borran al cerrar el navegador.
// La contraseña NUNCA se guarda; solo se envía una vez al backend al iniciar sesión.
import { createContext, useContext, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../api.js";

const AuthContext = createContext(null);

// Lee el usuario guardado (por si se recarga la página). Si no hay o está dañado, regresa null.
function leerUsuarioGuardado() {
  try {
    if (!sessionStorage.getItem("token")) return null;
    return JSON.parse(sessionStorage.getItem("usuario"));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);
  const navigate = useNavigate();

  // Inicia sesión. Si falla, api() lanza el error ("Usuario o contraseña incorrectos").
  async function login(nombreUsuario, password) {
    const datos = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario: nombreUsuario, password }),
    });
    sessionStorage.setItem("token", datos.token);
    sessionStorage.setItem("usuario", JSON.stringify(datos.usuario));
    setUsuario(datos.usuario);
    return datos.usuario; // la página de Login decide a dónde ir
  }

  // Cierra sesión: borra todo y regresa a /login
  function logout() {
    sessionStorage.clear();
    setUsuario(null);
    navigate("/login", { replace: true });
  }

  // Se llama después de cambiar la contraseña con éxito, para quitar la obligación
  function passwordCambiada() {
    const actualizado = { ...usuario, debeCambiarPassword: false };
    sessionStorage.setItem("usuario", JSON.stringify(actualizado));
    setUsuario(actualizado);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, passwordCambiada }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar la sesión: const { usuario, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}

// Protege rutas. Ejemplos:
//   <Route element={<RutaProtegida />}> ... </Route>                     → cualquier usuario con sesión
//   <Route element={<RutaProtegida roles={["Admin"]} />}> ... </Route>   → solo Admin
export function RutaProtegida({ roles, children }) {
  const { usuario } = useAuth();
  const location = useLocation();

  // 1. Sin sesión → al login
  if (!usuario) return <Navigate to="/login" replace />;

  // 2. Primer acceso o contraseña reiniciada → obligatorio cambiarla antes de usar la app
  if (usuario.debeCambiarPassword && location.pathname !== "/cambiar-password") {
    return <Navigate to="/cambiar-password" replace />;
  }

  // 3. Rol no permitido → aviso
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-semibold text-texto">Sin permiso</h1>
        <p className="mt-2 text-texto-suave">Tu rol ({usuario.rol}) no tiene acceso a esta sección.</p>
      </div>
    );
  }

  // 4. Todo bien → muestra la página (children) o las rutas hijas (Outlet)
  return children ?? <Outlet />;
}
