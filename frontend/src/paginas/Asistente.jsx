// Página Asistente: chat con el agente de IA, estilo mensajería.
// - Aviso fijo arriba: es una IA y hay que verificar antes de prometer al cliente.
// - Debajo de cada respuesta se muestran las fuentes (qué datos consultó).
// - El conversacionId se guarda en el estado para que el agente recuerde la plática.
// - En celular ocupa toda la pantalla (tapa la barra y el menú, con botón "Volver");
//   en escritorio se ve dentro del Layout normal.
// Usa: POST /api/agente/chat → { texto, fuentes, conversacionId }
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../api.js";

const MAX_MENSAJE = 1000; // mismo tope que valida el backend

// Nombre legible de cada herramienta, para mostrarlo como fuente
const NOMBRE_FUENTE = {
  buscar_existencias: "Existencias",
  consultar_pedido: "Pedidos",
  registrar_seguimiento: "Seguimientos",
};

// Preguntas de ejemplo para cuando el chat está vacío
const EJEMPLOS = [
  "¿Cuánto cloro de litro hay en León?",
  "¿Dónde está el pedido RC-1042?",
  "Últimos pedidos del Hotel Las Palmas",
];

export default function Asistente() {
  const navigate = useNavigate();

  // Cada mensaje: { id, tipo: "usuario" | "asistente" | "error", texto, fuentes?, apagado?, reintentar? }
  const [mensajes, setMensajes] = useState([]);
  const [conversacionId, setConversacionId] = useState(null); // null = conversación nueva
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false); // esperando respuesta del asistente

  const siguienteId = useRef(1);        // ids para las "key" de React
  const finDeLista = useRef(null);      // para bajar al último mensaje
  const campoTexto = useRef(null);      // para regresar el foco al campo de texto

  // Agrega un mensaje al final de la lista
  function agregar(mensaje) {
    setMensajes((lista) => [...lista, { id: siguienteId.current++, ...mensaje }]);
  }

  // Cada vez que llega un mensaje (o aparece "escribiendo…"), bajamos al final
  useEffect(() => {
    finDeLista.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, escribiendo]);

  // Manda una pregunta al backend.
  // esReintento = true cuando se vuelve a intentar después de un error
  // (la pregunta ya está en pantalla, no se repite).
  async function enviar(pregunta, esReintento = false) {
    const mensaje = pregunta.trim();
    if (!mensaje || escribiendo) return;

    if (!esReintento) agregar({ tipo: "usuario", texto: mensaje });
    setTexto("");
    setEscribiendo(true);

    try {
      const r = await api("/api/agente/chat", {
        method: "POST",
        body: JSON.stringify({ mensaje, conversacionId }),
      });
      if (!r) return; // sesión expirada: api() ya mandó a /login

      if (r.conversacionId) setConversacionId(r.conversacionId);
      agregar({ tipo: "asistente", texto: r.texto, fuentes: r.fuentes ?? [], apagado: r.apagado });
    } catch (err) {
      agregar({ tipo: "error", texto: err.message, reintentar: mensaje });
    } finally {
      setEscribiendo(false);
      campoTexto.current?.focus();
    }
  }

  // Botón "Reintentar": quita el mensaje de error y vuelve a mandar la misma pregunta
  function reintentar(error) {
    setMensajes((lista) => lista.filter((m) => m.id !== error.id));
    enviar(error.reintentar, true);
  }

  // Empieza de cero: el agente ya no recuerda lo anterior
  function nuevaConversacion() {
    setMensajes([]);
    setConversacionId(null);
    setTexto("");
    campoTexto.current?.focus();
  }

  // Enter envía; Shift + Enter hace salto de línea
  function alPresionarTecla(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(texto);
    }
  }

  return (
    // Celular: capa fija que cubre toda la pantalla (h-dvh se ajusta cuando sale el teclado).
    // Escritorio (md): se queda dentro del Layout; alto = pantalla − barra (3.5rem) − márgenes del main (2.5rem).
    <div className="fixed inset-0 z-30 flex h-dvh flex-col bg-slate-100 pt-[env(safe-area-inset-top)]
                    md:static md:z-auto md:h-[calc(100dvh-6rem)] md:overflow-hidden md:rounded-xl md:bg-white md:pt-0 md:shadow">

      {/* ===== Encabezado ===== */}
      <header className="flex shrink-0 items-center gap-2 bg-blue-700 px-3 py-2 text-white md:bg-white md:px-4 md:py-3 md:text-slate-800">
        <button
          onClick={() => navigate("/")}
          className="rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 md:hidden"
          aria-label="Volver al inicio"
        >
          ← Volver
        </button>
        <h1 className="flex-1 text-lg font-bold md:text-2xl">Asistente</h1>
        {mensajes.length > 0 && (
          <button
            onClick={nuevaConversacion}
            disabled={escribiendo}
            className="rounded-lg border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50
                       md:border-blue-600 md:text-blue-700 md:hover:bg-blue-50"
          >
            Nueva conversación
          </button>
        )}
      </header>

      {/* ===== Aviso fijo de IA (no se mueve al hacer scroll) ===== */}
      <p role="note" className="shrink-0 border-y border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        ⚠️ Estás hablando con un asistente de IA. Verifica antes de prometer al cliente.
      </p>

      {/* ===== Mensajes (esta es la única parte con scroll) ===== */}
      <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-3 py-4 md:px-4">
        {/* Chat vacío: explicación y preguntas de ejemplo */}
        {mensajes.length === 0 && (
          <div className="mx-auto max-w-md pt-6 text-center text-slate-600">
            <p className="text-4xl" aria-hidden="true">💬</p>
            <p className="mt-2">Pregúntame por existencias, pedidos o registra un seguimiento.</p>
            <div className="mt-4 flex flex-col gap-2">
              {EJEMPLOS.map((ejemplo) => (
                <button
                  key={ejemplo}
                  onClick={() => enviar(ejemplo)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {ejemplo}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m) => <Burbuja key={m.id} mensaje={m} onReintentar={() => reintentar(m)} />)}

        {/* Indicador "escribiendo…" mientras esperamos la respuesta */}
        {escribiendo && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm md:bg-slate-100">
              <span className="sr-only">El asistente está escribiendo…</span>
              {[0, 150, 300].map((retraso) => (
                <span
                  key={retraso}
                  aria-hidden="true"
                  className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${retraso}ms` }}
                />
              ))}
              <span aria-hidden="true" className="ml-2 text-xs text-slate-500">escribiendo…</span>
            </div>
          </div>
        )}

        <div ref={finDeLista} />
      </div>

      {/* ===== Campo para escribir ===== */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviar(texto); }}
        className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white px-3 pt-3
                   pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4"
      >
        <div className="flex-1">
          <label htmlFor="pregunta" className="sr-only">Escribe tu pregunta</label>
          <textarea
            id="pregunta"
            ref={campoTexto}
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alPresionarTecla}
            maxLength={MAX_MENSAJE}
            placeholder="Escribe tu pregunta…"
            className="max-h-32 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2 text-base
                       focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {/* Contador solo cuando ya se acerca al límite */}
          {texto.length > MAX_MENSAJE - 100 && (
            <p className="px-2 text-right text-xs text-slate-500">{texto.length}/{MAX_MENSAJE}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={escribiendo || !texto.trim()}
          className="mb-0.5 rounded-full bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

// Una burbuja del chat: pregunta (derecha, azul), respuesta (izquierda, blanca) o error (rojo).
function Burbuja({ mensaje, onReintentar }) {
  if (mensaje.tipo === "usuario") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-blue-700 px-4 py-2 text-white md:max-w-[70%]">
          {mensaje.texto}
        </p>
      </div>
    );
  }

  if (mensaje.tipo === "error") {
    return (
      <div className="flex justify-start">
        <div role="alert" className="max-w-[85%] rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-4 py-2 text-red-800 md:max-w-[70%]">
          <p>No pude obtener respuesta: {mensaje.texto}</p>
          <button onClick={onReintentar} className="mt-1 text-sm font-semibold underline hover:no-underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Respuesta del asistente, con sus fuentes debajo (sin repetir)
  const fuentes = [...new Set((mensaje.fuentes ?? []).map((f) => NOMBRE_FUENTE[f] ?? f))];
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] md:max-w-[70%]">
        <p className={`whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm ${
          mensaje.apagado ? "bg-slate-200 text-slate-700" : "bg-white text-slate-800 md:bg-slate-100"
        }`}>
          {mensaje.texto}
        </p>
        {!mensaje.apagado && (
          <p className="mt-1 px-2 text-xs text-slate-500">
            {fuentes.length
              ? <>📄 Fuentes: {fuentes.join(", ")}</>
              : "Sin consulta a la base de datos"}
          </p>
        )}
      </div>
    </div>
  );
}
