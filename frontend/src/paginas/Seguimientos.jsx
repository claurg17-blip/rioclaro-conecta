// Página Seguimientos: quejas y dudas de clientes con semáforo de primera respuesta.
//   verde < 10 min · amarillo 10–15 min · rojo > 15 min (igual que el backend)
// - Lista con filtro por estado y búsqueda por folio o cliente.
// - Botones para atender ("En proceso") y cerrar (solo Gerente y Admin).
// - Formulario para registrar un seguimiento nuevo.
// Usa: GET/POST /api/seguimientos, PATCH /api/seguimientos/:id y GET /api/clientes
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Clock, Plus, Search } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const ESTADOS = ["Abierto", "En proceso", "Cerrado"];
const CANALES = ["teléfono", "WhatsApp", "correo"];
const MOTIVOS_SUGERIDOS = ["Retraso en la entrega", "Producto equivocado", "Faltante en el pedido", "Duda de precio", "Duda de existencia"];
const ROLES_CERRAR = ["Gerente", "Admin"]; // igual que el backend
const LIMITE = 200;

const formatoFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });

// Receta de Input / select / textarea con los tokens del tema
const estiloInput =
  "w-full rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-base text-texto outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30";

// Recetas de botones. SIN padding (px/py): cada botón pone el suyo,
// porque si se juntan dos clases de padding no se sabe cuál gana.
const estiloBotonPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-acento font-medium text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento";
const estiloBotonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-borde bg-superficie-2 text-texto transition-colors hover:border-acento/50 disabled:opacity-50";

// ---------- Semáforo ----------

// Minutos entre que se registró y la primera respuesta (o hasta "ahora" si no la hay)
function minutosDe(s, ahora) {
  const fin = s.primera_respuesta_en ? Date.parse(s.primera_respuesta_en) : ahora;
  return Math.max(0, Math.floor((fin - Date.parse(s.creado_en)) / 60000));
}

function colorSemaforo(minutos) {
  if (minutos < 10) return "verde";
  if (minutos <= 15) return "amarillo";
  return "rojo";
}

// Colores del semáforo: verde = exito, amarillo = alerta, rojo = peligro.
// "texto" incluye también el fondo tenue del badge.
const ESTILOS_SEMAFORO = {
  verde: { punto: "bg-exito", texto: "bg-exito/10 text-exito" },
  amarillo: { punto: "bg-alerta", texto: "bg-alerta/10 text-alerta" },
  rojo: { punto: "bg-peligro", texto: "bg-peligro/10 text-peligro" },
};

// Badge con punto de color + reloj + minutos. El nombre del color va en texto para lectores de pantalla.
function Semaforo({ seguimiento, ahora }) {
  const minutos = minutosDe(seguimiento, ahora);
  const color = colorSemaforo(minutos);
  const sinRespuesta = !seguimiento.primera_respuesta_en;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILOS_SEMAFORO[color].texto}`}>
      <span className={`size-2 shrink-0 rounded-full ${ESTILOS_SEMAFORO[color].punto}`} aria-hidden="true" />
      <span className="sr-only">Semáforo {color}:</span>
      <Clock className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {minutos} min{sinRespuesta ? " sin respuesta" : ""}
    </span>
  );
}

// Etiqueta del estado del seguimiento (badge con los tokens del tema)
const COLORES_ESTADO = {
  Abierto: "bg-acento/10 text-acento",
  "En proceso": "bg-alerta/10 text-alerta",
  Cerrado: "bg-superficie-2 text-texto-suave",
};
function EstadoSeguimiento({ estado }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[estado]}`}>{estado}</span>;
}

// ---------- Página ----------

export default function Seguimientos() {
  const { usuario } = useAuth();
  const puedeCerrar = ROLES_CERRAR.includes(usuario.rol);

  const [estado, setEstado] = useState(""); // "" = todos
  const [busqueda, setBusqueda] = useState("");

  // Respuesta guardada junto con el filtro que la pidió; si no coincide, está cargando
  const [resultado, setResultado] = useState({ clave: null, items: [], error: "" });
  const cargando = resultado.clave !== estado;

  const [aviso, setAviso] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [ocupado, setOcupado] = useState(null); // id del seguimiento que se está guardando
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // "Reloj" que avanza cada 30 s para que el semáforo de los pendientes se actualice solo
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(reloj);
  }, []);

  // Cargar la lista cada vez que cambia el filtro de estado
  useEffect(() => {
    let cancelada = false;
    const params = new URLSearchParams({ estado });
    api(`/api/seguimientos?${params}`)
      .then((datos) => { if (!cancelada) setResultado({ clave: estado, items: datos ?? [], error: "" }); })
      .catch((err) => { if (!cancelada) setResultado({ clave: estado, items: [], error: err.message }); });
    return () => { cancelada = true; };
  }, [estado]);

  // Búsqueda por folio o cliente, sobre la lista ya cargada
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? resultado.items.filter((s) =>
        (s.folio ?? "").toLowerCase().includes(texto) || (s.cliente ?? "").toLowerCase().includes(texto))
    : resultado.items;

  // Reemplaza un seguimiento de la lista por su versión nueva (después de guardar)
  function reemplazar(nuevo) {
    setResultado((r) => ({ ...r, items: r.items.map((s) => (s.id === nuevo.id ? nuevo : s)) }));
  }

  // Cambia el estado de un seguimiento (En proceso o Cerrado)
  async function cambiarEstado(s, estadoNuevo) {
    setAviso("");
    setErrorAccion("");
    setOcupado(s.id);
    try {
      const actualizado = await api(`/api/seguimientos/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: estadoNuevo }),
      });
      reemplazar(actualizado);
      setAviso(`Seguimiento de ${s.cliente ?? s.folio} marcado como ${estadoNuevo}.`);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setOcupado(null);
    }
  }

  // Después de registrar uno nuevo: lo ponemos hasta arriba
  function seguimientoCreado(nuevo) {
    setResultado((r) => ({ ...r, items: [nuevo, ...r.items] }));
    setAviso("Seguimiento registrado. El semáforo ya está corriendo.");
    setMostrarFormulario(false);
  }

  // Botones de cada seguimiento según su estado y el rol
  function Acciones({ s }) {
    if (s.estado === "Cerrado") return null;
    return (
      <div className="flex gap-2">
        {s.estado === "Abierto" && (
          // Botón secundario (versión pequeña)
          <button onClick={() => cambiarEstado(s, "En proceso")} disabled={ocupado === s.id}
            className={`${estiloBotonSecundario} px-3 py-1.5 text-sm font-medium`}>
            Atender
          </button>
        )}
        {puedeCerrar && (
          <button onClick={() => cambiarEstado(s, "Cerrado")} disabled={ocupado === s.id}
            className={`${estiloBotonSecundario} px-3 py-1.5 text-sm`}>
            Cerrar
          </button>
        )}
      </div>
    );
  }

  const error = resultado.error || errorAccion;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-texto">Seguimientos</h1>
        {/* El "+" del texto ahora es el ícono Plus */}
        <button onClick={() => { setAviso(""); setMostrarFormulario(true); }}
          className={`${estiloBotonPrimario} px-4 py-2 text-sm`}>
          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
          Nuevo
        </button>
      </div>

      {/* ===== Filtros ===== */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Buscador con lupa: "relative" para colocar la lupa encima; pl-9 deja su espacio */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input type="search" placeholder="Buscar folio o cliente" aria-label="Buscar folio o cliente"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={`${estiloInput} pl-9`} />
        </div>
        <select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={estiloInput}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Leyenda del semáforo */}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-suave">
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-exito" />menos de 10 min</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-alerta" />10 a 15 min</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-peligro" />más de 15 min</span>
      </p>

      {/* ===== Mensajes ===== */}
      {aviso && <p role="status" className="rounded-lg border border-exito/30 bg-exito/10 px-3 py-2 text-sm text-exito">{aviso}</p>}
      {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}
      {!resultado.error && (
        <p className="text-sm text-texto-suave" aria-live="polite">
          {cargando
            ? "Cargando..."
            : visibles.length === 0
              ? "No hay seguimientos con estos filtros."
              : resultado.items.length === LIMITE
                ? `Mostrando ${LIMITE}. Usa los filtros para afinar.`
                : `${visibles.length} seguimiento(s). Pendientes primero.`}
        </p>
      )}

      {/* ===== Celular: tarjetas ===== */}
      <ul className="space-y-2 md:hidden">
        {visibles.map((s) => (
          // Vencido: franja roja a la izquierda
          <li key={s.id} className={`rounded-xl border border-borde bg-superficie p-4 shadow-sm ${s.vencido ? "border-l-4 border-l-peligro" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-texto">{s.motivo}</p>
                <p className="truncate text-sm text-texto-suave">
                  {s.cliente ?? "Sin cliente"}
                  {s.folio && <> · <Link to={`/pedidos/${s.folio}`} className="text-acento hover:underline">{s.folio}</Link></>}
                </p>
              </div>
              <EstadoSeguimiento estado={s.estado} />
            </div>
            <p className="mt-2 text-sm text-texto">{s.descripcion}</p>
            <p className="mt-1 text-xs text-texto-suave">
              {s.canal} · {formatoFechaHora.format(new Date(s.creado_en))} · Responsable: {s.responsable ?? "—"}
              {s.origen === "ia" && " · Registrado por el asistente"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Semaforo seguimiento={s} ahora={ahora} />
              <Acciones s={s} />
            </div>
          </li>
        ))}
      </ul>

      {/* ===== Escritorio: tabla ===== */}
      {visibles.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-2 text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Semáforo</th>
                <th className="px-4 py-3 font-medium">Cliente / pedido</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {visibles.map((s) => (
                // Vencido: fila con fondo rojo tenue
                <tr key={s.id} className={`transition-colors ${s.vencido ? "bg-peligro/10 hover:bg-peligro/15" : "hover:bg-superficie-2/60"}`}>
                  <td className="whitespace-nowrap px-4 py-3"><Semaforo seguimiento={s} ahora={ahora} /></td>
                  <td className="px-4 py-3">
                    <p className="text-texto">{s.cliente ?? "—"}</p>
                    {s.folio && <Link to={`/pedidos/${s.folio}`} className="text-xs text-acento hover:underline">{s.folio}</Link>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-texto">{s.motivo}</p>
                    <p className="text-xs text-texto-suave">{s.descripcion}</p>
                    <p className="text-xs text-texto-suave opacity-80">
                      {formatoFechaHora.format(new Date(s.creado_en))}
                      {s.origen === "ia" && " · Registrado por el asistente"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-texto-suave">{s.canal}</td>
                  <td className="px-4 py-3 text-texto-suave">{s.responsable ?? "—"}</td>
                  <td className="px-4 py-3"><EstadoSeguimiento estado={s.estado} /></td>
                  <td className="px-4 py-3"><Acciones s={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarFormulario && (
        <FormularioSeguimiento onCancelar={() => setMostrarFormulario(false)} onCreado={seguimientoCreado} />
      )}
    </div>
  );
}

// ---------- Alta de seguimiento ----------
// Ventana encima de la página: en celular sale desde abajo; en escritorio, centrada.
// Se registra contra un pedido (folio), un cliente, o ambos. El responsable es quien lo registra.
function FormularioSeguimiento({ onCancelar, onCreado }) {
  const [clientes, setClientes] = useState([]);
  const [folio, setFolio] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [canal, setCanal] = useState("teléfono");
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Lista de clientes para elegir (una sola vez al abrir)
  useEffect(() => {
    api("/api/clientes")
      .then((datos) => setClientes(datos ?? []))
      .catch((err) => setError(err.message));
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError("");

    // Validaciones rápidas (el backend vuelve a validar)
    if (!folio.trim() && !clienteId) return setError("Indica el folio del pedido o elige un cliente");
    if (!motivo.trim() || !descripcion.trim()) return setError("Motivo y descripción son obligatorios");

    setEnviando(true);
    try {
      const nuevo = await api("/api/seguimientos", {
        method: "POST",
        body: JSON.stringify({
          folio: folio.trim() || undefined,
          cliente_id: clienteId ? Number(clienteId) : undefined,
          canal,
          motivo: motivo.trim(),
          descripcion: descripcion.trim(),
        }),
      });
      onCreado(nuevo);
    } catch (err) {
      setError(err.message); // p. ej. "El pedido no existe"
      setEnviando(false);
    }
  }

  return (
    // Fondo oscuro semitransparente detrás de la ventana
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="titulo-seguimiento">
      {/* La ventana: panel sólido con borde sutil */}
      <form onSubmit={guardar}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-borde bg-superficie p-6 text-texto shadow-sm sm:rounded-2xl">
        <h2 id="titulo-seguimiento" className="text-lg font-bold text-texto">Nuevo seguimiento</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="folio" className="block text-sm font-medium text-texto-suave">Folio del pedido</label>
            <input id="folio" placeholder="RC-0001" autoCapitalize="characters" value={folio}
              onChange={(e) => setFolio(e.target.value)} className={`mt-1 ${estiloInput}`} />
          </div>
          <div>
            <label htmlFor="cliente" className="block text-sm font-medium text-texto-suave">Cliente</label>
            <select id="cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={`mt-1 ${estiloInput}`}>
              <option value="">— Elegir —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-texto-suave">Basta con uno: si pones el folio, el cliente se toma del pedido.</p>

        {/* Canal: botones tipo "pastilla"; has-focus-visible muestra un anillo al llegar con el teclado */}
        <fieldset>
          <legend className="text-sm font-medium text-texto-suave">Canal</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {CANALES.map((c) => (
              <label key={c} className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-acento/30 ${
                canal === c
                  ? "border-acento bg-acento/10 font-medium text-acento"
                  : "border-borde bg-superficie-2 text-texto-suave hover:text-texto"
              }`}>
                <input type="radio" name="canal" value={c} checked={canal === c} onChange={() => setCanal(c)} className="sr-only" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="motivo" className="block text-sm font-medium text-texto-suave">Motivo</label>
          {/* list= muestra sugerencias, pero se puede escribir cualquier motivo */}
          <input id="motivo" list="motivos" required value={motivo}
            onChange={(e) => setMotivo(e.target.value)} className={`mt-1 ${estiloInput}`} />
          <datalist id="motivos">
            {MOTIVOS_SUGERIDOS.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-texto-suave">Descripción</label>
          <textarea id="descripcion" rows={3} required value={descripcion}
            placeholder="¿Qué dijo el cliente?"
            onChange={(e) => setDescripcion(e.target.value)} className={`mt-1 ${estiloInput}`} />
        </div>

        {error && <p role="alert" className="rounded-lg border border-peligro/30 bg-peligro/10 px-3 py-2 text-sm text-peligro">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onCancelar} className={`${estiloBotonSecundario} flex-1 px-4 py-2.5`}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={`${estiloBotonPrimario} flex-1 px-4 py-2.5`}>
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            {enviando ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
