import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default model for ChatGPT 5.1
export const DEFAULT_MODEL = "gpt-5.1";

// Context window limits
export const OPENAI_CONTEXT_WINDOW = 128_000; // 128K tokens
export const OPENAI_WARNING_THRESHOLD = 100_000; // ~80% of context window


