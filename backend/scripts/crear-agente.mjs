// Script para crear o actualizar el agente en Microsoft Foundry.
// Cada vez que se ejecuta publica una NUEVA VERSIÓN del agente con las
// instrucciones y herramientas actuales. Ejecútalo desde la carpeta backend:
//   node scripts/crear-agente.mjs
// Requiere haber iniciado sesión antes con "az login" (DefaultAzureCredential la usa).
import "dotenv/config";
import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";
import { INSTRUCCIONES } from "../src/agente/instrucciones.js";
import { herramientas } from "../src/agente/herramientas.js";

const project = new AIProjectClient(process.env.FOUNDRY_PROJECT_ENDPOINT, new DefaultAzureCredential());
const agente = await project.agents.createVersion(process.env.AGENT_NAME, {
  kind: "prompt",
  model: process.env.MODEL_DEPLOYMENT,
  instructions: INSTRUCCIONES,
  tools: herramientas,
});
console.log(`Agente ${agente.name} versión ${agente.version} listo`);
