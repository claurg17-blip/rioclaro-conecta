// Servicio del chat con el asistente (bucle de function calling).
// Lo usa la ruta POST /api/agente/chat. Por cada mensaje:
//   1) manda la pregunta al agente de Foundry, con el rol y la sucursal del usuario,
//   2) si el agente pide herramientas, el backend las ejecuta (ejecutor.js) y le regresa el resultado,
//   3) repite hasta que el agente da su respuesta final (máximo 5 vueltas, para limitar el costo),
//   4) guarda la pregunta y la respuesta en bitacora_ia.
// La conexión a Foundry usa DefaultAzureCredential: en tu PC, tu sesión de "az login";
// en Azure, la identidad administrada del App Service. No hay claves en el código.
import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";
import { ejecutarHerramienta } from "./ejecutor.js";
import { pool } from "../db.js";

const project = new AIProjectClient(process.env.FOUNDRY_PROJECT_ENDPOINT, new DefaultAzureCredential());
const openai = project.getOpenAIClient();
// Así se le indica a cada llamada qué agente usar (el que creó scripts/crear-agente.mjs).
// Ojo: Foundry ya no acepta la propiedad "agent" (la que trae el README del SDK); ahora es "agent_reference".
const agente = { body: { agent_reference: { name: process.env.AGENT_NAME, type: "agent_reference" } } };

export async function conversar({ mensaje, conversacionId, usuario }) {
  // Switch de apagado: con AGENTE_HABILITADO distinto de "true" no se llama a Foundry (costo cero)
  if (process.env.AGENTE_HABILITADO !== "true")
    return { texto: "El asistente está apagado temporalmente. Usa los módulos de la app.", apagado: true };

  // Nombre de la sucursal del usuario, para dárselo al agente como contexto
  const { rows: [s] } = await pool.query(
    "SELECT nombre AS sucursal FROM sucursales WHERE id = $1", [usuario.sucursal_id]);

  // Si es la primera pregunta se crea una conversación nueva; si no, se continúa la misma
  const convId = conversacionId ?? (await openai.conversations.create()).id;
  // Solo se envía rol y sucursal: nada de nombre, correo ni otros datos personales
  let input = [{ type: "message", role: "user",
    content: `[rol=${usuario.rol}; sucursal=${s?.sucursal ?? "N/A"}] ${mensaje}` }];
  const fuentes = []; // nombres de las herramientas usadas (se muestran en el chat y van a la bitácora)

  for (let i = 0; i < 5; i++) {                       // tope de vueltas = tope de costo
    const resp = await openai.responses.create({ input, conversation: convId }, agente);
    const llamadas = resp.output.filter((o) => o.type === "function_call");

    // Sin llamadas a herramientas = respuesta final: se guarda en la bitácora y se regresa
    if (!llamadas.length) {
      await pool.query(
        "INSERT INTO bitacora_ia (usuario_id, pregunta, herramientas, respuesta) VALUES ($1,$2,$3,$4)",
        [usuario.id, mensaje, fuentes, resp.output_text]);
      return { texto: resp.output_text, fuentes, conversacionId: convId };
    }

    // El agente pidió herramientas: se ejecutan con los permisos del usuario
    // y sus resultados son la entrada de la siguiente vuelta
    input = [];
    for (const c of llamadas) {
      const salida = await ejecutarHerramienta(c.name, JSON.parse(c.arguments), usuario);
      fuentes.push(c.name);
      input.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(salida) });
    }
  }
  return { texto: "No pude completar la consulta. Intenta de nuevo o revisa el módulo correspondiente.", fuentes, conversacionId: convId };
}
