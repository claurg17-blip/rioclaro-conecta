// Página Inicio.
// - Gerente y Admin: tablero con seguimientos abiertos y vencidos (> 15 min)
//   y productos bajo mínimo de cada sucursal (GET /api/tablero). Se actualiza solo cada minuto.
// - Ventas y Bodega: accesos rápidos a sus secciones (el tablero no es para su rol).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { opcionesParaRol } from "../menu.js";

const ROLES_TABLERO = ["Gerente", "Admin"]; // igual que el backend

export default function Inicio() {
  const { usuario } = useAuth();
  const nombreCorto = usuario.nombre.split(" ")[0];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Hola, {nombreCorto}</h1>
      {ROLES_TABLERO.includes(usuario.rol) ? <Tablero /> : <AccesosRapidos rol={usuario.rol} />}
    </div>
  );
}

// ---------- Ventas y Bodega ----------
function AccesosRapidos({ rol }) {
  const opciones = opcionesParaRol(rol).filter((o) => o.ruta !== "/");
  return (
    <>
      <p className="text-slate-600">¿Qué necesitas hacer?</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {opciones.map((o) => (
          <li key={o.ruta}>
            <Link to={o.ruta}
              className="flex h-full flex-col items-center gap-2 rounded-xl bg-white p-5 text-center shadow hover:bg-blue-50">
              <span className="text-3xl" aria-hidden="true">{o.icono}</span>
              <span className="font-medium text-slate-800">{o.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------- Gerente y Admin ----------

// Tarjeta con un número grande. "alerta" la pinta en rojo cuando el número es mayor a 0.
function Tarjeta({ titulo, valor, alerta = false, enlace }) {
  const enRojo = alerta && valor > 0;
  return (
    <Link to={enlace}
      className={`block rounded-xl p-4 shadow hover:ring-2 hover:ring-blue-200 ${enRojo ? "bg-red-600 text-white" : "bg-white text-slate-800"}`}>
      <p className={`text-sm ${enRojo ? "text-red-100" : "text-slate-500"}`}>{titulo}</p>
      <p className="mt-1 text-3xl font-bold">{valor}</p>
    </Link>
  );
}

function Tablero() {
  const [recarga, setRecarga] = useState(0); // al cambiar este número se vuelve a pedir el tablero
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: "" });
  const cargando = resultado.clave !== recarga;
  const { datos, error } = resultado;

  // Pedir el tablero (al entrar y cada vez que cambia "recarga")
  useEffect(() => {
    let cancelada = false;
    api("/api/tablero")
      .then((d) => { if (!cancelada) setResultado({ clave: recarga, datos: d, error: "" }); })
      // Si falla, conservamos los datos anteriores (si había) y mostramos el error
      .catch((err) => { if (!cancelada) setResultado((r) => ({ clave: recarga, datos: r.datos, error: err.message })); });
    return () => { cancelada = true; };
  }, [recarga]);

  // Actualizar solo cada 60 segundos
  useEffect(() => {
    const reloj = setInterval(() => setRecarga((n) => n + 1), 60000);
    return () => clearInterval(reloj);
  }, []);

  if (!datos) {
    return error
      ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      : <p className="text-slate-500">Cargando tablero...</p>;
  }

  const { seguimientos, bajo_minimo } = datos;
  const totalBajoMinimo = bajo_minimo.reduce((suma, s) => suma + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Barra de estado: actualizar a mano */}
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <span aria-live="polite">{cargando ? "Actualizando..." : "Se actualiza cada minuto."}</span>
        <button onClick={() => setRecarga((n) => n + 1)} disabled={cargando}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          Actualizar
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* ===== Tarjetas de indicadores ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta titulo="Vencidos (> 15 min)" valor={seguimientos.vencidos} alerta enlace="/seguimientos" />
        <Tarjeta titulo="Seguimientos sin atender" valor={seguimientos.sin_atender} enlace="/seguimientos" />
        <Tarjeta titulo="Seguimientos en proceso" valor={seguimientos.en_proceso} enlace="/seguimientos" />
        <Tarjeta titulo="Productos bajo mínimo" valor={totalBajoMinimo} alerta enlace="/existencias" />
      </div>

      {/* ===== Seguimientos vencidos ===== */}
      <section className="rounded-xl bg-white p-4 shadow">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">Seguimientos vencidos</h2>
          <Link to="/seguimientos" className="text-sm text-blue-700 hover:underline">Ver todos</Link>
        </div>
        {seguimientos.lista_vencidos.length === 0 ? (
          <p className="mt-2 text-sm text-green-700">Ninguno. Todos los clientes han recibido respuesta a tiempo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {seguimientos.lista_vencidos.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {s.cliente ?? "Sin cliente"}
                    {s.folio && <> · <Link to={`/pedidos/${s.folio}`} className="text-blue-700 hover:underline">{s.folio}</Link></>}
                  </p>
                  <p className="text-slate-600">{s.motivo} · {s.canal}</p>
                  <p className="text-xs text-slate-500">Responsable: {s.responsable ?? "—"}</p>
                </div>
                <span className="shrink-0 font-semibold text-red-700">{s.minutos_sin_respuesta} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Bajo mínimo por sucursal ===== */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">Bajo mínimo por sucursal</h2>
          <Link to="/existencias" className="text-sm text-blue-700 hover:underline">Ver existencias</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {bajo_minimo.map((s) => (
            <div key={s.sucursal_id} className="rounded-xl bg-white p-4 shadow">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-slate-800">{s.sucursal}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  s.total > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                }`}>
                  {s.total > 0 ? `${s.total} bajo mínimo` : "Todo en orden"}
                </span>
              </div>
              {s.total > 0 && (
                // <details> se abre y cierra solo, sin código extra
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-blue-700">Ver productos</summary>
                  <ul className="mt-2 space-y-1">
                    {s.productos.map((p) => (
                      <li key={p.producto_id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-slate-700">{p.nombre}</span>
                        <span className="shrink-0 font-medium text-red-700">{p.cantidad} / {p.minimo}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
