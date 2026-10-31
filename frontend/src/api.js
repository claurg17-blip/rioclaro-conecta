// Función única para llamar al backend.
// Agrega automáticamente el token (JWT) a cada petición y maneja los errores.
//
// Ejemplos de uso:
//   const productos = await api("/api/productos?q=cloro");
//   await api("/api/pedidos", { method: "POST", body: JSON.stringify(pedido) });
export async function api(ruta, opciones = {}) {
  // El token se guarda en sessionStorage al iniciar sesión (ver auth/AuthContext.jsx)
  const token = sessionStorage.getItem("token");

  // VITE_API_URL viene del archivo .env (se lee al compilar)
  const r = await fetch(`${import.meta.env.VITE_API_URL}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // solo si hay sesión
      ...opciones.headers,
    },
  });

  // 401 con token = sesión expirada (8 h) o usuario desactivado: cerrar sesión
  if (r.status === 401 && token) {
    sessionStorage.clear();
    window.location.href = "/login";
    return;
  }

  // Leemos la respuesta como JSON; si viene vacía o no es JSON, queda en null
  const datos = await r.json().catch(() => null);

  // Si el backend respondió con error, lanzamos su mensaje para mostrarlo en pantalla
  if (!r.ok) throw new Error(datos?.error || "Ocurrió un error al conectar con el servidor");

  return datos;
}
