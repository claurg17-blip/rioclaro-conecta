// Página Existencias: inventario por sucursal.
// - Filtros: sucursal, búsqueda (nombre, SKU o alias) y "solo bajo mínimo".
// - Las filas por debajo del mínimo se pintan en rojo.
// - Bodega, Gerente y Admin pueden registrar movimientos (entrada, salida o ajuste).
// Usa: GET /api/sucursales, GET /api/existencias y POST /api/movimientos.
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const LIMITE = 200; // mismo límite que usa el backend
const ROLES_MOVIMIENTOS = ["Bodega", "Gerente", "Admin"]; // igual que requireRole en el backend

// Fecha corta: "27/10/26, 10:32"
const formatoFecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });

// Clave única de una fila (un producto en una sucursal)
const claveFila = (e) => `${e.producto_id}-${e.sucursal_id}`;

// Receta de Input / select / textarea con los tokens del tema
const estiloInput =
  "w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30";

export default function Existencias() {
  const { usuario } = useAuth();
  const puedeMover = ROLES_MOVIMIENTOS.includes(usuario.rol);

  const [sucursales, setSucursales] = useState([]);
  const [sucursal, setSucursal] = useState(""); // "" = todas
  const [busqueda, setBusqueda] = useState("");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);

  const [existencias, setExistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(""); // mensaje de éxito después de un movimiento

  const [filaMovimiento, setFilaMovimiento] = useState(null); // fila elegida para el formulario

  // Cargar la lista de sucursales una sola vez (para el filtro)
  useEffect(() => {
    api("/api/sucursales")
      .then((datos) => setSucursales(datos ?? []))
      .catch((err) => setError(err.message));
  }, []);

  // Buscar existencias cada vez que cambia un filtro (esperando 300 ms a que dejen de escribir)
  useEffect(() => {
    let cancelada = false; // ignora respuestas de búsquedas viejas

    const espera = setTimeout(async () => {
      setCargando(true);
      setError("");
      const params = new URLSearchParams({ sucursal, q: busqueda.trim() });
      if (soloBajoMinimo) params.set("bajo_minimo", "true");
      try {
        const datos = await api(`/api/existencias?${params}`);
        if (!cancelada) setExistencias(datos ?? []);
      } catch (err) {
        if (!cancelada) setError(err.message);
      } finally {
        if (!cancelada) setCargando(false);
      }
    }, 300);

    return () => {
      cancelada = true;
      clearTimeout(espera);
    };
  }, [sucursal, busqueda, soloBajoMinimo]);

  // Después de guardar un movimiento: actualiza solo esa fila con la existencia nueva
  function movimientoGuardado(fila, existenciaNueva) {
    setExistencias((lista) =>
      lista.map((e) => (claveFila(e) === claveFila(fila) ? { ...e, ...existenciaNueva } : e)));
    setAviso(`Movimiento registrado: ${fila.nombre} (${fila.sucursal}) ahora tiene ${existenciaNueva.cantidad}.`);
    setFilaMovimiento(null);
  }

  // Botón para abrir el formulario de movimiento de una fila
  function BotonMovimiento({ fila }) {
    if (!puedeMover) return null;
    return (
      <button
        onClick={() => { setAviso(""); setFilaMovimiento(fila); }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borde bg-superficie-2 px-3 py-1.5 text-sm font-medium text-texto transition-colors hover:border-acento/50"
      >
        <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
        Movimiento
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-texto">Existencias</h1>

      {/* ===== Filtros ===== */}
      <div className="grid gap-3 md:grid-cols-3">
        <select
          aria-label="Sucursal"
          value={sucursal}
          onChange={(e) => setSucursal(e.target.value)}
          className={estiloInput}
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        {/* Buscador con lupa: "relative" para colocar la lupa encima; pl-9 deja su espacio */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar producto, SKU o alias"
            aria-label="Buscar producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${estiloInput} pl-9`}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-suave">
          {/* accent-acento: la palomita de la casilla toma el color de acento */}
          <input
            type="checkbox"
            checked={soloBajoMinimo}
            onChange={(e) => setSoloBajoMinimo(e.target.checked)}
            className="size-4 accent-acento"
          />
          Solo bajo mínimo
        </label>
      </div>

      {/* ===== Mensajes ===== */}
      {aviso && (
        <p role="status" className="rounded-lg border border-exito/30 bg-exito/10 px-3 py-2 text-sm text-exito">{aviso}</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
      )}
      {!error && (
        <p className="text-sm text-texto-suave" aria-live="polite">
          {cargando
            ? "Buscando..."
            : existencias.length === 0
              ? "No hay existencias con estos filtros."
              : existencias.length === LIMITE
                ? `Mostrando las primeras ${LIMITE}. Usa los filtros para afinar.`
                : `${existencias.length} registro(s). En rojo: por debajo del mínimo.`}
        </p>
      )}

      {/* ===== Celular: tarjetas ===== */}
      <ul className="space-y-2 md:hidden">
        {existencias.map((e) => (
          <li
            key={claveFila(e)}
            // Bajo mínimo: fondo rojo tenue y franja roja a la izquierda
            className={`rounded-xl border p-4 shadow-sm ${
              e.bajo_minimo ? "border-peligro/30 border-l-4 border-l-peligro bg-peligro/10" : "border-borde bg-superficie"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-texto">{e.nombre}</p>
                <p className="text-sm text-texto-suave">{e.sku} · {e.sucursal}</p>
                <p className={`mt-1 flex items-center gap-1.5 text-sm ${e.bajo_minimo ? "font-semibold text-peligro" : "text-texto"}`}>
                  {e.bajo_minimo && <TriangleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
                  {e.cantidad} {e.unidad} (mínimo {e.minimo}){e.bajo_minimo && " · Bajo mínimo"}
                </p>
              </div>
              <BotonMovimiento fila={e} />
            </div>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {existencias.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-2 text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 text-right font-medium">Existencia</th>
                <th className="px-4 py-3 text-right font-medium">Mínimo</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
                {puedeMover && <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {existencias.map((e) => (
                // Bajo mínimo: fila con fondo rojo tenue (la cantidad va en rojo más abajo)
                <tr key={claveFila(e)} className={`text-texto transition-colors ${
                  e.bajo_minimo ? "bg-peligro/10 hover:bg-peligro/15" : "hover:bg-superficie-2/60"
                }`}>
                  <td className="px-4 py-3">
                    {e.nombre}
                    <span className="block font-mono text-xs text-texto-suave">{e.sku}</span>
                  </td>
                  <td className="px-4 py-3">{e.sucursal}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right ${e.bajo_minimo ? "font-semibold text-peligro" : ""}`}>
                    {/* inline-block: los svg de Tailwind son "block" por defecto; así queda junto al número */}
                    {e.bajo_minimo && <TriangleAlert className="mr-1 inline-block size-4 align-[-3px]" strokeWidth={2} aria-hidden="true" />}
                    {e.cantidad} {e.unidad}
                  </td>
                  <td className="px-4 py-3 text-right text-texto-suave">{e.minimo}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-texto-suave">
                    {e.actualizado_en ? formatoFecha.format(new Date(e.actualizado_en)) : "—"}
                  </td>
                  {puedeMover && (
                    <td className="px-4 py-3 text-right"><BotonMovimiento fila={e} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Formulario de movimiento (ventana encima de la página) ===== */}
      {filaMovimiento && (
        <FormularioMovimiento
          fila={filaMovimiento}
          onCancelar={() => setFilaMovimiento(null)}
          onGuardado={movimientoGuardado}
        />
      )}
    </div>
  );
}

// Ventana para registrar una entrada, salida o ajuste de UNA fila (producto + sucursal).
// En celular sale desde abajo; en escritorio aparece centrada.
function FormularioMovimiento({ fila, onCancelar, onGuardado }) {
  const [tipo, setTipo] = useState("entrada");
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError("");

    // Validaciones rápidas (el backend vuelve a validar)
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n === 0) return setError("La cantidad debe ser un número entero distinto de 0");
    if (tipo !== "ajuste" && n < 0) return setError("En entradas y salidas la cantidad debe ser positiva");
    if (tipo === "salida" && n > fila.cantidad) return setError(`No hay suficiente existencia. Disponible: ${fila.cantidad}`);
    if (tipo === "ajuste" && !nota.trim()) return setError("Explica el motivo del ajuste en la nota");

    setEnviando(true);
    try {
      const datos = await api("/api/movimientos", {
        method: "POST",
        body: JSON.stringify({
          producto_id: fila.producto_id,
          sucursal_id: fila.sucursal_id,
          tipo,
          cantidad: n,
          nota: nota.trim(),
        }),
      });
      onGuardado(fila, datos.existencia);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div
      // Fondo oscuro semitransparente detrás de la ventana
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-movimiento"
    >
      {/* La ventana: panel sólido con borde sutil */}
      <form onSubmit={guardar} className="w-full max-w-md space-y-4 rounded-t-2xl border border-borde bg-superficie p-6 text-texto shadow-sm sm:rounded-2xl">
        <div>
          <h2 id="titulo-movimiento" className="text-lg font-bold text-texto">Registrar movimiento</h2>
          <p className="text-sm text-texto-suave">
            {fila.nombre} · {fila.sucursal} · Existencia actual: <strong className="text-texto">{fila.cantidad}</strong>
          </p>
        </div>

        {/* Tipo de movimiento: cada opción es un botón con ícono.
            has-focus-visible: muestra un anillo al llegar con el teclado (el radio está oculto con sr-only) */}
        <fieldset>
          <legend className="text-sm font-medium text-texto-suave">Tipo</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {["entrada", "salida", "ajuste"].map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-center text-sm capitalize transition-colors has-focus-visible:ring-2 has-focus-visible:ring-acento/30 ${
                  tipo === t
                    ? "border-acento bg-acento/10 font-medium text-acento"
                    : "border-borde bg-superficie-2 text-texto-suave hover:text-texto"
                }`}
              >
                <input type="radio" name="tipo" value={t} checked={tipo === t}
                  onChange={() => setTipo(t)} className="sr-only" />
                {/* Ícono según el tipo: entrada ↓, salida ↑, ajuste (deslizadores) */}
                {t === "entrada" && <ArrowDownToLine className="size-4" strokeWidth={2} aria-hidden="true" />}
                {t === "salida" && <ArrowUpFromLine className="size-4" strokeWidth={2} aria-hidden="true" />}
                {t === "ajuste" && <SlidersHorizontal className="size-4" strokeWidth={2} aria-hidden="true" />}
                {t}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="cantidad" className="block text-sm font-medium text-texto-suave">Cantidad</label>
          <input id="cantidad" type="number" inputMode="numeric" step="1" required autoFocus
            min={tipo === "ajuste" ? undefined : 1}
            value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={`mt-1 ${estiloInput}`} />
          {tipo === "ajuste" && (
            <p className="mt-1 text-xs text-texto-suave">Usa número negativo para restar (ej. -3) o positivo para sumar.</p>
          )}
        </div>

        <div>
          <label htmlFor="nota" className="block text-sm font-medium text-texto-suave">
            Nota {tipo === "ajuste" ? "(obligatoria)" : "(opcional)"}
          </label>
          <textarea id="nota" rows={2} required={tipo === "ajuste"}
            value={nota} onChange={(e) => setNota(e.target.value)} className={`mt-1 ${estiloInput}`} />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
        )}

        <div className="flex gap-2">
          {/* Botón secundario */}
          <button type="button" onClick={onCancelar}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-borde bg-superficie-2 px-4 py-2.5 text-texto transition-colors hover:border-acento/50">
            Cancelar
          </button>
          {/* Botón primario */}
          <button type="submit" disabled={enviando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento">
            {enviando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
