// Página para cambiar la contraseña.
// Es obligatoria en el primer acceso (o después de que Admin la reinicie):
// RutaProtegida no deja ir a otra pantalla mientras debeCambiarPassword sea true.
import { useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, Lock, LogOut } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const MINIMO = 8; // mismo mínimo que valida el backend

export default function CambiarPassword() {
  const { usuario, logout, passwordCambiada } = useAuth();
  const navigate = useNavigate();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError("");

    // Validaciones rápidas antes de llamar al backend (el backend vuelve a validar)
    if (nueva.length < MINIMO) return setError(`La nueva contraseña debe tener al menos ${MINIMO} caracteres`);
    if (nueva !== confirmar) return setError("La confirmación no coincide con la nueva contraseña");
    if (nueva === actual) return setError("La nueva contraseña debe ser diferente a la actual");

    setEnviando(true);
    try {
      await api("/api/auth/cambiar-password", {
        method: "POST",
        body: JSON.stringify({ actual, nueva }),
      });
      passwordCambiada(); // quita la obligación de cambiarla
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message); // p. ej. "La contraseña actual no coincide"
    } finally {
      setEnviando(false);
    }
  }

  // Mismo estilo para los tres campos (receta de Input con los tokens del tema)
  const estiloInput =
    "mt-1 w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30";

  // Mismo estilo para las tres etiquetas (con ícono de candado a la izquierda)
  const estiloEtiqueta = "flex items-center gap-1.5 text-sm font-medium text-texto-suave";

  return (
    <main className="min-h-screen flex items-center justify-center bg-fondo px-4">
      {/* Tarjeta: fondo superficie, borde sutil y esquinas redondeadas */}
      <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm sm:p-8">
        <h1 className="flex flex-col items-center gap-3 text-center text-2xl font-bold text-texto">
          {/* Ícono de llave en un cuadro con el color de acento */}
          <KeyRound className="size-12 rounded-xl bg-acento/10 p-2.5 text-acento" strokeWidth={2} aria-hidden="true" />
          Cambiar contraseña
        </h1>
        {usuario?.debeCambiarPassword && (
          <p className="mt-2 text-center text-sm text-texto-suave">
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
          </p>
        )}

        <form onSubmit={guardar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="actual" className={estiloEtiqueta}>
              <Lock className="size-4" strokeWidth={2} aria-hidden="true" />
              Contraseña actual
            </label>
            <input id="actual" type="password" autoComplete="current-password" required
              value={actual} onChange={(e) => setActual(e.target.value)} className={estiloInput} />
          </div>

          <div>
            <label htmlFor="nueva" className={estiloEtiqueta}>
              <Lock className="size-4" strokeWidth={2} aria-hidden="true" />
              Nueva contraseña
            </label>
            <input id="nueva" type="password" autoComplete="new-password" required minLength={MINIMO}
              value={nueva} onChange={(e) => setNueva(e.target.value)} className={estiloInput} />
            <p className="mt-1 text-xs text-texto-suave">Mínimo {MINIMO} caracteres.</p>
          </div>

          <div>
            <label htmlFor="confirmar" className={estiloEtiqueta}>
              <Lock className="size-4" strokeWidth={2} aria-hidden="true" />
              Confirmar nueva contraseña
            </label>
            <input id="confirmar" type="password" autoComplete="new-password" required
              value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={estiloInput} />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}

          {/* Botón primario: color de acento */}
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            <KeyRound className="size-4" strokeWidth={2} aria-hidden="true" />
            {enviando ? "Guardando..." : "Guardar"}
          </button>

          {/* Por si la persona prefiere salir sin cambiarla */}
          <button
            type="button"
            onClick={logout}
            className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm text-texto-suave transition-colors hover:text-texto"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
