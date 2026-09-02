// lib/embeddings/minilm.ts
import { pipeline, env } from "@xenova/transformers";

// Configure transformers cache and environment
env.allowLocalModels = false;
env.useBrowserCache = false;

let extractorPipeline: any = null;

export async function getEmbeddingPipeline() {
  if (!extractorPipeline) {
    try {
      extractorPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (err) {
      console.warn("Failed to load Xenova/all-MiniLM-L6-v2 pipeline, using fallback vector:", err);
      extractorPipeline = null;
    }
  }
  return extractorPipeline;
}

/**
 * Generate 384-dimensional embedding for a text string using all-MiniLM-L6-v2.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const clean = text.trim().slice(0, 1000);
  if (!clean) {
    return new Array(384).fill(0);
  }

  try {
    const pipe = await getEmbeddingPipeline();
    if (pipe) {
      const output = await pipe(clean, { pooling: "mean", normalize: true });
      return Array.from(output.data);
    }
  } catch (err) {
    console.warn("Embedding generation error:", err);
  }

  // Deterministic 384-dimensional fallback vector based on string hash
  return generateDeterministicFallbackVector(clean);
}

export function generateDeterministicFallbackVector(text: string, dimensions = 384): number[] {
  const vec = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (i * 31 + charCode) % dimensions;
    vec[index] += Math.sin(charCode + i);
  }
  // Normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
