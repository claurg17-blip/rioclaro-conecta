// Página Inicio.
// - Gerente y Admin: tablero con seguimientos abiertos y vencidos (> 15 min)
//   y productos bajo mínimo de cada sucursal (GET /api/tablero). Se actualiza solo cada minuto.
// - Ventas y Bodega: accesos rápidos a sus secciones (el tablero no es para su rol).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CircleCheck, Clock, LayoutDashboard, TriangleAlert } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { OPCIONES_MENU, opcionesParaRol } from "../menu.js";

const ROLES_TABLERO = ["Gerente", "Admin"]; // igual que el backend

export default function Inicio() {
  const { usuario } = useAuth();
  const nombreCorto = usuario.nombre.split(" ")[0];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-texto">Hola, {nombreCorto}</h1>
      {ROLES_TABLERO.includes(usuario.rol) ? <Tablero /> : <AccesosRapidos rol={usuario.rol} />}
    </div>
  );
}

// ---------- Ventas y Bodega ----------
function AccesosRapidos({ rol }) {
  const opciones = opcionesParaRol(rol).filter((o) => o.ruta !== "/");
  return (
    <>
      <p className="text-texto-suave">¿Qué necesitas hacer?</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {opciones.map((o) => (
          <li key={o.ruta}>
            <Link to={o.ruta}
              className="flex h-full flex-col items-center gap-3 rounded-xl border border-borde bg-superficie p-5 text-center shadow-sm transition-colors hover:border-acento/50">
              {/* Ícono de la sección (componente de lucide, ver menu.js) en un cuadro de color acento */}
              <span className="rounded-lg bg-acento/10 p-2 text-acento" aria-hidden="true">
                <o.icono className="size-6" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="font-medium text-texto">{o.texto}</span>
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
  // Ícono: el triángulo de alerta si está en rojo; si no, el ícono de la sección a la que lleva (menu.js)
  const Icono = enRojo ? TriangleAlert : (OPCIONES_MENU.find((o) => o.ruta === enlace)?.icono ?? LayoutDashboard);
  return (
    <Link to={enlace}
      className={`block rounded-xl border p-4 shadow-sm transition-colors ${
        enRojo ? "border-peligro/30 bg-peligro/10 text-peligro hover:border-peligro/60" : "border-borde bg-superficie text-texto hover:border-acento/50"
      }`}>
      {/* Ícono en un cuadro de color (acento normal, peligro si está en rojo) */}
      <Icono
        className={`mb-3 size-9 rounded-lg p-2 ${enRojo ? "bg-peligro/15 text-peligro" : "bg-acento/10 text-acento"}`}
        strokeWidth={2}
        aria-hidden="true"
      />
      <p className={`text-sm ${enRojo ? "text-peligro" : "text-texto-suave"}`}>{titulo}</p>
      <p className="mt-1 text-3xl font-semibold">{valor}</p>
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
      ? <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>
      : <p className="text-texto-suave">Cargando tablero...</p>;
  }

  const { seguimientos, bajo_minimo } = datos;
  const totalBajoMinimo = bajo_minimo.reduce((suma, s) => suma + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Barra de estado: actualizar a mano */}
      <div className="flex items-center justify-between gap-3 text-sm text-texto-suave">
        <span aria-live="polite">{cargando ? "Actualizando..." : "Se actualiza cada minuto."}</span>
        {/* Botón secundario (versión pequeña) */}
        <button onClick={() => setRecarga((n) => n + 1)} disabled={cargando}
          className="inline-flex items-center gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-1.5 text-texto transition-colors hover:border-acento/50 disabled:opacity-50">
          Actualizar
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}

      {/* ===== Tarjetas de indicadores ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta titulo="Vencidos (> 15 min)" valor={seguimientos.vencidos} alerta enlace="/seguimientos" />
        <Tarjeta titulo="Seguimientos sin atender" valor={seguimientos.sin_atender} enlace="/seguimientos" />
        <Tarjeta titulo="Seguimientos en proceso" valor={seguimientos.en_proceso} enlace="/seguimientos" />
        <Tarjeta titulo="Productos bajo mínimo" valor={totalBajoMinimo} alerta enlace="/existencias" />
      </div>

      {/* ===== Seguimientos vencidos ===== */}
      <section className="rounded-xl border border-borde bg-superficie p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-texto">Seguimientos vencidos</h2>
          <Link to="/seguimientos" className="text-sm text-acento hover:underline">Ver todos</Link>
        </div>
        {seguimientos.lista_vencidos.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-exito">
            <CircleCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Ninguno. Todos los clientes han recibido respuesta a tiempo.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-borde">
            {seguimientos.lista_vencidos.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-texto">
                    {s.cliente ?? "Sin cliente"}
                    {s.folio && <> · <Link to={`/pedidos/${s.folio}`} className="text-acento hover:underline">{s.folio}</Link></>}
                  </p>
                  <p className="text-texto-suave">{s.motivo} · {s.canal}</p>
                  <p className="text-xs text-texto-suave">Responsable: {s.responsable ?? "—"}</p>
                </div>
                {/* Badge de tiempo vencido (rojo) con reloj */}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-peligro/10 px-2.5 py-0.5 text-xs font-medium text-peligro">
                  <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
                  {s.minutos_sin_respuesta} min
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Bajo mínimo por sucursal ===== */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-texto">Bajo mínimo por sucursal</h2>
          <Link to="/existencias" className="text-sm text-acento hover:underline">Ver existencias</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {bajo_minimo.map((s) => (
            <div key={s.sucursal_id} className="rounded-xl border border-borde bg-superficie p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-texto">{s.sucursal}</h3>
                {/* Badge: rojo con alerta si hay productos bajo mínimo; verde con palomita si no */}
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  s.total > 0 ? "bg-peligro/10 text-peligro" : "bg-exito/10 text-exito"
                }`}>
                  {s.total > 0
                    ? <TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden="true" />
                    : <CircleCheck className="size-3.5" strokeWidth={2} aria-hidden="true" />}
                  {s.total > 0 ? `${s.total} bajo mínimo` : "Todo en orden"}
                </span>
              </div>
              {s.total > 0 && (
                // <details> se abre y cierra solo, sin código extra
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-acento hover:underline">Ver productos</summary>
                  <ul className="mt-2 space-y-1">
                    {s.productos.map((p) => (
                      <li key={p.producto_id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-texto">{p.nombre}</span>
                        <span className="shrink-0 font-semibold text-peligro">{p.cantidad} / {p.minimo}</span>
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
