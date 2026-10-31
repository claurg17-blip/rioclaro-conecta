// Estructura común de todas las páginas internas (después del login).
// - Barra superior: nombre de la app, usuario, rol y botón "Salir".
// - Menú: abajo en celular; a la izquierda en escritorio (desde el tamaño "md").
// - <Outlet />: aquí react-router dibuja la página actual (Inicio, Catálogo, ...).
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext.jsx";
import { opcionesParaRol } from "../menu.js";

export default function Layout() {
  const { usuario, logout } = useAuth();
  const opciones = opcionesParaRol(usuario.rol); // solo lo que este rol puede ver

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ===== Barra superior (fija arriba, alto h-14 = el menú lateral empieza en top-14) ===== */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-blue-700 px-4 text-white shadow">
        <span className="font-bold sm:text-lg">Río Claro Conecta</span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium">{usuario.nombre}</p>
            <p className="text-xs text-blue-100">{usuario.rol}</p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-lg border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Salir
          </button>
        </div>
      </header>

      {/* ===== Menú lateral (solo escritorio) ===== */}
      <nav className="fixed bottom-0 left-0 top-14 hidden w-56 border-r border-slate-200 bg-white p-3 md:block">
        <ul className="space-y-1">
          {opciones.map((o) => (
            <li key={o.ruta}>
              <NavLink
                to={o.ruta}
                end={o.ruta === "/"} // "Inicio" solo se marca activo en "/" exacto
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                <span aria-hidden="true">{o.icono}</span>
                {o.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ===== Contenido de la página actual =====
          pb-24: deja espacio para el menú de abajo en celular
          md:pl-60: deja espacio para el menú lateral (w-56) en escritorio */}
      <main className="px-4 pb-24 pt-4 md:pb-6 md:pl-60">
        <Outlet />
      </main>

      {/* ===== Menú inferior (solo celular) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {opciones.map((o) => (
            <li key={o.ruta} className="flex-1">
              <NavLink
                to={o.ruta}
                end={o.ruta === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                    isActive ? "font-semibold text-blue-700" : "text-slate-500"
                  }`
                }
              >
                <span aria-hidden="true" className="text-lg">{o.icono}</span>
                {o.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
