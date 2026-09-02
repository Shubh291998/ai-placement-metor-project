// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  const apiKey = process.env.GEMINI_API_KEY;
  return !apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key";
}

export function cleanJsonString(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

export async function generateStructuredAI<T>(options: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T, any, any>;
  mockFallback: () => T;
  modelName?: string;
  maxRetries?: number;
}): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    schema,
    mockFallback,
    modelName = "gemini-1.5-flash",
    maxRetries = 1,
  } = options;

  if (isDemoMode()) {
    return mockFallback();
  }

  const client = getGeminiClient();
  if (!client) {
    return mockFallback();
  }

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  let lastError: unknown = null;
  let currentPrompt = userPrompt;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(currentPrompt);
      const responseText = result.response.text();
      const cleaned = cleanJsonString(responseText);
      const parsedJson = JSON.parse(cleaned);
      const validated = schema.parse(parsedJson);
      return validated;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        currentPrompt = `${userPrompt}\n\nIMPORTANT: Your previous output had schema errors or invalid JSON (${String(
          err
        )}). Correct the JSON and strictly return valid JSON according to instructions.`;
      }
    }
  }

  console.warn("Gemini structured output failed after retries, falling back to deterministic mock:", lastError);
  return mockFallback();
}
