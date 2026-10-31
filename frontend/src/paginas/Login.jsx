// Página de inicio de sesión.
// Diseño mobile-first: en celular ocupa todo el ancho; en pantallas grandes se centra una tarjeta.
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Droplets, Lock, LogIn, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import ThemeToggle from "../componentes/ThemeToggle.jsx";

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
    // relative: permite colocar el botón de tema (arriba a la derecha) y el pie (abajo) con absolute.
    // py-14: deja espacio arriba y abajo para que la tarjeta no los tape en pantallas bajas.
    <main className="relative min-h-screen flex items-center justify-center bg-fondo px-4 py-14">
      {/* Botón de tema (oscuro / claro) en la esquina superior derecha */}
      <ThemeToggle className="absolute right-4 top-4" />

      {/* Tarjeta: fondo superficie, borde sutil y esquinas redondeadas */}
      <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm sm:p-8">
        <h1 className="flex flex-col items-center gap-3 text-center text-2xl font-bold text-texto sm:text-3xl">
          {/* Logo: gota de agua en un cuadro con el color de acento */}
          <Droplets className="size-12 rounded-xl bg-acento/10 p-2.5 text-acento" strokeWidth={2} aria-hidden="true" />
          Río Claro Distribuidora
        </h1>
        <p className="mt-1 text-center text-texto-suave">Inicia sesión para continuar</p>

        <form onSubmit={entrar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="usuario" className="flex items-center gap-1.5 text-sm font-medium text-texto-suave">
              <User className="size-4" strokeWidth={2} aria-hidden="true" />
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium text-texto-suave">
              <Lock className="size-4" strokeWidth={2} aria-hidden="true" />
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30"
            />
          </div>

          {/* Mensaje de error (solo aparece si hay uno) */}
          {error && (
            <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}

          {/* Botón primario: color de acento; justify-center centra ícono y texto */}
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            <LogIn className="size-4" strokeWidth={2} aria-hidden="true" />
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      {/* Pie de página: créditos, abajo y centrado, en texto pequeño y suave */}
      <footer className="absolute inset-x-0 bottom-4 px-4 text-center text-xs text-texto-suave">
        © 2026 Río Claro · Desarrollado por Claudia Rosales Gutiérrez
      </footer>
    </main>
  );
}
