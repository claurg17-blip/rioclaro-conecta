// Página Admin (solo rol Admin): administración de usuarios.
// - Tabla de usuarios con rol, sucursal, estado y último acceso.
// - "Nuevo usuario": alta con contraseña temporal.
// - Acciones: cambiar rol o sucursal, Desactivar/Activar y Reiniciar contraseña.
// La contraseña temporal se muestra UNA sola vez para copiarla; solo vive en memoria
// mientras el recuadro está abierto (no se guarda en sessionStorage ni se escribe en consola).
// Usa: GET/POST /api/usuarios, PATCH /api/usuarios/:id,
//      POST /api/usuarios/:id/reiniciar-password y GET /api/sucursales
import { useEffect, useState } from "react";
import { Bot, Check, CircleCheck, CircleX, Copy, KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { api } from "../api.js";

const ROLES = ["Admin", "Gerente", "Ventas", "Bodega"];
const formatoFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });

// Receta de Input / select con los tokens del tema
const estiloInput =
  "w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30";
// Base de los botones chicos de cada usuario. El color (borde, fondo, texto, hover) lo pone cada botón.
const estiloBotonChico =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50";
// Colores de los botones chicos
const botonNeutro = "border-borde bg-superficie-2 text-texto hover:border-acento/50";
const botonPeligro = "border-peligro/30 bg-peligro/10 text-peligro hover:bg-peligro/20";
const botonExito = "border-exito/30 bg-exito/10 text-exito hover:bg-exito/20";

// Badge de rol: Admin resaltado con el acento; los demás en gris
const COLORES_ROL = {
  Admin: "bg-acento/10 text-acento",
  Gerente: "bg-superficie-2 text-texto",
  Ventas: "bg-superficie-2 text-texto",
  Bodega: "bg-superficie-2 text-texto",
};
const estiloBadge = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium";

export default function Admin() {
  // id del Admin con sesión (el login no lo trae; lo pedimos a /api/me)
  const [miId, setMiId] = useState(null);

  const [resultado, setResultado] = useState({ cargado: false, usuarios: [], error: "" });
  const [sucursales, setSucursales] = useState([]);
  const [aviso, setAviso] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [ocupado, setOcupado] = useState(null); // id del usuario que se está guardando

  const [ventana, setVentana] = useState(null); // "nuevo" o el usuario que se edita
  // { nombre, usuario, password } — se borra al cerrar el recuadro
  const [temporal, setTemporal] = useState(null);

  // Cargar mi id, los usuarios y las sucursales al entrar
  useEffect(() => {
    api("/api/me")
      .then((datos) => setMiId(datos?.id ?? null))
      .catch((err) => setErrorAccion(err.message));
    api("/api/usuarios")
      .then((datos) => setResultado({ cargado: true, usuarios: datos ?? [], error: "" }))
      .catch((err) => setResultado({ cargado: true, usuarios: [], error: err.message }));
    api("/api/sucursales")
      .then((datos) => setSucursales(datos ?? []))
      .catch((err) => setErrorAccion(err.message));
  }, []);

  // Reemplaza un usuario de la lista por su versión nueva
  function reemplazar(u) {
    setResultado((r) => ({ ...r, usuarios: r.usuarios.map((x) => (x.id === u.id ? u : x)) }));
  }

  function limpiarMensajes() {
    setAviso("");
    setErrorAccion("");
  }

  // ----- Acciones -----

  async function cambiarActivo(u) {
    const activar = !u.activo;
    if (!activar && !window.confirm(`¿Desactivar a ${u.nombre}? Ya no podrá iniciar sesión.`)) return;
    limpiarMensajes();
    setOcupado(u.id);
    try {
      const actualizado = await api(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: activar }),
      });
      reemplazar(actualizado);
      setAviso(`${u.nombre} quedó ${activar ? "activo" : "desactivado"}.`);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setOcupado(null);
    }
  }

  async function reiniciarPassword(u) {
    if (!window.confirm(`¿Reiniciar la contraseña de ${u.nombre}? Se generará una temporal y deberá cambiarla al entrar.`)) return;
    limpiarMensajes();
    setOcupado(u.id);
    try {
      const datos = await api(`/api/usuarios/${u.id}/reiniciar-password`, { method: "POST" });
      reemplazar(datos.usuario);
      setTemporal({ nombre: datos.usuario.nombre, usuario: datos.usuario.usuario, password: datos.passwordTemporal });
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setOcupado(null);
    }
  }

  // Después del alta: agregar a la lista y mostrar la contraseña temporal
  function usuarioCreado(datos) {
    setResultado((r) => ({
      ...r,
      usuarios: [...r.usuarios, datos.usuario].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }));
    setVentana(null);
    setTemporal({ nombre: datos.usuario.nombre, usuario: datos.usuario.usuario, password: datos.passwordTemporal });
  }

  // Después de editar rol o sucursal
  function usuarioEditado(u) {
    reemplazar(u);
    setVentana(null);
    setAviso(`Se guardaron los cambios de ${u.nombre}.`);
  }

  // Botones de cada usuario
  function Acciones({ u }) {
    const esYo = u.id === miId; // el backend no deja que te desactives a ti mismo
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { limpiarMensajes(); setVentana(u); }} disabled={ocupado === u.id}
          className={`${estiloBotonChico} ${botonNeutro}`}>
          <Pencil className="size-4" strokeWidth={2} aria-hidden="true" />
          Editar
        </button>
        {!esYo && (
          // Desactivar en rojo (UserX); Activar en verde (UserCheck)
          <button onClick={() => cambiarActivo(u)} disabled={ocupado === u.id}
            className={`${estiloBotonChico} ${u.activo ? botonPeligro : botonExito}`}>
            {u.activo
              ? <UserX className="size-4" strokeWidth={2} aria-hidden="true" />
              : <UserCheck className="size-4" strokeWidth={2} aria-hidden="true" />}
            {u.activo ? "Desactivar" : "Activar"}
          </button>
        )}
        <button onClick={() => reiniciarPassword(u)} disabled={ocupado === u.id}
          className={`${estiloBotonChico} ${botonNeutro}`}>
          <KeyRound className="size-4" strokeWidth={2} aria-hidden="true" />
          Reiniciar contraseña
        </button>
      </div>
    );
  }

  // Etiquetas de estado de un usuario (badges)
  function Estado({ u }) {
    return (
      <div className="flex flex-wrap gap-1">
        <span className={`${estiloBadge} ${u.activo ? "bg-exito/10 text-exito" : "bg-superficie-2 text-texto-suave"}`}>
          {u.activo
            ? <CircleCheck className="size-3.5" strokeWidth={2} aria-hidden="true" />
            : <CircleX className="size-3.5" strokeWidth={2} aria-hidden="true" />}
          {u.activo ? "Activo" : "Inactivo"}
        </span>
        {u.debe_cambiar_password && (
          <span className={`${estiloBadge} bg-alerta/10 text-alerta`}>
            <KeyRound className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Contraseña temporal
          </span>
        )}
      </div>
    );
  }

  const ultimoAcceso = (u) => (u.ultimo_acceso ? formatoFechaHora.format(new Date(u.ultimo_acceso)) : "Nunca");
  const error = resultado.error || errorAccion;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-texto">Usuarios</h1>
        {/* Botón primario; el "+" del texto ahora es el ícono Plus */}
        <button onClick={() => { limpiarMensajes(); setVentana("nuevo"); }}
          className="inline-flex items-center gap-2 rounded-lg bg-acento px-4 py-2 text-sm font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento">
          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
          Nuevo usuario
        </button>
      </div>

      {/* ===== Contraseña temporal (solo una vez) ===== */}
      {temporal && <RecuadroTemporal temporal={temporal} onCerrar={() => setTemporal(null)} />}

      {/* ===== Mensajes ===== */}
      {aviso && <p role="status" className="rounded-lg border border-exito/30 bg-exito/10 px-3 py-2 text-sm text-exito">{aviso}</p>}
      {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}
      {!resultado.cargado && <p className="text-texto-suave">Cargando...</p>}

      {/* ===== Celular: tarjetas ===== */}
      <ul className="space-y-2 md:hidden">
        {resultado.usuarios.map((u) => (
          <li key={u.id} className={`rounded-xl border border-borde bg-superficie p-4 shadow-sm ${u.activo ? "" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-texto">{u.nombre}{u.id === miId && " (tú)"}</p>
                <p className="text-sm text-texto-suave">{u.usuario} · {u.rol} · {u.sucursal ?? "Sin sucursal"}</p>
                <p className="text-xs text-texto-suave">Último acceso: {ultimoAcceso(u)}</p>
              </div>
              <Estado u={u} />
            </div>
            <div className="mt-3"><Acciones u={u} /></div>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {resultado.usuarios.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-2 text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Último acceso</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {resultado.usuarios.map((u) => (
                // Usuario inactivo: fila con fondo gris y texto suave
                <tr key={u.id} className={`transition-colors ${
                  u.activo ? "text-texto hover:bg-superficie-2/60" : "bg-superficie-2/40 text-texto-suave"
                }`}>
                  <td className={`px-4 py-3 font-medium ${u.activo ? "text-texto" : ""}`}>{u.nombre}{u.id === miId && " (tú)"}</td>
                  <td className="px-4 py-3 font-mono text-texto-suave">{u.usuario}</td>
                  {/* Rol como badge */}
                  <td className="px-4 py-3">
                    <span className={`${estiloBadge} ${COLORES_ROL[u.rol] ?? "bg-superficie-2 text-texto"}`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-3">{u.sucursal ?? "—"}</td>
                  <td className="px-4 py-3"><Estado u={u} /></td>
                  <td className="whitespace-nowrap px-4 py-3">{ultimoAcceso(u)}</td>
                  <td className="px-4 py-3"><Acciones u={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Estado del asistente de IA ===== */}
      <TarjetaAsistente />

      {/* ===== Ventanas ===== */}
      {ventana === "nuevo" && (
        <FormularioNuevo sucursales={sucursales} onCancelar={() => setVentana(null)} onCreado={usuarioCreado} />
      )}
      {ventana && ventana !== "nuevo" && (
        <FormularioEditar usuario={ventana} esYo={ventana.id === miId} sucursales={sucursales}
          onCancelar={() => setVentana(null)} onGuardado={usuarioEditado} />
      )}
    </div>
  );
}

// ---------- Tarjeta "Asistente IA" ----------
// Muestra si el asistente está encendido o apagado (GET /api/agente/estado)
// y cómo cambiarlo desde Azure. Solo informa: el switch real es la variable AGENTE_HABILITADO.
function TarjetaAsistente() {
  // null = todavía consultando; true / false = respuesta del backend
  const [habilitado, setHabilitado] = useState(null);
  const [error, setError] = useState("");

  // Consultar el estado una vez al entrar
  useEffect(() => {
    api("/api/agente/estado")
      // datos = null si la sesión venció (api() ya manda al login): no cambiamos nada
      .then((datos) => { if (datos) setHabilitado(Boolean(datos.habilitado)); })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="rounded-xl border border-borde bg-superficie p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-texto">
          {/* Ícono del asistente en un cuadro de color acento */}
          <Bot className="size-9 rounded-lg bg-acento/10 p-2 text-acento" strokeWidth={2} aria-hidden="true" />
          Asistente IA
        </h2>

        {/* Badge de estado: verde si está encendido, rojo si está apagado */}
        {error ? null : habilitado === null ? (
          <span className={`${estiloBadge} bg-superficie-2 text-texto-suave`}>Consultando...</span>
        ) : habilitado ? (
          <span className={`${estiloBadge} bg-exito/10 text-exito`}>
            <CircleCheck className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Encendido
          </span>
        ) : (
          <span className={`${estiloBadge} bg-peligro/10 text-peligro`}>
            <CircleX className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Apagado
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">
          No se pudo consultar el estado: {error}
        </p>
      )}

      {/* Instrucciones para apagarlo o encenderlo desde el portal de Azure */}
      <p className="mt-3 text-sm text-texto-suave">
        Para apagarlo: Portal de Azure → App Service del backend → Settings → Environment variables →{" "}
        <code className="rounded bg-superficie-2 px-1 py-0.5 font-mono text-xs text-texto">AGENTE_HABILITADO = false</code>{" "}
        → Apply. La app se reinicia en ~1 minuto. Para encenderlo, vuelve a poner{" "}
        <code className="rounded bg-superficie-2 px-1 py-0.5 font-mono text-xs text-texto">true</code>.
      </p>
    </section>
  );
}

// ---------- Recuadro con la contraseña temporal ----------
// Se muestra una sola vez: al cerrarlo, la contraseña se borra de la memoria de la página.
function RecuadroTemporal({ temporal, onCerrar }) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(temporal.password);
      setCopiada(true);
    } catch {
      // Si el navegador no deja copiar, la persona puede seleccionarla a mano
      setCopiada(false);
    }
  }

  return (
    // Recuadro verde tenue (exito/10) con borde verde
    <section role="alert" className="rounded-xl border border-exito/30 bg-exito/10 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-exito">
        <KeyRound className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Contraseña temporal de {temporal.nombre}
      </h2>
      <p className="mt-1 text-sm text-texto">
        Usuario: <strong className="font-mono">{temporal.usuario}</strong>. Cópiala y entrégala en persona o por un
        medio privado. <strong>No se volverá a mostrar.</strong> Deberá cambiarla al iniciar sesión.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {/* readOnly + onFocus select: un toque la selecciona completa */}
        <input readOnly value={temporal.password} aria-label="Contraseña temporal"
          onFocus={(e) => e.target.select()}
          className="w-full rounded-lg border border-exito/30 bg-superficie px-3 py-2 font-mono text-lg tracking-wider text-texto outline-none focus:ring-2 focus:ring-exito/30" />
        {/* Botón verde: ícono Copy, y Check cuando ya se copió */}
        <button onClick={copiar}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-exito px-4 py-2 font-medium text-sobre-acento transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-exito">
          {copiada
            ? <Check className="size-4" strokeWidth={2} aria-hidden="true" />
            : <Copy className="size-4" strokeWidth={2} aria-hidden="true" />}
          {copiada ? "¡Copiada!" : "Copiar"}
        </button>
      </div>
      <button onClick={onCerrar} className="mt-3 text-sm font-medium text-exito underline hover:no-underline">
        Ya la copié, cerrar
      </button>
    </section>
  );
}

// ---------- Ventana (base para los formularios) ----------
function Ventana({ titulo, children, onSubmit }) {
  return (
    // Fondo oscuro semitransparente detrás de la ventana
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-label={titulo}>
      {/* La ventana: panel sólido con borde sutil */}
      <form onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-borde bg-superficie p-6 text-texto shadow-sm sm:rounded-2xl">
        <h2 className="text-lg font-bold text-texto">{titulo}</h2>
        {children}
      </form>
    </div>
  );
}

// Selects de rol y sucursal (se usan en el alta y en la edición)
function CamposRolSucursal({ rol, setRol, sucursalId, setSucursalId, sucursales, rolBloqueado = false }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="rol" className="block text-sm font-medium text-texto-suave">Rol</label>
        {/* Bloqueado: más transparente y con cursor de "no permitido" */}
        <select id="rol" value={rol} disabled={rolBloqueado} onChange={(e) => setRol(e.target.value)}
          className={`mt-1 ${estiloInput} disabled:cursor-not-allowed disabled:opacity-60`}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sucursal" className="block text-sm font-medium text-texto-suave">Sucursal</label>
        <select id="sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={`mt-1 ${estiloInput}`}>
          <option value="">Sin sucursal</option>
          {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>
    </div>
  );
}

function BotonesFormulario({ onCancelar, enviando, texto }) {
  return (
    <div className="flex gap-2">
      {/* Botón secundario */}
      <button type="button" onClick={onCancelar}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-borde bg-superficie-2 px-4 py-2.5 text-texto transition-colors hover:border-acento/50">
        Cancelar
      </button>
      {/* Botón primario */}
      <button type="submit" disabled={enviando}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento">
        {enviando ? "Guardando..." : texto}
      </button>
    </div>
  );
}

// ---------- Alta de usuario ----------
function FormularioNuevo({ sucursales, onCancelar, onCreado }) {
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("Ventas");
  const [sucursalId, setSucursalId] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const login = usuario.trim().toLowerCase();
    if (!login || !nombre.trim()) return setError("Usuario y nombre son obligatorios");
    if (/\s/.test(login)) return setError("El usuario no debe tener espacios (ej. mariana o mariana.lopez)");

    setEnviando(true);
    try {
      const datos = await api("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          usuario: login,
          nombre: nombre.trim(),
          email: email.trim() || null,
          rol,
          sucursal_id: sucursalId ? Number(sucursalId) : null,
        }),
      });
      onCreado(datos); // trae { usuario, passwordTemporal }
    } catch (err) {
      setError(err.message); // p. ej. "Ese nombre de usuario ya existe"
      setEnviando(false);
    }
  }

  return (
    <Ventana titulo="Nuevo usuario" onSubmit={guardar}>
      <div>
        <label htmlFor="nuevo-usuario" className="block text-sm font-medium text-texto-suave">Usuario (para iniciar sesión)</label>
        <input id="nuevo-usuario" required autoCapitalize="none" autoComplete="off" placeholder="ej. mariana"
          value={usuario} onChange={(e) => setUsuario(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <div>
        <label htmlFor="nuevo-nombre" className="block text-sm font-medium text-texto-suave">Nombre completo</label>
        <input id="nuevo-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <div>
        <label htmlFor="nuevo-email" className="block text-sm font-medium text-texto-suave">Correo (opcional)</label>
        <input id="nuevo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <CamposRolSucursal rol={rol} setRol={setRol} sucursalId={sucursalId} setSucursalId={setSucursalId} sucursales={sucursales} />
      <p className="text-xs text-texto-suave">Se generará una contraseña temporal que verás una sola vez.</p>
      {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}
      <BotonesFormulario onCancelar={onCancelar} enviando={enviando} texto="Crear usuario" />
    </Ventana>
  );
}

// ---------- Cambiar rol o sucursal ----------
function FormularioEditar({ usuario, esYo, sucursales, onCancelar, onGuardado }) {
  const [rol, setRol] = useState(usuario.rol);
  const [sucursalId, setSucursalId] = useState(usuario.sucursal_id ? String(usuario.sucursal_id) : "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError("");

    // Solo mandamos lo que cambió
    const cambios = {};
    if (rol !== usuario.rol) cambios.rol = rol;
    const nuevaSucursal = sucursalId ? Number(sucursalId) : null;
    if (nuevaSucursal !== usuario.sucursal_id) cambios.sucursal_id = nuevaSucursal;
    if (Object.keys(cambios).length === 0) return onCancelar();

    setEnviando(true);
    try {
      const actualizado = await api(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        body: JSON.stringify(cambios),
      });
      onGuardado(actualizado);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <Ventana titulo={`Editar a ${usuario.nombre}`} onSubmit={guardar}>
      <CamposRolSucursal rol={rol} setRol={setRol} sucursalId={sucursalId} setSucursalId={setSucursalId}
        sucursales={sucursales} rolBloqueado={esYo} />
      {esYo && (
        <p className="text-xs text-texto-suave">No puedes cambiar tu propio rol, para no quedarte sin acceso de Admin.</p>
      )}
      {usuario.rol !== rol && (
        <p className="text-xs text-alerta">El cambio de rol se aplica la próxima vez que inicie sesión.</p>
      )}
      {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}
      <BotonesFormulario onCancelar={onCancelar} enviando={enviando} texto="Guardar" />
    </Ventana>
  );
}
