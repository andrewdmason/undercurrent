import { getOpenAI } from "./openai";

// Embedding model - small, fast, good for short text matching
const EMBEDDING_MODEL = "text-embedding-3-small";

// Similarity threshold for auto-matching reference images
export const MATCH_THRESHOLD = 0.7;

/**
 * Generate an embedding vector for a text string
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call (more efficient)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const openai = getOpenAI();
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  
  // Sort by index to ensure order matches input
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Find the best matching item from a list based on embedding similarity
 * Returns the item and its similarity score, or null if no match above threshold
 */
export async function findBestMatch<T extends { description: string | null }>(
  query: string,
  candidates: T[],
  threshold: number = MATCH_THRESHOLD
): Promise<{ item: T; similarity: number } | null> {
  // Filter out candidates without descriptions
  const validCandidates = candidates.filter((c) => c.description);
  if (validCandidates.length === 0) return null;
  
  // Get embeddings for query and all candidate descriptions
  const textsToEmbed = [query, ...validCandidates.map((c) => c.description!)];
  const embeddings = await embedTexts(textsToEmbed);
  
  const queryEmbedding = embeddings[0];
  const candidateEmbeddings = embeddings.slice(1);
  
  // Find best match
  let bestMatch: { item: T; similarity: number } | null = null;
  
  for (let i = 0; i < validCandidates.length; i++) {
    const similarity = cosineSimilarity(queryEmbedding, candidateEmbeddings[i]);
    
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { item: validCandidates[i], similarity };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Find matches for multiple queries against the same candidates
 * More efficient than calling findBestMatch multiple times
 */
export async function findBestMatches<T extends { description: string | null }>(
  queries: string[],
  candidates: T[],
  threshold: number = MATCH_THRESHOLD
): Promise<Map<string, { item: T; similarity: number } | null>> {
  const results = new Map<string, { item: T; similarity: number } | null>();
  
  if (queries.length === 0) return results;
  
  // Filter out candidates without descriptions
  const validCandidates = candidates.filter((c) => c.description);
  if (validCandidates.length === 0) {
    queries.forEach((q) => results.set(q, null));
    return results;
  }
  
  // Get all embeddings in one call
  const textsToEmbed = [...queries, ...validCandidates.map((c) => c.description!)];
  const embeddings = await embedTexts(textsToEmbed);
  
  const queryEmbeddings = embeddings.slice(0, queries.length);
  const candidateEmbeddings = embeddings.slice(queries.length);
  
  // Find best match for each query
  for (let qi = 0; qi < queries.length; qi++) {
    let bestMatch: { item: T; similarity: number } | null = null;
    
    for (let ci = 0; ci < validCandidates.length; ci++) {
      const similarity = cosineSimilarity(queryEmbeddings[qi], candidateEmbeddings[ci]);
      
      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { item: validCandidates[ci], similarity };
        }
      }
    }
    
    results.set(queries[qi], bestMatch);
  }
  
  return results;
}
