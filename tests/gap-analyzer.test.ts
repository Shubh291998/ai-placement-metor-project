// tests/gap-analyzer.test.ts
import { describe, it, expect } from "vitest";
import { calculateDeterministicMatchScore, runGapAnalyzerAgent } from "../lib/agents/gap-analyzer";
import { getMockParsedResume } from "../lib/parsers/pdf";
import { getMockParsedJobDescription } from "../lib/parsers/jd-scraper";
import type { SkillGap } from "../lib/types";

describe("LangGraph Gap Analyzer Agent", () => {
  it("should calculate deterministic match score based on skill proficiencies and gap penalties", () => {
    const resume = getMockParsedResume();
    const jd = getMockParsedJobDescription();

    const gaps: SkillGap[] = [
      {
        skill: "Docker",
        requiredLevel: "intermediate",
        currentLevel: "none",
        gapSeverity: "high",
        evidence: "Missing Docker in resume",
      },
      {
        skill: "PostgreSQL",
        requiredLevel: "intermediate",
        currentLevel: "basic",
        gapSeverity: "medium",
        evidence: "Basic level vs intermediate",
      },
    ];

    const score = calculateDeterministicMatchScore(resume, jd, gaps);
    expect(score).toBeGreaterThanOrEqual(10);
    expect(score).toBeLessThanOrEqual(98);
  });

  it("should execute full LangGraph workflow and return valid GapAnalyzerReport", async () => {
    const report = await runGapAnalyzerAgent({
      resumeText: "Experienced JavaScript and React developer with Node.js and SQL experience.",
      jobDescriptionText: "Looking for Senior React, TypeScript and Node.js engineer with System Design skills.",
    });

    expect(report).toBeDefined();
    expect(report.id).toBeDefined();
    expect(report.jobTitle).toBeDefined();
    expect(report.matchScore).toBeGreaterThanOrEqual(0);
    expect(report.matchScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.strengths)).toBe(true);
    expect(Array.isArray(report.gaps)).toBe(true);
    expect(Array.isArray(report.suggestedFocusAreas)).toBe(true);
  });
});
