// lib/rag/vector-store.ts
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings/minilm";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface LearningResourceItem {
  id: string;
  topic: string;
  title: string;
  content: string;
  url: string;
  resource_type: "documentation" | "article" | "course" | "practice";
  similarity?: number;
}

const STATIC_KNOWLEDGE_BASE: Omit<LearningResourceItem, "id">[] = [
  {
    topic: "System Design",
    title: "System Design Primer & Architecture Tradeoffs",
    content: "Comprehensive guide to microservices, database sharding, CAP theorem, load balancing, caching strategies with Redis, and async messaging with Kafka.",
    url: "https://github.com/donnemartin/system-design-primer",
    resource_type: "course",
  },
  {
    topic: "PostgreSQL & Relational Databases",
    title: "PostgreSQL Query Optimization & Indexing",
    content: "Mastering B-Tree, GIN, GiST, pgvector indexes, transaction isolation levels, EXPLAIN ANALYZE, and connection pooling for high-throughput backends.",
    url: "https://www.postgresql.org/docs/current/indexes.html",
    resource_type: "documentation",
  },
  {
    topic: "Docker & Containerization",
    title: "Docker Best Practices & Container Orchestration",
    content: "Multi-stage Dockerfiles, image minimization, security scanning, docker-compose networks, and Kubernetes pod management.",
    url: "https://docs.docker.com/develop/develop-images/dockerfile_best-practices/",
    resource_type: "documentation",
  },
  {
    topic: "Data Structures & Algorithms",
    title: "Dynamic Programming & Graph Patterns",
    content: "Techniques for memoization, tabulation, state compression, BFS/DFS, Dijkstra, topological sort, and LeetCode problem patterns.",
    url: "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns",
    resource_type: "article",
  },
  {
    topic: "React & Next.js",
    title: "React Server Components & Next.js 14 Architecture",
    content: "Server Components vs Client Components, suspense boundaries, streaming SSR, server actions, and caching layers.",
    url: "https://nextjs.org/docs/app/building-your-application",
    resource_type: "documentation",
  },
  {
    topic: "TypeScript",
    title: "Production TypeScript Patterns & Advanced Types",
    content: "Conditional types, mapped types, template literal types, type guards, and generics in production full-stack systems.",
    url: "https://www.typescriptlang.org/docs/handbook/2/types-from-types.html",
    resource_type: "documentation",
  },
  {
    topic: "Node.js & Concurrency",
    title: "Node.js Event Loop, Worker Threads & Stream Processing",
    content: "Understanding libuv, task queues, memory management, backpressure in streams, and clustering in Node.js.",
    url: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick",
    resource_type: "article",
  },
  {
    topic: "Redis & Caching",
    title: "Distributed Caching & Redis Data Structures",
    content: "Cache-aside, write-through, cache invalidation, Redis streams, pub/sub, and distributed locks with Redlock.",
    url: "https://redis.io/docs/manual/patterns/",
    resource_type: "documentation",
  },
];

export async function searchLearningResources(
  query: string,
  limit = 4,
  matchThreshold = 0.3
): Promise<LearningResourceItem[]> {
  const queryEmbedding = await generateEmbedding(query);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await (supabase as any).rpc("match_learning_resources", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: limit,
    });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data as LearningResourceItem[];
    }
  } catch (err) {
    // Supabase RPC unavailable or demo mode
  }

  // In-memory fallback matching with cosine similarity on embeddings
  const scored = await Promise.all(
    STATIC_KNOWLEDGE_BASE.map(async (item, index) => {
      const itemEmbedding = await generateEmbedding(`${item.topic} ${item.title} ${item.content}`);
      const sim = cosineSimilarity(queryEmbedding, itemEmbedding);
      return {
        id: `kb-fallback-${index + 1}`,
        ...item,
        similarity: sim,
      };
    })
  );

  scored.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  return scored.slice(0, limit);
}
