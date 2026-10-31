// Página Catálogo: buscador de productos por nombre, SKU o alias.
// Llama a GET /api/productos?q=texto (el backend devuelve máximo 50 resultados).
// Mobile-first: en celular se ven tarjetas; en escritorio (md) una tabla.
import { useEffect, useState } from "react";
import { api } from "../api.js";

const LIMITE = 50; // mismo límite que usa el backend

// Formato de dinero en pesos mexicanos: 35.5 → "$35.50"
const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
function precio(p) {
  return p.precio_venta == null ? "—" : formatoPesos.format(p.precio_venta);
}

// Etiquetas pequeñas con los nombres "viejos" del producto (alias)
function ListaAlias({ alias }) {
  if (alias.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alias.map((a) => (
        <span key={a} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{a}</span>
      ))}
    </div>
  );
}

// Aviso de producto inactivo (solo Admin los recibe)
function EtiquetaInactivo({ producto }) {
  if (producto.activo) return null;
  return <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">Inactivo</span>;
}

export default function Catalogo() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Busca cada vez que cambia el texto, pero espera 300 ms a que la persona deje de escribir
  // (así no mandamos una petición por cada letra)
  useEffect(() => {
    let cancelada = false; // si llega una búsqueda más nueva, ignoramos la respuesta vieja

    const espera = setTimeout(async () => {
      setCargando(true);
      setError("");
      try {
        const datos = await api(`/api/productos?q=${encodeURIComponent(busqueda.trim())}`);
        if (!cancelada) setProductos(datos ?? []);
      } catch (err) {
        if (!cancelada) setError(err.message);
      } finally {
        if (!cancelada) setCargando(false);
      }
    }, 300);

    // Se ejecuta antes de la siguiente búsqueda: cancela la espera y la respuesta pendiente
    return () => {
      cancelada = true;
      clearTimeout(espera);
    };
  }, [busqueda]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Catálogo</h1>

      {/* Buscador */}
      <input
        type="search"
        placeholder="Buscar por nombre, SKU o alias (ej. cloro litro)"
        aria-label="Buscar productos"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />

      {/* Estado de la búsqueda */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {!error && (
        <p className="text-sm text-slate-500" aria-live="polite">
          {cargando
            ? "Buscando..."
            : productos.length === 0
              ? "No se encontraron productos."
              : productos.length === LIMITE
                ? `Mostrando los primeros ${LIMITE}. Escribe más para afinar la búsqueda.`
                : `${productos.length} producto(s)`}
        </p>
      )}

      {/* Celular: tarjetas */}
      <ul className="space-y-2 md:hidden">
        {productos.map((p) => (
          <li key={p.id} className="rounded-xl bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {p.nombre}
                  <EtiquetaInactivo producto={p} />
                </p>
                <p className="text-sm text-slate-500">{p.sku} · {p.unidad}</p>
              </div>
              <p className="shrink-0 font-semibold text-slate-800">{precio(p)}</p>
            </div>
            {p.alias.length > 0 && (
              <div className="mt-2">
                <ListaAlias alias={p.alias} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      {productos.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl bg-white shadow md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Alias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{p.sku}</td>
                  <td className="px-4 py-3 text-slate-800">
                    {p.nombre}
                    <EtiquetaInactivo producto={p} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.unidad}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{precio(p)}</td>
                  <td className="px-4 py-3"><ListaAlias alias={p.alias} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
