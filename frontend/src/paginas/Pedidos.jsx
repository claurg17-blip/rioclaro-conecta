// Página Pedidos: lista con filtros por estado y sucursal, y búsqueda por folio o cliente.
// Al tocar un pedido se abre su detalle (/pedidos/RC-0001, ver PedidoDetalle.jsx).
// Usa: GET /api/sucursales y GET /api/pedidos?estado=&sucursal=
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";

const ESTADOS = ["Recibido", "Surtido", "Enviado", "Entregado", "Cancelado"];
const LIMITE = 200; // mismo límite que usa el backend

// Colores de cada estado
const COLORES_ESTADO = {
  Recibido: "bg-blue-50 text-blue-700",
  Surtido: "bg-amber-50 text-amber-700",
  Enviado: "bg-indigo-50 text-indigo-700",
  Entregado: "bg-green-50 text-green-700",
  Cancelado: "bg-slate-100 text-slate-500",
};

// Etiqueta de color con el estado del pedido (también la usa PedidoDetalle.jsx)
export function EstadoPedido({ estado }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${COLORES_ESTADO[estado] ?? ""}`}>
      {estado}
    </span>
  );
}

// Fecha compromiso "2026-10-30..." → "30/10/2026".
// Tomamos solo AAAA-MM-DD del texto para que la zona horaria no la mueva un día.
export function FechaCompromiso({ fecha }) {
  if (!fecha) return <span className="text-slate-400">Sin fecha</span>;
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return <>{`${d}/${m}/${a}`}</>;
}

// Dinero en pesos mexicanos
const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const estiloInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

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
      <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>

      {/* ===== Filtros ===== */}
      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="search"
          placeholder="Buscar folio o cliente"
          aria-label="Buscar folio o cliente"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={estiloInput}
        />
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
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {!error && (
        <p className="text-sm text-slate-500" aria-live="polite">
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
              className={`block rounded-xl bg-white p-4 shadow ${p.retrasado ? "border-l-4 border-red-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{p.folio}</p>
                  <p className="truncate text-sm text-slate-600">{p.cliente ?? "Sin cliente"}</p>
                  <p className="text-sm text-slate-500">{p.sucursal}</p>
                </div>
                <div className="shrink-0 text-right">
                  <EstadoPedido estado={p.estado} />
                  <p className="mt-1 font-semibold text-slate-800">{formatoPesos.format(p.total)}</p>
                </div>
              </div>
              <p className={`mt-2 text-sm ${p.retrasado ? "font-semibold text-red-700" : "text-slate-500"}`}>
                Compromiso: <FechaCompromiso fecha={p.fecha_compromiso} />
                {p.retrasado && " · Retrasado"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {visibles.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl bg-white shadow md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Compromiso</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((p) => (
                <tr key={p.folio} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/pedidos/${p.folio}`} className="font-semibold text-blue-700 hover:underline">
                      {p.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{p.cliente ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.sucursal}</td>
                  <td className="px-4 py-3"><EstadoPedido estado={p.estado} /></td>
                  <td className={`whitespace-nowrap px-4 py-3 ${p.retrasado ? "font-semibold text-red-700" : "text-slate-600"}`}>
                    <FechaCompromiso fecha={p.fecha_compromiso} />
                    {p.retrasado && <span className="ml-2 text-xs">Retrasado</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{formatoPesos.format(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
