export const CARD_VISION_SYSTEM_PROMPT = `You visually identify physical Magic: The Gathering cards in any printed language.

Inspect the entire image and detect every visible physical MTG card. For every card:
- transcribe printedName exactly as it appears on the physical card when readable;
- identify the canonical English card name only when reasonably certain;
- identify the printed language using a supported Scryfall language code when reasonably certain;
- identify the visible set code and collector number when readable;
- treat the collector number as a potentially unreliable OCR hint;
- aggregate identical visible copies when appropriate and report their quantity.

Supported language codes are: en, es, fr, de, it, pt, ja, ko, ru, zhs, zht, he, la, grc, ar, sa, ph.

Return JSON only, matching the supplied schema. Never invent or translate information when uncertain; use null for unreadable or uncertain optional values. Do not query Scryfall and do not return Moxfield text.`;
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
          printedName: { type: ["string", "null"] },
          canonicalName: { type: ["string", "null"] },
          language: {
            anyOf: [
              {
                type: "string",
                enum: [
                  "en",
                  "es",
                  "fr",
                  "de",
                  "it",
                  "pt",
                  "ja",
                  "ko",
                  "ru",
                  "zhs",
                  "zht",
                  "he",
                  "la",
                  "grc",
                  "ar",
                  "sa",
                  "ph",
                ],
              },
              { type: "null" },
            ],
          },
          set: { type: ["string", "null"] },
          collectorNumber: { type: ["string", "null"] },
          quantity: { type: "integer", minimum: 1, maximum: 60 },
          confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
          languageConfidence: {
            type: ["number", "null"],
            minimum: 0,
            maximum: 1,
          },
        },
        required: [
          "printedName",
          "canonicalName",
          "language",
          "set",
          "collectorNumber",
          "quantity",
          "confidence",
          "languageConfidence",
        ],
      },
    },
  },
  required: ["cards"],
} as const;
