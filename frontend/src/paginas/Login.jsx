// Página de inicio de sesión.
// Diseño mobile-first: en celular ocupa todo el ancho; en pantallas grandes se centra una tarjeta.
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene caso mostrar el login
  if (usuario) return <Navigate to="/" replace />;

  async function entrar(e) {
    e.preventDefault(); // evita que el formulario recargue la página
    setError("");
    setEnviando(true);
    try {
      const u = await login(nombreUsuario.trim(), password);
      // Primer acceso o contraseña reiniciada → obligatorio cambiarla
      navigate(u.debeCambiarPassword ? "/cambiar-password" : "/", { replace: true });
    } catch (err) {
      setError(err.message); // p. ej. "Usuario o contraseña incorrectos"
      setPassword(""); // limpiamos la contraseña para reintentar
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-700">Río Claro Conecta</h1>
        <p className="mt-1 text-center text-slate-500">Inicia sesión para continuar</p>

        <form onSubmit={entrar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="usuario" className="block text-sm font-medium text-slate-700">Usuario</label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Mensaje de error (solo aparece si hay uno) */}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
