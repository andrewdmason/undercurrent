import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default model for ChatGPT 5.1
export const DEFAULT_MODEL = "gpt-5.1";

