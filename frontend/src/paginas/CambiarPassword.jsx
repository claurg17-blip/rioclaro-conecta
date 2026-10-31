// Página para cambiar la contraseña.
// Es obligatoria en el primer acceso (o después de que Admin la reinicie):
// RutaProtegida no deja ir a otra pantalla mientras debeCambiarPassword sea true.
import { useState } from "react";
import { useNavigate } from "react-router";
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

  // Mismo estilo para los tres campos
  const estiloInput =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-center text-blue-700">Cambiar contraseña</h1>
        {usuario?.debeCambiarPassword && (
          <p className="mt-2 text-center text-sm text-slate-600">
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
          </p>
        )}

        <form onSubmit={guardar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="actual" className="block text-sm font-medium text-slate-700">Contraseña actual</label>
            <input id="actual" type="password" autoComplete="current-password" required
              value={actual} onChange={(e) => setActual(e.target.value)} className={estiloInput} />
          </div>

          <div>
            <label htmlFor="nueva" className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
            <input id="nueva" type="password" autoComplete="new-password" required minLength={MINIMO}
              value={nueva} onChange={(e) => setNueva(e.target.value)} className={estiloInput} />
            <p className="mt-1 text-xs text-slate-500">Mínimo {MINIMO} caracteres.</p>
          </div>

          <div>
            <label htmlFor="confirmar" className="block text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
            <input id="confirmar" type="password" autoComplete="new-password" required
              value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={estiloInput} />
          </div>

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
            {enviando ? "Guardando..." : "Guardar"}
          </button>

          {/* Por si la persona prefiere salir sin cambiarla */}
          <button type="button" onClick={logout} className="w-full py-2 text-sm text-slate-600 hover:text-slate-800">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
