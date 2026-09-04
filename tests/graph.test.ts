// tests/graph.test.ts
import { describe, it, expect } from "vitest";
import { runMentorAgentWorkflow, validateGapCondition, routerNode } from "../lib/agents/graph";
import {
  searchKnowledge,
  searchLearningResourcesForSkills,
  saveRoadmap,
  getRoadmap,
  calculateReadiness,
} from "../lib/tools/mentor-tools";
import type { MentorState } from "../lib/agents/graph";

describe("Unified LangGraph Mentor Multi-Agent Workflow", () => {
  it("should run analysis mode through all nodes and produce report + roadmap", async () => {
    const state = await runMentorAgentWorkflow({
      userId: "user_test_123",
      mode: "analysis",
      resumeText: "Experienced JavaScript, React, and Node.js developer with basic SQL knowledge.",
      jdText: "Looking for Senior React, TypeScript, and PostgreSQL developer with Docker experience.",
    });

    expect(state).toBeDefined();
    expect(state.userId).toBe("user_test_123");
    expect(state.mode).toBe("analysis");

    // Verify Resume Analyzer node
    expect(state.resumeData).toBeDefined();
    expect(state.resumeData?.skills.length).toBeGreaterThan(0);

    // Verify JD Analyzer node
    expect(state.jdData).toBeDefined();
    expect(state.jdData?.requiredSkills.length).toBeGreaterThan(0);

    // Verify Gap Analyzer node
    expect(state.gapReport).toBeDefined();
    expect(state.matchScore).toBeGreaterThanOrEqual(10);
    expect(state.matchScore).toBeLessThanOrEqual(98);
    expect(state.rawGaps.length).toBeGreaterThan(0);

    // Verify RAG Retriever node
    expect(typeof state.ragContext).toBe("string");
    expect(state.ragContext.length).toBeGreaterThan(10);

    // Verify Roadmap Generator node
    expect(state.roadmap).toBeDefined();
    expect(state.roadmap?.weeks.length).toBe(4);
    expect(state.savedRoadmap).toBeDefined();
  });

  it("should evaluate interview answers and dynamically adapt difficulty", async () => {
    // 1. Weak answer -> easy difficulty
    const weakState = await runMentorAgentWorkflow({
      userId: "user_test_123",
      mode: "interview",
      currentQuestion: {
        id: "q-test-1",
        question: "Explain the architecture and concurrency model of Node.js.",
        targetSkill: "Node.js",
        difficulty: "medium",
      },
      userAnswer: "It has event loop.",
    });

    expect(weakState.evaluation).toBeDefined();
    expect(weakState.evaluation?.score).toBeLessThanOrEqual(5);
    expect(weakState.evaluation?.recommendedDifficulty).toBe("easy");
    expect(weakState.interviewHistory.length).toBe(1);

    // 2. Strong answer -> hard difficulty
    const strongState = await runMentorAgentWorkflow({
      userId: "user_test_123",
      mode: "interview",
      currentQuestion: {
        id: "q-test-2",
        question: "How do you handle database connection pooling and query optimization in PostgreSQL?",
        targetSkill: "PostgreSQL",
        difficulty: "medium",
      },
      userAnswer:
        "We use PgBouncer in transaction pooling mode to manage connections. For slow queries, we analyze EXPLAIN ANALYZE buffers, add composite B-Tree or partial indexes, partition high-volume tables, and cache hot read paths in Redis.",
    });

    expect(strongState.evaluation).toBeDefined();
    expect(strongState.evaluation?.score).toBeGreaterThanOrEqual(8);
    expect(strongState.evaluation?.recommendedDifficulty).toBe("hard");
    expect(strongState.interviewHistory.length).toBe(1);
  });

  it("should calculate 4-pillar readiness in dashboard mode", async () => {
    const state = await runMentorAgentWorkflow({
      userId: "user_test_123",
      mode: "dashboard",
      resumeText: "React, Node.js, TypeScript engineer",
      jdText: "Senior Full Stack Engineer",
    });

    expect(state.readinessScore).toBeDefined();
    expect(state.readinessScore.overallScore).toBeGreaterThanOrEqual(0);
    expect(state.readinessScore.overallScore).toBeLessThanOrEqual(100);
    expect(state.readinessScore.resumeJdScore).toBeDefined();
    expect(state.readinessScore.codingScore).toBeDefined();
  });

  it("should test conditional routing and validation gate logic", () => {
    // Validation gate
    const emptyState = { rawGaps: [], iterationCount: 0 } as unknown as MentorState;
    expect(validateGapCondition(emptyState)).toBe("retry");

    const validState = { rawGaps: [{ skill: "Docker" }], iterationCount: 0 } as unknown as MentorState;
    expect(validateGapCondition(validState)).toBe("valid");

    // Router
    expect(routerNode({ mode: "interview" } as MentorState)).toBe("interview");
    expect(routerNode({ mode: "dashboard" } as MentorState)).toBe("dashboard");
    expect(routerNode({ mode: "analysis" } as MentorState)).toBe("analysis");
  });

  it("should verify backend tools layer", async () => {
    // 1. RAG knowledge search
    const resources = await searchKnowledge("System Design microservices", 2);
    expect(resources.length).toBeGreaterThan(0);
    expect(resources[0].title).toBeDefined();

    const skillResources = await searchLearningResourcesForSkills(["PostgreSQL", "Docker"], 3);
    expect(skillResources.resources.length).toBeGreaterThan(0);
    expect(skillResources.contextText.length).toBeGreaterThan(0);

    // 2. Roadmap tool
    const saved = await saveRoadmap(
      "rep_test_tool",
      {
        targetRole: "Full Stack Engineer",
        estimatedWeeks: 4,
        weeks: [
          {
            week: 1,
            focus: "System Design",
            topics: ["Scalability"],
            resources: [],
            milestones: ["Design system"],
          },
        ],
      },
      "user_test_123"
    );
    expect(saved.id).toBeDefined();

    const fetched = await getRoadmap(saved.id, "user_test_123");
    expect(fetched).toBeDefined();
    expect(fetched?.targetRole).toBe("Full Stack Engineer");

    // 3. Readiness tool
    const readiness = await calculateReadiness({
      matchScore: 80,
      gapCount: { high: 1, medium: 1, low: 0 },
    });
    expect(readiness.overallScore).toBeGreaterThan(0);
  });
});
