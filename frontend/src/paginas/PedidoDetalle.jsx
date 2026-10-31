// Página Detalle de pedido (/pedidos/RC-0001):
// datos del pedido y del cliente, productos, línea de tiempo de eventos y botón para cambiar el estado.
// Usa: GET /api/pedidos/:folio y PATCH /api/pedidos/:folio/estado
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CircleCheck, CircleX, PackageCheck, Truck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EstadoPedido, FechaCompromiso } from "./Pedidos.jsx";

// Siguiente paso de cada estado (mismas reglas que el backend). Entregado y Cancelado son finales.
const SIGUIENTE = { Recibido: "Surtido", Surtido: "Enviado", Enviado: "Entregado" };
const ESTADOS_BODEGA = ["Surtido", "Enviado"]; // Bodega solo puede marcar estos

const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const pesos = (n) => (n == null ? "—" : formatoPesos.format(n));
const formatoFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

// Ícono del botón "Marcar como ..." según el estado al que se avanza (mismos íconos que los badges)
const ICONO_SIGUIENTE = { Surtido: PackageCheck, Enviado: Truck, Entregado: CircleCheck };

// Clases de botones e input (recetas con los tokens del tema)
const estiloBotonPrimario =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento";
const estiloBotonPeligro =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-peligro/30 bg-peligro/10 px-4 py-2.5 font-medium text-peligro transition-colors hover:bg-peligro/20 disabled:opacity-50";
const estiloTarjeta = "rounded-xl border border-borde bg-superficie p-4 shadow-sm";

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

  // Ícono del botón de avanzar (si hay un siguiente estado)
  const IconoSiguiente = siguiente ? ICONO_SIGUIENTE[siguiente] : null;

  // Enlace para regresar: la flecha ahora es el ícono ArrowLeft
  const enlaceRegresar = (
    <Link to="/pedidos" className="inline-flex items-center gap-1 text-sm text-acento hover:underline">
      <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
      Pedidos
    </Link>
  );

  if (cargando) return <div className="space-y-4">{enlaceRegresar}<p className="text-texto-suave">Cargando...</p></div>;
  if (error) {
    return (
      <div className="space-y-4">
        {enlaceRegresar}
        <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enlaceRegresar}

      {/* ===== Encabezado ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-texto">{pedido.folio}</h1>
        <EstadoPedido estado={pedido.estado} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ===== Datos del pedido y del cliente ===== */}
        <section className={estiloTarjeta}>
          <h2 className="font-semibold text-texto">Datos</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-texto-suave">Cliente</dt>
            <dd className="text-texto">{pedido.cliente ?? "—"}{pedido.tipo_cliente && ` (${pedido.tipo_cliente})`}</dd>
            <dt className="text-texto-suave">Teléfono</dt>
            <dd className="text-texto">
              {pedido.telefono
                ? <a href={`tel:${pedido.telefono}`} className="text-acento hover:underline">{pedido.telefono}</a>
                : "—"}
            </dd>
            <dt className="text-texto-suave">Correo</dt>
            <dd className="truncate text-texto">
              {pedido.email
                ? <a href={`mailto:${pedido.email}`} className="text-acento hover:underline">{pedido.email}</a>
                : "—"}
            </dd>
            <dt className="text-texto-suave">Sucursal</dt>
            <dd className="text-texto">{pedido.sucursal ?? "—"}</dd>
            <dt className="text-texto-suave">Compromiso</dt>
            <dd className="text-texto"><FechaCompromiso fecha={pedido.fecha_compromiso} /></dd>
            <dt className="text-texto-suave">Creado</dt>
            <dd className="text-texto">{formatoFechaHora.format(new Date(pedido.creado_en))}</dd>
          </dl>
        </section>

        {/* ===== Cambiar estado ===== */}
        {(puedeAvanzar || puedeCancelar) && (
          <section className={estiloTarjeta}>
            <h2 className="font-semibold text-texto">Cambiar estado</h2>

            {!cambio ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {puedeAvanzar && (
                  <button onClick={() => abrirCambio(siguiente)} className={estiloBotonPrimario}>
                    {IconoSiguiente && <IconoSiguiente className="size-4" strokeWidth={2} aria-hidden="true" />}
                    Marcar como {siguiente}
                  </button>
                )}
                {puedeCancelar && (
                  <button onClick={() => abrirCambio("Cancelado")} className={estiloBotonPeligro}>
                    <CircleX className="size-4" strokeWidth={2} aria-hidden="true" />
                    Cancelar pedido
                  </button>
                )}
              </div>
            ) : (
              // Confirmación con nota opcional (queda en la línea de tiempo)
              <form onSubmit={confirmarCambio} className="mt-3 space-y-3">
                <p className="text-sm text-texto-suave">
                  ¿Cambiar <strong className="text-texto">{pedido.folio}</strong> de {pedido.estado} a <strong className="text-texto">{cambio}</strong>?
                </p>
                <div>
                  <label htmlFor="nota" className="block text-sm font-medium text-texto-suave">Nota (opcional)</label>
                  <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)}
                    placeholder={cambio === "Cancelado" ? "Motivo de la cancelación" : "Ej. salió en la camioneta 2"}
                    className="mt-1 w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30" />
                </div>
                {errorCambio && (
                  <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{errorCambio}</p>
                )}
                <div className="flex gap-2">
                  {/* Botón secundario */}
                  <button type="button" onClick={() => setCambio(null)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-borde bg-superficie-2 px-4 py-2.5 text-texto transition-colors hover:border-acento/50">
                    Volver
                  </button>
                  {/* Confirmar: rojo si es cancelación, acento si es avance */}
                  <button type="submit" disabled={enviando}
                    className={cambio === "Cancelado" ? estiloBotonPeligro : estiloBotonPrimario}>
                    {enviando ? "Guardando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>

      {/* ===== Productos ===== */}
      <section className={estiloTarjeta}>
        <h2 className="font-semibold text-texto">Productos</h2>
        <ul className="mt-2 divide-y divide-borde">
          {pedido.productos.map((p) => (
            <li key={p.producto_id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="text-texto">{p.nombre}</p>
                <p className="text-texto-suave">{p.sku} · {p.cantidad} {p.unidad} × {pesos(p.precio)}</p>
              </div>
              <p className="shrink-0 font-medium text-texto">{pesos(p.subtotal)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-borde pt-2 font-semibold text-texto">
          <span>Total</span>
          <span>{pesos(pedido.total)}</span>
        </p>
      </section>

      {/* ===== Línea de tiempo ===== */}
      <section className={estiloTarjeta}>
        <h2 className="font-semibold text-texto">Línea de tiempo</h2>
        {pedido.eventos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Sin eventos registrados.</p>
        ) : (
          <ol className="mt-3 space-y-4 border-l-2 border-borde pl-4">
            {pedido.eventos.map((ev) => (
              <li key={ev.id} className="relative">
                {/* Punto sobre la línea: color de acento con un borde del color de la tarjeta (parece "recortado") */}
                <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-superficie bg-acento" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoPedido estado={ev.estado} />
                  <span className="text-xs text-texto-suave">{formatoFechaHora.format(new Date(ev.creado_en))}</span>
                </div>
                {ev.nota && <p className="mt-1 text-sm text-texto">{ev.nota}</p>}
                <p className="text-xs text-texto-suave">{ev.usuario ?? "Usuario desconocido"}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
