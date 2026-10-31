// Página Catálogo: buscador de productos por nombre, SKU o alias.
// Llama a GET /api/productos?q=texto (el backend devuelve máximo 50 resultados).
// Mobile-first: en celular se ven tarjetas; en escritorio (md) una tabla.
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "../api.js";

const LIMITE = 50; // mismo límite que usa el backend

// Formato de dinero en pesos mexicanos: 35.5 → "$35.50"
const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
function precio(p) {
  return p.precio_venta == null ? "—" : formatoPesos.format(p.precio_venta);
}

// Etiquetas pequeñas con los nombres "viejos" del producto (alias)
function ListaAlias({ alias }) {
  if (alias.length === 0) return <span className="text-texto-suave">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alias.map((a) => (
        <span key={a} className="rounded-md border border-borde bg-superficie-2 px-1.5 py-0.5 text-xs text-texto-suave">{a}</span>
      ))}
    </div>
  );
}

// Aviso de producto inactivo (solo Admin los recibe) — badge rojo
function EtiquetaInactivo({ producto }) {
  if (producto.activo) return null;
  return <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-peligro/10 px-2.5 py-0.5 text-xs font-medium text-peligro">Inactivo</span>;
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
      <h1 className="text-2xl font-bold text-texto">Catálogo</h1>

      {/* Buscador (receta de Input) con lupa.
          "relative" permite colocar la lupa encima del campo (absolute);
          pl-9 deja espacio a la izquierda para que el texto no la tape. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Buscar por nombre, SKU o alias (ej. cloro litro)"
          aria-label="Buscar productos"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-borde bg-superficie-2 py-2 pl-9 pr-3 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
      </div>

      {/* Estado de la búsqueda */}
      {error && (
        <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
      )}
      {!error && (
        <p className="text-sm text-texto-suave" aria-live="polite">
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
          <li key={p.id} className="rounded-xl border border-borde bg-superficie p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-texto">
                  {p.nombre}
                  <EtiquetaInactivo producto={p} />
                </p>
                <p className="text-sm text-texto-suave">{p.sku} · {p.unidad}</p>
              </div>
              <p className="shrink-0 font-semibold text-texto">{precio(p)}</p>
            </div>
            {p.alias.length > 0 && (
              <div className="mt-2">
                <ListaAlias alias={p.alias} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla dentro de una tarjeta (overflow-x-auto: scroll horizontal si no cabe) */}
      {productos.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-2 text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Alias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {productos.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-superficie-2/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-texto-suave">{p.sku}</td>
                  <td className="px-4 py-3 text-texto">
                    {p.nombre}
                    <EtiquetaInactivo producto={p} />
                  </td>
                  <td className="px-4 py-3 text-texto-suave">{p.unidad}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-texto">{precio(p)}</td>
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
