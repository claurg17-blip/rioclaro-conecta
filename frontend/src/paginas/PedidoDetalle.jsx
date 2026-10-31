// Página Detalle de pedido (/pedidos/RC-0001):
// datos del pedido y del cliente, productos, línea de tiempo de eventos y botón para cambiar el estado.
// Usa: GET /api/pedidos/:folio y PATCH /api/pedidos/:folio/estado
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EstadoPedido, FechaCompromiso } from "./Pedidos.jsx";

// Siguiente paso de cada estado (mismas reglas que el backend). Entregado y Cancelado son finales.
const SIGUIENTE = { Recibido: "Surtido", Surtido: "Enviado", Enviado: "Entregado" };
const ESTADOS_BODEGA = ["Surtido", "Enviado"]; // Bodega solo puede marcar estos

const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const pesos = (n) => (n == null ? "—" : formatoPesos.format(n));
const formatoFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

export default function PedidoDetalle() {
  const { folio } = useParams(); // el folio viene en la dirección
  const { usuario } = useAuth();

  // Guardamos la respuesta junto con el folio que la pidió; si no coincide, está cargando
  const [resultado, setResultado] = useState({ folio: null, pedido: null, error: "" });
  const cargando = resultado.folio !== folio;
  const { pedido, error } = resultado;

  const [cambio, setCambio] = useState(null); // estado al que se quiere cambiar (abre la confirmación)
  const [nota, setNota] = useState("");
  const [errorCambio, setErrorCambio] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Cargar el detalle cada vez que cambia el folio
  useEffect(() => {
    let cancelada = false;
    api(`/api/pedidos/${encodeURIComponent(folio)}`)
      .then((datos) => { if (!cancelada) setResultado({ folio, pedido: datos, error: "" }); })
      .catch((err) => { if (!cancelada) setResultado({ folio, pedido: null, error: err.message }); });
    return () => { cancelada = true; };
  }, [folio]);

  // ¿Qué botones ve este usuario? (mismas reglas que el backend)
  const siguiente = pedido ? SIGUIENTE[pedido.estado] : undefined;
  const puedeAvanzar =
    siguiente && (usuario.rol === "Gerente" || (usuario.rol === "Bodega" && ESTADOS_BODEGA.includes(siguiente)));
  const puedeCancelar = usuario.rol === "Gerente" && pedido && !["Entregado", "Cancelado"].includes(pedido.estado);

  function abrirCambio(estadoNuevo) {
    setCambio(estadoNuevo);
    setNota("");
    setErrorCambio("");
  }

  async function confirmarCambio(e) {
    e.preventDefault();
    setErrorCambio("");
    setEnviando(true);
    try {
      // El backend responde con el detalle actualizado (ya incluye el nuevo evento)
      const datos = await api(`/api/pedidos/${encodeURIComponent(folio)}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: cambio, nota: nota.trim() }),
      });
      setResultado({ folio, pedido: datos, error: "" });
      setCambio(null);
    } catch (err) {
      setErrorCambio(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const enlaceRegresar = (
    <Link to="/pedidos" className="text-sm text-blue-700 hover:underline">← Pedidos</Link>
  );

  if (cargando) return <div className="space-y-4">{enlaceRegresar}<p className="text-slate-500">Cargando...</p></div>;
  if (error) {
    return (
      <div className="space-y-4">
        {enlaceRegresar}
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enlaceRegresar}

      {/* ===== Encabezado ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{pedido.folio}</h1>
        <EstadoPedido estado={pedido.estado} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ===== Datos del pedido y del cliente ===== */}
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="font-semibold text-slate-800">Datos</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Cliente</dt>
            <dd className="text-slate-800">{pedido.cliente ?? "—"}{pedido.tipo_cliente && ` (${pedido.tipo_cliente})`}</dd>
            <dt className="text-slate-500">Teléfono</dt>
            <dd>
              {pedido.telefono
                ? <a href={`tel:${pedido.telefono}`} className="text-blue-700 hover:underline">{pedido.telefono}</a>
                : "—"}
            </dd>
            <dt className="text-slate-500">Correo</dt>
            <dd className="truncate">
              {pedido.email
                ? <a href={`mailto:${pedido.email}`} className="text-blue-700 hover:underline">{pedido.email}</a>
                : "—"}
            </dd>
            <dt className="text-slate-500">Sucursal</dt>
            <dd className="text-slate-800">{pedido.sucursal ?? "—"}</dd>
            <dt className="text-slate-500">Compromiso</dt>
            <dd className="text-slate-800"><FechaCompromiso fecha={pedido.fecha_compromiso} /></dd>
            <dt className="text-slate-500">Creado</dt>
            <dd className="text-slate-800">{formatoFechaHora.format(new Date(pedido.creado_en))}</dd>
          </dl>
        </section>

        {/* ===== Cambiar estado ===== */}
        {(puedeAvanzar || puedeCancelar) && (
          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold text-slate-800">Cambiar estado</h2>

            {!cambio ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {puedeAvanzar && (
                  <button onClick={() => abrirCambio(siguiente)}
                    className="flex-1 rounded-lg bg-blue-700 py-2.5 font-semibold text-white hover:bg-blue-800">
                    Marcar como {siguiente}
                  </button>
                )}
                {puedeCancelar && (
                  <button onClick={() => abrirCambio("Cancelado")}
                    className="flex-1 rounded-lg border border-red-300 py-2.5 font-medium text-red-700 hover:bg-red-50">
                    Cancelar pedido
                  </button>
                )}
              </div>
            ) : (
              // Confirmación con nota opcional (queda en la línea de tiempo)
              <form onSubmit={confirmarCambio} className="mt-3 space-y-3">
                <p className="text-sm text-slate-700">
                  ¿Cambiar <strong>{pedido.folio}</strong> de {pedido.estado} a <strong>{cambio}</strong>?
                </p>
                <div>
                  <label htmlFor="nota" className="block text-sm font-medium text-slate-700">Nota (opcional)</label>
                  <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)}
                    placeholder={cambio === "Cancelado" ? "Motivo de la cancelación" : "Ej. salió en la camioneta 2"}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                {errorCambio && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorCambio}</p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCambio(null)}
                    className="flex-1 rounded-lg border border-slate-300 py-2.5 text-slate-700 hover:bg-slate-50">
                    Volver
                  </button>
                  <button type="submit" disabled={enviando}
                    className={`flex-1 rounded-lg py-2.5 font-semibold text-white disabled:opacity-60 ${
                      cambio === "Cancelado" ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"
                    }`}>
                    {enviando ? "Guardando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>

      {/* ===== Productos ===== */}
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold text-slate-800">Productos</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {pedido.productos.map((p) => (
            <li key={p.producto_id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="text-slate-800">{p.nombre}</p>
                <p className="text-slate-500">{p.sku} · {p.cantidad} {p.unidad} × {pesos(p.precio)}</p>
              </div>
              <p className="shrink-0 font-medium text-slate-800">{pesos(p.subtotal)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-800">
          <span>Total</span>
          <span>{pesos(pedido.total)}</span>
        </p>
      </section>

      {/* ===== Línea de tiempo ===== */}
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold text-slate-800">Línea de tiempo</h2>
        {pedido.eventos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin eventos registrados.</p>
        ) : (
          <ol className="mt-3 space-y-4 border-l-2 border-slate-200 pl-4">
            {pedido.eventos.map((ev) => (
              <li key={ev.id} className="relative">
                {/* Punto sobre la línea */}
                <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoPedido estado={ev.estado} />
                  <span className="text-xs text-slate-500">{formatoFechaHora.format(new Date(ev.creado_en))}</span>
                </div>
                {ev.nota && <p className="mt-1 text-sm text-slate-700">{ev.nota}</p>}
                <p className="text-xs text-slate-500">{ev.usuario ?? "Usuario desconocido"}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
