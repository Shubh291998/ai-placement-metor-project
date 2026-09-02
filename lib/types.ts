// lib/types.ts
// Shared types used across the AI Placement Mentor frontend.

export interface SkillGap {
  skill: string;
  requiredLevel: "basic" | "intermediate" | "advanced";
  currentLevel: "none" | "basic" | "intermediate" | "advanced";
  gapSeverity: "low" | "medium" | "high";
  evidence: string; // where this was inferred from (resume line, JD line)
}

export interface GapAnalyzerReport {
  id: string;
  createdAt: string;
  jobTitle: string;
  company?: string;
  matchScore: number; // 0-100
  strengths: string[];
  gaps: SkillGap[];
  suggestedFocusAreas: string[];
  roadmapId?: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  targetSkill: string; // links back to a SkillGap.skill
  difficulty: "easy" | "medium" | "hard";
}

export interface InterviewTurn {
  question: InterviewQuestion;
  answer: string;
  feedback?: string;
  score?: number; // 0-10
}

export interface InterviewSession {
  id: string;
  reportId: string;
  turns: InterviewTurn[];
  status: "in-progress" | "completed";
}

export interface TrackerStats {
  platform: "leetcode" | "codeforces" | "gfg" | "codechef";
  solved: number;
  rating?: number;
  lastSynced: string;
}

export interface ReadinessSummary {
  overallScore: number; // 0-100
  reportsCompleted: number;
  interviewsCompleted: number;
  trackerStats: TrackerStats[];
  history: { date: string; score: number }[];
}

export interface RoadmapWeek {
  week: number;
  focus: string;
  topics: string[];
  resources: {
    title: string;
    url: string;
    type: "documentation" | "article" | "course" | "practice";
  }[];
  milestones: string[];
}

export interface Roadmap {
  id: string;
  reportId: string;
  targetRole: string;
  estimatedWeeks: number;
  weeks: RoadmapWeek[];
  createdAt: string;
}
