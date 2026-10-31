// Página Asistente: chat con el agente de IA, estilo mensajería.
// - Aviso fijo arriba: es una IA y hay que verificar antes de prometer al cliente.
// - Debajo de cada respuesta se muestran las fuentes (qué datos consultó).
// - El conversacionId se guarda en el estado para que el agente recuerde la plática.
// - En celular ocupa toda la pantalla (tapa la barra y el menú, con botón "Volver");
//   en escritorio se ve dentro del Layout normal.
// Usa: POST /api/agente/chat → { texto, fuentes, conversacionId }
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Bot, FileText, Info, LoaderCircle, Plus, SendHorizontal, User } from "lucide-react";
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

// Avatares redondos junto a las burbujas (clases puestas directo en el ícono)
const estiloAvatarAsistente = "size-7 shrink-0 rounded-full bg-acento/10 p-1.5 text-acento";
const estiloAvatarUsuario = "size-7 shrink-0 rounded-full bg-superficie-2 p-1.5 text-texto-suave";

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
    // Celular: fondo de la página. Escritorio: un panel (tarjeta) con borde sutil.
    <div className="fixed inset-0 z-30 flex h-dvh flex-col bg-fondo pt-[env(safe-area-inset-top)]
                    md:static md:z-auto md:h-[calc(100dvh-6rem)] md:overflow-hidden md:rounded-xl md:border md:border-borde md:bg-superficie md:pt-0 md:shadow-sm">

      {/* ===== Encabezado ===== */}
      <header className="flex shrink-0 items-center gap-2 border-b border-borde bg-superficie px-3 py-2 text-texto md:px-4 md:py-3">
        {/* La flecha "←" ahora es el ícono ArrowLeft */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-texto-suave transition-colors hover:bg-superficie-2 hover:text-texto md:hidden"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          Volver
        </button>
        <h1 className="flex flex-1 items-center gap-2 text-lg font-bold md:text-2xl">
          {/* Ícono del asistente en un cuadro de acento */}
          <Bot className="size-8 rounded-lg bg-acento/10 p-1.5 text-acento" strokeWidth={2} aria-hidden="true" />
          Asistente
        </h1>
        {mensajes.length > 0 && (
          // Botón secundario (versión pequeña)
          <button
            onClick={nuevaConversacion}
            disabled={escribiendo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-borde bg-superficie-2 px-3 py-1.5 text-sm text-texto transition-colors hover:border-acento/50 disabled:opacity-50"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            Nueva conversación
          </button>
        )}
      </header>

      {/* ===== Aviso fijo de IA (no se mueve al hacer scroll) ===== */}
      <p role="note" className="mx-3 mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-alerta/30 bg-alerta/10 px-3 py-2 text-sm text-alerta md:mx-4">
        <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        Estás hablando con un asistente de IA. Verifica antes de prometer al cliente.
      </p>

      {/* ===== Mensajes (esta es la única parte con scroll) ===== */}
      <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-3 py-4 md:px-4">
        {/* Chat vacío: explicación y preguntas de ejemplo */}
        {mensajes.length === 0 && (
          <div className="mx-auto max-w-md pt-6 text-center text-texto-suave">
            {/* El 💬 ahora es el ícono Bot grande, centrado */}
            <p className="flex justify-center" aria-hidden="true">
              <Bot className="size-14 rounded-2xl bg-acento/10 p-3 text-acento" strokeWidth={2} aria-hidden="true" />
            </p>
            <p className="mt-3">Pregúntame por existencias, pedidos o registra un seguimiento.</p>
            <div className="mt-4 flex flex-col gap-2">
              {EJEMPLOS.map((ejemplo) => (
                <button
                  key={ejemplo}
                  onClick={() => enviar(ejemplo)}
                  className="rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-sm text-texto transition-colors hover:border-acento/50"
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
          <div className="flex items-end justify-start gap-2">
            <Bot className={estiloAvatarAsistente} strokeWidth={2} aria-hidden="true" />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-borde bg-superficie px-4 py-3">
              <span className="sr-only">El asistente está escribiendo…</span>
              {/* Puntitos que rebotan, en color de acento */}
              {[0, 150, 300].map((retraso) => (
                <span
                  key={retraso}
                  aria-hidden="true"
                  className="size-2 animate-bounce rounded-full bg-acento"
                  style={{ animationDelay: `${retraso}ms` }}
                />
              ))}
              {/* Ruedita que gira (animate-spin), junto al texto */}
              <LoaderCircle className="ml-2 size-3.5 animate-spin text-texto-suave" strokeWidth={2} aria-hidden="true" />
              <span aria-hidden="true" className="ml-1 text-xs text-texto-suave">escribiendo…</span>
            </div>
          </div>
        )}

        <div ref={finDeLista} />
      </div>

      {/* ===== Campo para escribir ===== */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviar(texto); }}
        className="flex shrink-0 items-end gap-2 border-t border-borde bg-superficie px-3 pt-3
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
            className="max-h-32 w-full resize-none rounded-2xl border border-borde bg-superficie-2 px-4 py-2 text-base text-texto
                       outline-none placeholder:text-texto-suave focus:border-acento focus:ring-2 focus:ring-acento/30"
          />
          {/* Contador solo cuando ya se acerca al límite */}
          {texto.length > MAX_MENSAJE - 100 && (
            <p className="px-2 text-right text-xs text-texto-suave">{texto.length}/{MAX_MENSAJE}</p>
          )}
        </div>
        {/* Botón primario solo con ícono: aria-label le da nombre para lectores de pantalla */}
        <button
          type="submit"
          disabled={escribiendo || !texto.trim()}
          aria-label="Enviar"
          className="mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-acento text-sobre-acento transition-colors hover:bg-acento-fuerte disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
        >
          <SendHorizontal className="size-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

// Una burbuja del chat: pregunta (derecha, acento), respuesta (izquierda, superficie) o error (rojo).
// Cada una lleva un avatar redondo: User para la persona, Bot para el asistente.
function Burbuja({ mensaje, onReintentar }) {
  if (mensaje.tipo === "usuario") {
    return (
      <div className="flex items-end justify-end gap-2">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-acento px-4 py-2 text-sobre-acento md:max-w-[70%]">
          {mensaje.texto}
        </p>
        <User className={estiloAvatarUsuario} strokeWidth={2} aria-hidden="true" />
      </div>
    );
  }

  if (mensaje.tipo === "error") {
    return (
      <div className="flex items-end justify-start gap-2">
        <Bot className={estiloAvatarAsistente} strokeWidth={2} aria-hidden="true" />
        <div role="alert" className="max-w-[85%] rounded-2xl rounded-bl-sm border border-peligro/30 bg-peligro/10 px-4 py-2 text-peligro md:max-w-[70%]">
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
    <div className="flex items-start justify-start gap-2">
      <Bot className={estiloAvatarAsistente} strokeWidth={2} aria-hidden="true" />
      <div className="max-w-[85%] md:max-w-[70%]">
        {/* "apagado" = el asistente no está disponible: burbuja gris más discreta */}
        <p className={`whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border px-4 py-2 ${
          mensaje.apagado ? "border-borde bg-superficie-2 text-texto-suave" : "border-borde bg-superficie text-texto"
        }`}>
          {mensaje.texto}
        </p>
        {!mensaje.apagado && (
          <p className="mt-1 flex items-center gap-1 px-2 text-xs text-texto-suave">
            {/* El 📄 ahora es el ícono FileText */}
            {fuentes.length
              ? <><FileText className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />Fuentes: {fuentes.join(", ")}</>
              : "Sin consulta a la base de datos"}
          </p>
        )}
      </div>
    </div>
  );
}
