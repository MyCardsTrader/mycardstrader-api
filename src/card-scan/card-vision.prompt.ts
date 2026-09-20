export const CARD_VISION_SYSTEM_PROMPT = `You visually identify physical Magic: The Gathering cards.

Inspect the entire image and detect every visible physical MTG card. For every card, identify the canonical English card name when readable, the visible set code when readable, and the collector number when readable. Collector numbers are OCR hints and may be unreliable. Aggregate identical visible copies when appropriate and report their quantity.

Return JSON only, matching the supplied schema. Never invent information when it is unreadable; use null for unreadable optional text. Do not query Scryfall and do not return Moxfield text.`;

export const CARD_VISION_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      maxItems: 60,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: ["string", "null"] },
          set: { type: ["string", "null"] },
          collectorNumber: { type: ["string", "null"] },
          quantity: { type: "integer", minimum: 1, maximum: 60 },
          confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
        },
        required: ["name", "set", "collectorNumber", "quantity", "confidence"],
      },
    },
  },
  required: ["cards"],
} as const;
