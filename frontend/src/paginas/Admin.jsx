// Página Admin (solo rol Admin): administración de usuarios.
// - Tabla de usuarios con rol, sucursal, estado y último acceso.
// - "Nuevo usuario": alta con contraseña temporal.
// - Acciones: cambiar rol o sucursal, Desactivar/Activar y Reiniciar contraseña.
// La contraseña temporal se muestra UNA sola vez para copiarla; solo vive en memoria
// mientras el recuadro está abierto (no se guarda en sessionStorage ni se escribe en consola).
// Usa: GET/POST /api/usuarios, PATCH /api/usuarios/:id,
//      POST /api/usuarios/:id/reiniciar-password y GET /api/sucursales
import { useEffect, useState } from "react";
import { api } from "../api.js";

const ROLES = ["Admin", "Gerente", "Ventas", "Bodega"];
const formatoFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });

const estiloInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";
const estiloBotonChico =
  "rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60";

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
          className={`${estiloBotonChico} border-slate-300 text-slate-700`}>
          Editar
        </button>
        {!esYo && (
          <button onClick={() => cambiarActivo(u)} disabled={ocupado === u.id}
            className={`${estiloBotonChico} ${u.activo ? "border-red-300 text-red-700" : "border-green-300 text-green-700"}`}>
            {u.activo ? "Desactivar" : "Activar"}
          </button>
        )}
        <button onClick={() => reiniciarPassword(u)} disabled={ocupado === u.id}
          className={`${estiloBotonChico} border-slate-300 text-slate-700`}>
          Reiniciar contraseña
        </button>
      </div>
    );
  }

  // Etiquetas de estado de un usuario
  function Estado({ u }) {
    return (
      <div className="flex flex-wrap gap-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          u.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
        }`}>
          {u.activo ? "Activo" : "Inactivo"}
        </span>
        {u.debe_cambiar_password && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
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
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <button onClick={() => { limpiarMensajes(); setVentana("nuevo"); }}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          + Nuevo usuario
        </button>
      </div>

      {/* ===== Contraseña temporal (solo una vez) ===== */}
      {temporal && <RecuadroTemporal temporal={temporal} onCerrar={() => setTemporal(null)} />}

      {/* ===== Mensajes ===== */}
      {aviso && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{aviso}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!resultado.cargado && <p className="text-slate-500">Cargando...</p>}

      {/* ===== Celular: tarjetas ===== */}
      <ul className="space-y-2 md:hidden">
        {resultado.usuarios.map((u) => (
          <li key={u.id} className={`rounded-xl bg-white p-4 shadow ${u.activo ? "" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{u.nombre}{u.id === miId && " (tú)"}</p>
                <p className="text-sm text-slate-500">{u.usuario} · {u.rol} · {u.sucursal ?? "Sin sucursal"}</p>
                <p className="text-xs text-slate-500">Último acceso: {ultimoAcceso(u)}</p>
              </div>
              <Estado u={u} />
            </div>
            <div className="mt-3"><Acciones u={u} /></div>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {resultado.usuarios.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
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
            <tbody className="divide-y divide-slate-100">
              {resultado.usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? "" : "bg-slate-50 text-slate-500"}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}{u.id === miId && " (tú)"}</td>
                  <td className="px-4 py-3 font-mono">{u.usuario}</td>
                  <td className="px-4 py-3">{u.rol}</td>
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
    <section role="alert" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-900">Contraseña temporal de {temporal.nombre}</h2>
      <p className="mt-1 text-sm text-amber-900">
        Usuario: <strong className="font-mono">{temporal.usuario}</strong>. Cópiala y entrégala en persona o por un
        medio privado. <strong>No se volverá a mostrar.</strong> Deberá cambiarla al iniciar sesión.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {/* readOnly + onFocus select: un toque la selecciona completa */}
        <input readOnly value={temporal.password} aria-label="Contraseña temporal"
          onFocus={(e) => e.target.select()}
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-lg tracking-wider" />
        <button onClick={copiar}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700">
          {copiada ? "¡Copiada!" : "Copiar"}
        </button>
      </div>
      <button onClick={onCerrar} className="mt-3 text-sm font-medium text-amber-900 underline">
        Ya la copié, cerrar
      </button>
    </section>
  );
}

// ---------- Ventana (base para los formularios) ----------
function Ventana({ titulo, children, onSubmit }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-label={titulo}>
      <form onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
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
        <label htmlFor="rol" className="block text-sm font-medium text-slate-700">Rol</label>
        <select id="rol" value={rol} disabled={rolBloqueado} onChange={(e) => setRol(e.target.value)}
          className={`mt-1 ${estiloInput} disabled:bg-slate-100`}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sucursal" className="block text-sm font-medium text-slate-700">Sucursal</label>
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
      <button type="button" onClick={onCancelar}
        className="flex-1 rounded-lg border border-slate-300 py-2.5 text-slate-700 hover:bg-slate-50">
        Cancelar
      </button>
      <button type="submit" disabled={enviando}
        className="flex-1 rounded-lg bg-blue-700 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
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
        <label htmlFor="nuevo-usuario" className="block text-sm font-medium text-slate-700">Usuario (para iniciar sesión)</label>
        <input id="nuevo-usuario" required autoCapitalize="none" autoComplete="off" placeholder="ej. mariana"
          value={usuario} onChange={(e) => setUsuario(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <div>
        <label htmlFor="nuevo-nombre" className="block text-sm font-medium text-slate-700">Nombre completo</label>
        <input id="nuevo-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <div>
        <label htmlFor="nuevo-email" className="block text-sm font-medium text-slate-700">Correo (opcional)</label>
        <input id="nuevo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${estiloInput}`} />
      </div>
      <CamposRolSucursal rol={rol} setRol={setRol} sucursalId={sucursalId} setSucursalId={setSucursalId} sucursales={sucursales} />
      <p className="text-xs text-slate-500">Se generará una contraseña temporal que verás una sola vez.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
        <p className="text-xs text-slate-500">No puedes cambiar tu propio rol, para no quedarte sin acceso de Admin.</p>
      )}
      {usuario.rol !== rol && (
        <p className="text-xs text-amber-700">El cambio de rol se aplica la próxima vez que inicie sesión.</p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <BotonesFormulario onCancelar={onCancelar} enviando={enviando} texto="Guardar" />
    </Ventana>
  );
}
