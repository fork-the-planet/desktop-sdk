export const xaiInfo = {
  name: "xAI",
  baseUrl: "https://api.x.ai/v1",
  modelFilters: [
    "grok-4-1-fast-non-reasoning",
    "grok-4-0709",
    "grok-3-mini",
    "grok-3",
  ] as string[],
  modelNames: {
    "grok-4-1-fast-non-reasoning": "Grok 4.1",
    "grok-4-0709": "Grok 4",
    "grok-3-mini": "Grok 3 Mini",
    "grok-3": "Grok 3",
  },
};
