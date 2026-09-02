// tests/interview.test.ts
import { describe, it, expect } from "vitest";
import { generateQuestion, selectTargetSkillsForInterview } from "../lib/agents/interviewer";
import { evaluateAnswer } from "../lib/agents/evaluator";
import type { SkillGap } from "../lib/types";

describe("Mock Interview Multi-Agent", () => {
  it("should prioritize high severity skill gaps for interview questions", () => {
    const gaps: SkillGap[] = [
      { skill: "HTML", requiredLevel: "basic", currentLevel: "basic", gapSeverity: "low", evidence: "" },
      { skill: "System Design", requiredLevel: "advanced", currentLevel: "none", gapSeverity: "high", evidence: "" },
      { skill: "PostgreSQL", requiredLevel: "intermediate", currentLevel: "basic", gapSeverity: "medium", evidence: "" },
    ];

    const targets = selectTargetSkillsForInterview(gaps);
    expect(targets[0]).toBe("System Design");
    expect(targets[1]).toBe("PostgreSQL");
    expect(targets[2]).toBe("HTML");
  });

  it("should generate a valid interview question targeting specified gap", async () => {
    const q = await generateQuestion({
      targetSkill: "TypeScript",
      difficulty: "medium",
      turnIndex: 0,
    });

    expect(q.id).toBeDefined();
    expect(q.question.length).toBeGreaterThan(10);
    expect(q.targetSkill).toBe("TypeScript");
    expect(q.difficulty).toBe("medium");
  });

  it("should evaluate interview answers and adapt difficulty based on score", async () => {
    const thoroughEval = await evaluateAnswer({
      question: {
        id: "q-1",
        question: "Explain the difference between interface and type in TypeScript.",
        targetSkill: "TypeScript",
        difficulty: "medium",
      },
      answer: "Interfaces in TypeScript are open for declaration merging and ideal for object model definitions and public API contracts, whereas type aliases can define unions, primitives, tuples, and intersection types using mapped and conditional types.",
    });

    expect(thoroughEval.score).toBeGreaterThanOrEqual(7);
    expect(thoroughEval.feedback.length).toBeGreaterThan(10);
    expect(thoroughEval.recommendedDifficulty).toBe("hard");

    const shortEval = await evaluateAnswer({
      question: {
        id: "q-2",
        question: "Explain how React reconciliation works.",
        targetSkill: "React",
        difficulty: "medium",
      },
      answer: "It diffs dom.",
    });

    expect(shortEval.score).toBeLessThanOrEqual(5);
    expect(shortEval.recommendedDifficulty).toBe("easy");
  });
});
