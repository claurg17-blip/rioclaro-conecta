// Opciones del menú y qué roles pueden ver cada una (tabla 2.1 y API 3.5 del diseño).
// Esta misma lista la usan:
//   - componentes/Layout.jsx → para mostrar solo las opciones permitidas
//   - App.jsx               → para proteger cada ruta con RutaProtegida
// Si cambia un permiso, se cambia SOLO aquí.
//
// Ojo: esto solo oculta pantallas. La seguridad real está en el backend (requireRole).
//
// "icono" es un componente de lucide-react (no un texto): Layout.jsx lo dibuja como <o.icono />.
import { Bot, Boxes, ClipboardList, LayoutDashboard, MessageSquareWarning, Package, UserCog } from "lucide-react";

const TODOS = ["Admin", "Gerente", "Ventas", "Bodega"];

export const OPCIONES_MENU = [
  { ruta: "/", texto: "Inicio", icono: LayoutDashboard, roles: TODOS },
  { ruta: "/catalogo", texto: "Catálogo", icono: Package, roles: TODOS },
  { ruta: "/existencias", texto: "Existencias", icono: Boxes, roles: TODOS },
  { ruta: "/pedidos", texto: "Pedidos", icono: ClipboardList, roles: TODOS },
  { ruta: "/seguimientos", texto: "Seguimientos", icono: MessageSquareWarning, roles: ["Admin", "Gerente", "Ventas"] },
  { ruta: "/asistente", texto: "Asistente", icono: Bot, roles: TODOS },
  { ruta: "/admin", texto: "Admin", icono: UserCog, roles: ["Admin"] },
];

// Devuelve solo las opciones que puede ver un rol
export function opcionesParaRol(rol) {
  return OPCIONES_MENU.filter((opcion) => opcion.roles.includes(rol));
}
