// lib/services/readiness.ts
import type { TrackerStats, ReadinessSummary } from "@/lib/types";

export interface ReadinessWeights {
  resumeJd: number; // default 0.35
  skillGap: number; // default 0.25
  coding: number;   // default 0.20
  interview: number;// default 0.20
}

export const DEFAULT_READINESS_WEIGHTS: ReadinessWeights = {
  resumeJd: 0.35,
  skillGap: 0.25,
  coding: 0.20,
  interview: 0.20,
};

export function calculateCodingReadiness(stats: TrackerStats[]): number {
  if (!stats || stats.length === 0) return 60;

  const totalSolved = stats.reduce((acc, curr) => acc + (curr.solved || 0), 0);

  // Scaled: 0 -> 20, 100 -> 50, 300 -> 75, 500+ -> 95
  let score = 20;
  if (totalSolved >= 600) {
    score = 98;
  } else if (totalSolved >= 400) {
    score = 90;
  } else if (totalSolved >= 250) {
    score = 80;
  } else if (totalSolved >= 100) {
    score = 65;
  } else if (totalSolved > 0) {
    score = 45;
  }

  // Bonus for active high ratings (e.g. LeetCode > 1700 or CF > 1400)
  const highRating = stats.some((s) => (s.rating || 0) >= 1650);
  if (highRating) {
    score = Math.min(100, score + 5);
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateOverallReadinessScore(params: {
  matchScore?: number;
  gapCount?: { high: number; medium: number; low: number };
  trackerStats: TrackerStats[];
  interviewScores?: number[]; // list of scores 0-10
  weights?: ReadinessWeights;
}): {
  overallScore: number;
  resumeJdScore: number;
  skillGapScore: number;
  codingScore: number;
  interviewScore: number;
} {
  const {
    matchScore = 78,
    gapCount = { high: 1, medium: 2, low: 1 },
    trackerStats,
    interviewScores = [7.5, 8.0],
    weights = DEFAULT_READINESS_WEIGHTS,
  } = params;

  // 1. Resume / JD Match Score (0-100)
  const resumeJdScore = Math.min(100, Math.max(0, matchScore));

  // 2. Skill-Gap Coverage (0-100)
  const penalty = (gapCount.high * 12) + (gapCount.medium * 6) + (gapCount.low * 2);
  const skillGapScore = Math.min(100, Math.max(20, 100 - penalty));

  // 3. Coding Platform Score (0-100)
  const codingScore = calculateCodingReadiness(trackerStats);

  // 4. Interview Performance Score (0-100)
  let interviewScore = 75;
  if (interviewScores.length > 0) {
    const avg = interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length;
    interviewScore = Math.min(100, Math.max(0, Math.round(avg * 10)));
  }

  // Weighted sum
  const rawOverall =
    weights.resumeJd * resumeJdScore +
    weights.skillGap * skillGapScore +
    weights.coding * codingScore +
    weights.interview * interviewScore;

  const overallScore = Math.round(Math.min(100, Math.max(0, rawOverall)));

  return {
    overallScore,
    resumeJdScore,
    skillGapScore,
    codingScore,
    interviewScore,
  };
}

export function generateDefaultReadinessSummary(trackerStats?: TrackerStats[]): ReadinessSummary {
  const stats: TrackerStats[] = trackerStats || [
    {
      platform: "leetcode",
      solved: 342,
      rating: 1785,
      lastSynced: new Date().toISOString(),
    },
    {
      platform: "codeforces",
      solved: 165,
      rating: 1420,
      lastSynced: new Date().toISOString(),
    },
    {
      platform: "gfg",
      solved: 215,
      lastSynced: new Date().toISOString(),
    },
    {
      platform: "codechef",
      solved: 95,
      rating: 1540,
      lastSynced: new Date().toISOString(),
    },
  ];

  const calculated = calculateOverallReadinessScore({
    matchScore: 82,
    gapCount: { high: 1, medium: 2, low: 1 },
    trackerStats: stats,
    interviewScores: [8, 8.5, 7.5],
  });

  const now = new Date();
  const history = [
    { date: new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0], score: 68 },
    { date: new Date(now.getTime() - 10 * 86400000).toISOString().split("T")[0], score: 72 },
    { date: new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0], score: 75 },
    { date: new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0], score: 80 },
    { date: now.toISOString().split("T")[0], score: calculated.overallScore },
  ];

  return {
    overallScore: calculated.overallScore,
    reportsCompleted: 3,
    interviewsCompleted: 2,
    trackerStats: stats,
    history,
  };
}
