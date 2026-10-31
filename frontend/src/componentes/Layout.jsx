// Estructura común de todas las páginas internas (después del login).
// - Barra superior: nombre de la app, usuario, rol, botón de tema y botón "Salir".
// - Menú: abajo en celular; a la izquierda en escritorio (desde el tamaño "md").
// - <Outlet />: aquí react-router dibuja la página actual (Inicio, Catálogo, ...).
// Los colores (bg-fondo, bg-superficie, text-acento, ...) vienen de los tokens de index.css.
import { NavLink, Outlet } from "react-router";
import { Droplets, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { opcionesParaRol } from "../menu.js";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Layout() {
  const { usuario, logout } = useAuth();
  const opciones = opcionesParaRol(usuario.rol); // solo lo que este rol puede ver

  return (
    <div className="min-h-screen bg-fondo text-texto">
      {/* ===== Barra superior (fija arriba, alto h-14 = el menú lateral empieza en top-14) =====
          bg-superficie/80 + backdrop-blur: fondo semitransparente que difumina lo que pasa por debajo */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-borde bg-superficie/80 px-4 backdrop-blur">
        <span className="inline-flex items-center gap-2 font-semibold text-texto sm:text-lg">
          {/* Logo: gota de agua en un cuadro con el color de acento */}
          <Droplets className="size-8 rounded-xl bg-acento/10 p-1.5 text-acento" strokeWidth={2} aria-hidden="true" />
          Río Claro Distribuidora
        </span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium text-texto">{usuario.nombre}</p>
            <p className="text-xs text-texto-suave">{usuario.rol}</p>
          </div>
          {/* Botón para cambiar entre modo oscuro y claro */}
          <ThemeToggle />
          <button
            onClick={logout}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-borde bg-superficie-2 px-3 py-1.5 text-sm text-texto transition-colors hover:border-acento/50"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      {/* ===== Menú lateral (solo escritorio) ===== */}
      <nav className="fixed bottom-0 left-0 top-14 hidden w-56 border-r border-borde bg-superficie p-3 md:block">
        <ul className="space-y-1">
          {opciones.map((o) => (
            <li key={o.ruta}>
              <NavLink
                to={o.ruta}
                end={o.ruta === "/"} // "Inicio" solo se marca activo en "/" exacto
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-acento/10 font-medium text-acento" : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
                  }`
                }
              >
                {/* o.icono es un componente de lucide-react (ver menu.js) */}
                <o.icono className="size-5" strokeWidth={2} aria-hidden="true" />
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
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {opciones.map((o) => (
            <li key={o.ruta} className="flex-1">
              <NavLink
                to={o.ruta}
                end={o.ruta === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                    isActive ? "bg-acento/10 font-medium text-acento" : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
                  }`
                }
              >
                <o.icono className="size-5" strokeWidth={2} aria-hidden="true" />
                {o.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
