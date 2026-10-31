// Página Pedidos: lista con filtros por estado y sucursal, y búsqueda por folio o cliente.
// Al tocar un pedido se abre su detalle (/pedidos/RC-0001, ver PedidoDetalle.jsx).
// Usa: GET /api/sucursales y GET /api/pedidos?estado=&sucursal=
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CircleCheck, CircleX, Clock, Inbox, PackageCheck, Search, Truck } from "lucide-react";
import { api } from "../api.js";

const ESTADOS = ["Recibido", "Surtido", "Enviado", "Entregado", "Cancelado"];
const LIMITE = 200; // mismo límite que usa el backend

// Colores de cada estado (tokens del tema; /10 = fondo tenue al 10 %)
const COLORES_ESTADO = {
  Recibido: "bg-superficie-2 text-texto-suave",
  Surtido: "bg-alerta/10 text-alerta",
  Enviado: "bg-acento/10 text-acento",
  Entregado: "bg-exito/10 text-exito",
  Cancelado: "bg-peligro/10 text-peligro",
};

// Ícono de cada estado (lucide-react)
const ICONOS_ESTADO = {
  Recibido: Inbox,
  Surtido: PackageCheck,
  Enviado: Truck,
  Entregado: CircleCheck,
  Cancelado: CircleX,
};

// Etiqueta de color con el estado del pedido (también la usa PedidoDetalle.jsx)
export function EstadoPedido({ estado }) {
  const Icono = ICONOS_ESTADO[estado]; // puede no existir si llega un estado desconocido
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[estado] ?? ""}`}>
      {Icono && <Icono className="size-3.5" strokeWidth={2} aria-hidden="true" />}
      {estado}
    </span>
  );
}

// Fecha compromiso "2026-10-30..." → "30/10/2026".
// Tomamos solo AAAA-MM-DD del texto para que la zona horaria no la mueva un día.
export function FechaCompromiso({ fecha }) {
  if (!fecha) return <span className="text-texto-suave">Sin fecha</span>;
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return <>{`${d}/${m}/${a}`}</>;
}

// Dinero en pesos mexicanos
const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

// Receta de Input / select con los tokens del tema
const estiloInput =
  "w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30";

export default function Pedidos() {
  const [sucursales, setSucursales] = useState([]);
  const [errorSucursales, setErrorSucursales] = useState("");
  const [estado, setEstado] = useState(""); // "" = todos
  const [sucursal, setSucursal] = useState(""); // "" = todas
  const [busqueda, setBusqueda] = useState("");

  // Guardamos la respuesta junto con los filtros que la pidieron ("clave").
  // Si la clave no coincide con los filtros actuales, la lista está cargando.
  const clave = `${estado}|${sucursal}`;
  const [resultado, setResultado] = useState({ clave: null, pedidos: [], error: "" });
  const cargando = resultado.clave !== clave;
  const pedidos = resultado.pedidos;
  const error = resultado.error || errorSucursales;

  // Lista de sucursales para el filtro (una sola vez)
  useEffect(() => {
    api("/api/sucursales")
      .then((datos) => setSucursales(datos ?? []))
      .catch((err) => setErrorSucursales(err.message));
  }, []);

  // Pedir los pedidos cada vez que cambia el estado o la sucursal
  useEffect(() => {
    let cancelada = false; // ignora respuestas viejas si el filtro cambió otra vez
    const params = new URLSearchParams({ estado, sucursal });
    api(`/api/pedidos?${params}`)
      .then((datos) => { if (!cancelada) setResultado({ clave, pedidos: datos ?? [], error: "" }); })
      .catch((err) => { if (!cancelada) setResultado({ clave, pedidos: [], error: err.message }); });
    return () => { cancelada = true; };
  }, [clave, estado, sucursal]);

  // La búsqueda por folio o cliente se hace aquí mismo, sobre la lista ya cargada
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? pedidos.filter((p) => p.folio.toLowerCase().includes(texto) || (p.cliente ?? "").toLowerCase().includes(texto))
    : pedidos;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-texto">Pedidos</h1>

      {/* ===== Filtros ===== */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Buscador con lupa: "relative" para colocar la lupa encima; pl-9 deja su espacio */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar folio o cliente"
            aria-label="Buscar folio o cliente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${estiloInput} pl-9`}
          />
        </div>
        <select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={estiloInput}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select aria-label="Sucursal" value={sucursal} onChange={(e) => setSucursal(e.target.value)} className={estiloInput}>
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {/* ===== Mensajes ===== */}
      {error && (
        <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
      )}
      {!error && (
        <p className="text-sm text-texto-suave" aria-live="polite">
          {cargando
            ? "Cargando..."
            : visibles.length === 0
              ? "No hay pedidos con estos filtros."
              : pedidos.length === LIMITE
                ? `Mostrando los ${LIMITE} más recientes. Usa los filtros para afinar.`
                : `${visibles.length} pedido(s)`}
        </p>
      )}

      {/* ===== Celular: tarjetas (toda la tarjeta abre el detalle) ===== */}
      <ul className="space-y-2 md:hidden">
        {visibles.map((p) => (
          <li key={p.folio}>
            <Link
              to={`/pedidos/${p.folio}`}
              // Retrasado: franja roja a la izquierda
              className={`block rounded-xl border border-borde bg-superficie p-4 shadow-sm transition-colors hover:border-acento/50 ${
                p.retrasado ? "border-l-4 border-l-peligro" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-texto">{p.folio}</p>
                  <p className="truncate text-sm text-texto-suave">{p.cliente ?? "Sin cliente"}</p>
                  <p className="text-sm text-texto-suave">{p.sucursal}</p>
                </div>
                <div className="shrink-0 text-right">
                  <EstadoPedido estado={p.estado} />
                  <p className="mt-1 font-semibold text-texto">{formatoPesos.format(p.total)}</p>
                </div>
              </div>
              <p className={`mt-2 flex items-center gap-1.5 text-sm ${p.retrasado ? "font-semibold text-peligro" : "text-texto-suave"}`}>
                {p.retrasado && <Clock className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
                Compromiso: <FechaCompromiso fecha={p.fecha_compromiso} />
                {p.retrasado && " · Retrasado"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {visibles.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-2 text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Compromiso</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {visibles.map((p) => (
                <tr key={p.folio} className="transition-colors hover:bg-superficie-2/60">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/pedidos/${p.folio}`} className="font-semibold text-acento hover:underline">
                      {p.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-texto">{p.cliente ?? "—"}</td>
                  <td className="px-4 py-3 text-texto-suave">{p.sucursal}</td>
                  <td className="px-4 py-3"><EstadoPedido estado={p.estado} /></td>
                  <td className={`whitespace-nowrap px-4 py-3 ${p.retrasado ? "font-semibold text-peligro" : "text-texto-suave"}`}>
                    <FechaCompromiso fecha={p.fecha_compromiso} />
                    {/* "Retrasado" como badge rojo con reloj */}
                    {p.retrasado && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-peligro/10 px-2.5 py-0.5 text-xs font-medium">
                        <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
                        Retrasado
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-texto">{formatoPesos.format(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
