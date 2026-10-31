// Definición de las herramientas (function calling) que el agente puede pedir.
// Aquí solo se describen: nombre, para qué sirven y qué parámetros llevan.
// Quien las ejecuta de verdad es el backend (src/agente/ejecutor.js).
// Si cambias algo aquí, vuelve a ejecutar scripts/crear-agente.mjs.
export const herramientas = [
  {
    type: "function", name: "buscar_existencias", strict: true,
    description: "Busca un producto por nombre, alias o SKU y regresa sus existencias por sucursal.",
    parameters: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Nombre como lo diga el usuario, ej. 'cloro de litro'" },
        sucursal: { type: ["string", "null"], description: "Guadalajara, Zapopan, León, Querétaro, Aguascalientes o null para todas" },
      },
      required: ["texto", "sucursal"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "consultar_pedido", strict: true,
    description: "Consulta un pedido por folio (RC-0000) o los últimos pedidos de un cliente por nombre.",
    parameters: {
      type: "object",
      properties: { folio: { type: ["string", "null"] }, cliente: { type: ["string", "null"] } },
      required: ["folio", "cliente"], additionalProperties: false,
    },
  },
  {
    type: "function", name: "registrar_seguimiento", strict: true,
    description: "Registra una queja o duda de cliente ligada a un pedido. Úsala solo después de que el usuario confirme.",
    parameters: {
      type: "object",
      properties: {
        folio: { type: "string" },
        canal: { type: "string", enum: ["telefono", "whatsapp", "correo"] },
        motivo: { type: "string", enum: ["retraso", "faltante", "producto_danado", "duda", "otro"] },
        descripcion: { type: "string" },
      },
      required: ["folio", "canal", "motivo", "descripcion"], additionalProperties: false,
    },
  },
];
