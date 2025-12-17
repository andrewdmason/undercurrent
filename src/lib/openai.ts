import OpenAI from "openai";

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Keep for backwards compatibility but mark as deprecated
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Default model for ChatGPT 5.1
export const DEFAULT_MODEL = "gpt-5.1";

// Image generation model (ChatGPT's native image model - 1.5 is faster with better prompt adherence)
export const IMAGE_GEN_MODEL = "gpt-image-1.5";

// Context window limits
export const OPENAI_CONTEXT_WINDOW = 128_000; // 128K tokens
export const OPENAI_WARNING_THRESHOLD = 100_000; // ~80% of context window


