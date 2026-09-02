// tests/readiness.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateCodingReadiness,
  calculateOverallReadinessScore,
  generateDefaultReadinessSummary,
} from "../lib/services/readiness";
import type { TrackerStats } from "../lib/types";

describe("Readiness Scoring Engine", () => {
  it("should calculate coding readiness accurately based on problem thresholds", () => {
    const emptyStats: TrackerStats[] = [];
    expect(calculateCodingReadiness(emptyStats)).toBe(60);

    const highStats: TrackerStats[] = [
      { platform: "leetcode", solved: 450, rating: 1850, lastSynced: "2026-09-02" },
      { platform: "codeforces", solved: 200, rating: 1500, lastSynced: "2026-09-02" },
    ];
    // Total 650 solved + high rating bonus -> 100
    const highVal = calculateCodingReadiness(highStats);
    expect(highVal).toBeGreaterThanOrEqual(95);
  });

  it("should compute overall readiness deterministically with configurable weights", () => {
    const trackers: TrackerStats[] = [
      { platform: "leetcode", solved: 300, rating: 1600, lastSynced: "2026-09-02" },
    ];

    const result = calculateOverallReadinessScore({
      matchScore: 80,
      gapCount: { high: 1, medium: 1, low: 0 },
      trackerStats: trackers,
      interviewScores: [8.0, 9.0],
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.resumeJdScore).toBe(80);
    expect(result.skillGapScore).toBe(82); // 100 - (12 + 6)
    expect(result.interviewScore).toBe(85); // average of 8 and 9 * 10
  });

  it("should produce valid default readiness summary without nulls", () => {
    const summary = generateDefaultReadinessSummary();
    expect(summary.overallScore).toBeGreaterThan(0);
    expect(summary.reportsCompleted).toBeGreaterThan(0);
    expect(summary.interviewsCompleted).toBeGreaterThan(0);
    expect(summary.trackerStats.length).toBe(4);
    expect(summary.history.length).toBeGreaterThan(0);
    for (const h of summary.history) {
      expect(h.score).toBeGreaterThanOrEqual(0);
      expect(h.score).toBeLessThanOrEqual(100);
      expect(typeof h.date).toBe("string");
    }
  });
});
