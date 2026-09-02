// lib/agents/interviewer.ts
import { generateStructuredAI } from "@/lib/ai/gemini";
import { INTERVIEW_QUESTION_PROMPT } from "@/lib/ai/prompts";
import { InterviewQuestionSchema } from "@/lib/validation/schemas";
import type { InterviewQuestion, InterviewSession, InterviewTurn, SkillGap } from "@/lib/types";

export const DEFAULT_MAX_INTERVIEW_TURNS = 5;

const QUESTION_BANK: Record<string, { easy: string[]; medium: string[]; hard: string[] }> = {
  "React": {
    easy: [
      "Explain the difference between state and props in React.",
      "What is the virtual DOM and how does React reconciliation work?",
    ],
    medium: [
      "Explain how `useEffect` dependencies work and how to prevent memory leaks in async effects.",
      "What are React Server Components and how do they differ from traditional Client Components?",
    ],
    hard: [
      "How does Concurrent Mode and Fiber architecture schedule high vs low priority updates in React 18?",
      "Design a custom hook for optimistic UI updates with automatic rollback on network failure.",
    ],
  },
  "TypeScript": {
    easy: [
      "What is the difference between `interface` and `type` in TypeScript?",
      "What are union and intersection types?",
    ],
    medium: [
      "How do Generics and Type Guards work in TypeScript? Give an example of a custom type predicate.",
      "Explain mapped types and the `Record<K, T>` utility type.",
    ],
    hard: [
      "How do template literal types and conditional type inference (`infer` keyword) work? Construct a type that extracts route parameters from a URL path string.",
    ],
  },
  "Node.js": {
    easy: [
      "Explain the single-threaded event loop mechanism in Node.js.",
      "What is the difference between `setImmediate()` and `process.nextTick()`?",
    ],
    medium: [
      "How do Streams and backpressure work in Node.js when processing large data files?",
      "Explain how Worker Threads and the cluster module achieve parallel CPU-bound execution.",
    ],
    hard: [
      "How does libuv manage the thread pool for async I/O, and how do you diagnose event loop lag and heap memory leaks in a production Node service?",
    ],
  },
  "System Design": {
    easy: [
      "What is the difference between horizontal and vertical scaling?",
      "What is a reverse proxy and how does it differ from a forward proxy?",
    ],
    medium: [
      "Explain the trade-offs between SQL (relational) and NoSQL databases under high write throughput.",
      "How would you implement distributed caching with Redis and handle cache stampede / cache penetration?",
    ],
    hard: [
      "Design a real-time collaborative document editing system or notification engine with 10M active daily users, detailing data partitioning, consistency guarantees, and fault tolerance.",
    ],
  },
  "PostgreSQL": {
    easy: [
      "What is the difference between an INNER JOIN and a LEFT OUTER JOIN in SQL?",
      "What are primary keys and foreign keys?",
    ],
    medium: [
      "Explain how B-Tree indexes work in PostgreSQL and why index scanning might be bypassed for certain WHERE clauses.",
      "What are transaction isolation levels and how does MVCC prevent dirty reads?",
    ],
    hard: [
      "How do you optimize a slow query taking 15 seconds on a 50-million row table using EXPLAIN (ANALYZE, BUFFERS), partitioning, and covering indexes?",
    ],
  },
};

export async function generateQuestion(params: {
  targetSkill: string;
  difficulty: "easy" | "medium" | "hard";
  turnIndex: number;
}): Promise<InterviewQuestion> {
  const { targetSkill, difficulty, turnIndex } = params;
  const questionId = `q_${Date.now()}_${turnIndex}`;

  return generateStructuredAI<InterviewQuestion>({
    systemPrompt: INTERVIEW_QUESTION_PROMPT,
    userPrompt: `Generate an interview question for skill: "${targetSkill}", difficulty: "${difficulty}". Include unique id "${questionId}".`,
    schema: InterviewQuestionSchema,
    mockFallback: () => {
      const bank = QUESTION_BANK[targetSkill] || QUESTION_BANK["System Design"];
      const list = bank[difficulty] || bank.medium;
      const questionText = list[turnIndex % list.length] || `Explain core concepts and architectural best practices for ${targetSkill} in production.`;

      return {
        id: questionId,
        question: questionText,
        targetSkill,
        difficulty,
      };
    },
  });
}

export function selectTargetSkillsForInterview(gaps: SkillGap[]): string[] {
  if (!gaps || gaps.length === 0) {
    return ["Data Structures", "System Design", "JavaScript", "Database Optimization"];
  }

  // Prioritize high severity gaps first, then medium
  const sorted = [...gaps].sort((a, b) => {
    const sevScore = { high: 3, medium: 2, low: 1 };
    return sevScore[b.gapSeverity] - sevScore[a.gapSeverity];
  });

  return sorted.map((g) => g.skill);
}
