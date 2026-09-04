// lib/agents/graph.ts
// Central LangGraph multi-agent orchestration for AI Placement Mentor.

import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { z } from "zod";
import { parseResumeText } from "@/lib/parsers/pdf";
import { parseJobDescription } from "@/lib/parsers/jd-scraper";
import { generateStructuredAI } from "@/lib/ai/gemini";
import {
  SKILL_GAP_ANALYSIS_PROMPT,
  ROADMAP_GENERATION_PROMPT,
  INTERVIEW_QUESTION_PROMPT,
  INTERVIEW_EVALUATION_PROMPT,
} from "@/lib/ai/prompts";
import {
  type ParsedResume,
  type ParsedJobDescription,
  type RoadmapOutput,
  type InterviewTurnEvaluation,
  SkillGapItemSchema,
  RoadmapOutputSchema,
  InterviewQuestionSchema,
  InterviewTurnEvaluationSchema,
} from "@/lib/validation/schemas";
import type {
  SkillGap,
  GapAnalyzerReport,
  InterviewQuestion,
  InterviewSession,
  InterviewTurn,
  TrackerStats,
  Roadmap,
} from "@/lib/types";
import {
  getResume,
  getJobDescription,
  searchLearningResourcesForSkills,
  getTrackerStats,
  saveGapReport,
  saveRoadmap,
  saveInterviewTurn,
  calculateReadiness,
} from "@/lib/tools/mentor-tools";
import { calculateDeterministicMatchScore } from "@/lib/agents/gap-analyzer";
import { selectTargetSkillsForInterview, DEFAULT_MAX_INTERVIEW_TURNS } from "@/lib/agents/interviewer";

// --- Shared State Annotation ---
export const MentorStateAnnotation = Annotation.Root({
  userId: Annotation<string | undefined>(),
  mode: Annotation<"analysis" | "interview" | "dashboard">({
    reducer: (_, next) => next,
    default: () => "analysis",
  }),

  // Resume & Job Description data
  resumeText: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  resumeData: Annotation<ParsedResume | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  jdText: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  jdUrl: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  jdData: Annotation<ParsedJobDescription | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // RAG and context
  ragContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // Skill gap analysis
  rawGaps: Annotation<SkillGap[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  strengths: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  focusAreas: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  matchScore: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  gapReport: Annotation<GapAnalyzerReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Learning Roadmap
  roadmap: Annotation<RoadmapOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  savedRoadmap: Annotation<Roadmap | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Coding Tracker Statistics
  trackerStats: Annotation<TrackerStats[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Mock Interview State
  sessionId: Annotation<string | undefined>(),
  currentQuestion: Annotation<InterviewQuestion | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  userAnswer: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  evaluation: Annotation<InterviewTurnEvaluation | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  interviewHistory: Annotation<InterviewTurn[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  interviewSession: Annotation<InterviewSession | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Placement Readiness
  readinessScore: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Iteration and error handling
  iterationCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export type MentorState = typeof MentorStateAnnotation.State;

// ==========================================
// 1. TRACKER SYNC AGENT
// ==========================================
export async function syncTrackerNode(state: MentorState): Promise<Partial<MentorState>> {
  if (state.trackerStats && state.trackerStats.length > 0) {
    return {};
  }
  const stats = await getTrackerStats(state.userId);
  return { trackerStats: stats };
}

// ==========================================
// 2. RESUME ANALYZER AGENT
// ==========================================
export async function resumeAnalysisNode(state: MentorState): Promise<Partial<MentorState>> {
  if (state.resumeData) {
    return {};
  }

  let text = state.resumeText;
  if (!text && state.userId) {
    const saved = await getResume(state.userId);
    if (saved?.parsedData) {
      return { resumeData: saved.parsedData, resumeText: saved.rawText || "" };
    }
    text = saved?.rawText || "";
  }

  const parsed = await parseResumeText(text);
  return { resumeData: parsed, resumeText: text };
}

// ==========================================
// 3. JOB DESCRIPTION ANALYZER AGENT
// ==========================================
export async function jdAnalysisNode(state: MentorState): Promise<Partial<MentorState>> {
  if (state.jdData) {
    return {};
  }

  let text = state.jdText;
  let url = state.jdUrl;

  if (!text && !url && state.userId) {
    const saved = await getJobDescription(state.userId);
    if (saved?.parsedData) {
      return { jdData: saved.parsedData, jdText: saved.rawText || "", jdUrl: saved.sourceUrl };
    }
    text = saved?.rawText || "";
    url = saved?.sourceUrl;
  }

  const parsed = await parseJobDescription(text, url);
  return { jdData: parsed, jdText: text, jdUrl: url };
}

// ==========================================
// 4. SKILL GAP ANALYZER AGENT
// ==========================================
export async function analyzeGapNode(state: MentorState): Promise<Partial<MentorState>> {
  const resume = state.resumeData!;
  const jd = state.jdData!;
  const rag = state.ragContext || "";

  const compareSchema = z.object({
    jobTitle: z.string(),
    company: z.string().optional(),
    strengths: z.array(z.string()),
    gaps: z.array(SkillGapItemSchema),
    suggestedFocusAreas: z.array(z.string()),
  });

  const analysis = await generateStructuredAI({
    systemPrompt: SKILL_GAP_ANALYSIS_PROMPT,
    userPrompt: `Candidate Profile:\n${JSON.stringify(resume, null, 2)}\n\nJob Description:\n${JSON.stringify(
      jd,
      null,
      2
    )}\n\nLearning Knowledge Context:\n${rag}`,
    schema: compareSchema,
    mockFallback: () => {
      const gaps: SkillGap[] = [];
      const strengths: string[] = [];

      for (const s of resume.skills.slice(0, 4)) {
        strengths.push(`Demonstrated proficiency in ${s.name} (${s.level} level)`);
      }

      for (const req of jd.requiredSkills) {
        const found = resume.skills.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
        if (!found) {
          gaps.push({
            skill: req.name,
            requiredLevel: req.level,
            currentLevel: "none",
            gapSeverity: "high",
            evidence: `Required in JD for ${jd.jobTitle} role; missing from resume.`,
          });
        } else if (
          (req.level === "advanced" && found.level !== "advanced") ||
          (req.level === "intermediate" && found.level === "basic")
        ) {
          gaps.push({
            skill: req.name,
            requiredLevel: req.level,
            currentLevel: found.level,
            gapSeverity: "medium",
            evidence: `Candidate has ${found.level} level; JD requires ${req.level} level.`,
          });
        }
      }

      if (gaps.length === 0) {
        gaps.push({
          skill: "System Design",
          requiredLevel: "intermediate",
          currentLevel: "basic",
          gapSeverity: "medium",
          evidence: "Scalability and architectural patterns expected for technical interview.",
        });
      }

      return {
        jobTitle: jd.jobTitle,
        company: jd.company || "Target Company",
        strengths: strengths.length > 0 ? strengths : ["Solid programming foundations", "Hands-on project experience"],
        gaps,
        suggestedFocusAreas: gaps.map((g) => g.skill).slice(0, 4),
      };
    },
  });

  const score = calculateDeterministicMatchScore(resume, jd, analysis.gaps);

  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const gapReport: GapAnalyzerReport = {
    id: reportId,
    createdAt: new Date().toISOString(),
    jobTitle: jd.jobTitle || "Software Engineer",
    company: jd.company || undefined,
    matchScore: score,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    suggestedFocusAreas: analysis.suggestedFocusAreas,
  };

  return {
    rawGaps: analysis.gaps,
    strengths: analysis.strengths,
    focusAreas: analysis.suggestedFocusAreas,
    matchScore: score,
    gapReport,
  };
}

/** Conditional validation gate for skill gap analyzer */
export function validateGapCondition(state: MentorState): "retry" | "valid" {
  if ((!state.rawGaps || state.rawGaps.length === 0) && (state.iterationCount ?? 0) < 1) {
    return "retry";
  }
  return "valid";
}

// ==========================================
// 5. RAG RETRIEVER AGENT
// ==========================================
export async function retrieveContextNode(state: MentorState): Promise<Partial<MentorState>> {
  const targetSkills =
    state.focusAreas && state.focusAreas.length > 0
      ? state.focusAreas
      : state.rawGaps.map((g) => g.skill);

  const { contextText } = await searchLearningResourcesForSkills(targetSkills, 5);
  return { ragContext: contextText };
}

// ==========================================
// 6. ROADMAP GENERATOR AGENT
// ==========================================
export async function generateRoadmapNode(state: MentorState): Promise<Partial<MentorState>> {
  const gaps = state.rawGaps || [];
  const targetRole = state.jdData?.jobTitle || "Software Engineer";

  const roadmapOutput = await generateStructuredAI<RoadmapOutput>({
    systemPrompt: ROADMAP_GENERATION_PROMPT,
    userPrompt: `Target Role: ${targetRole}\nIdentified Skill Gaps:\n${JSON.stringify(
      gaps,
      null,
      2
    )}\n\nCurated Context:\n${state.ragContext}`,
    schema: RoadmapOutputSchema,
    mockFallback: () => {
      const primary = gaps[0]?.skill || "System Design";
      const secondary = gaps[1]?.skill || "Database Optimization";
      return {
        targetRole,
        estimatedWeeks: 4,
        weeks: [
          {
            week: 1,
            focus: `Foundations & Remediation for ${primary}`,
            topics: [primary, "Core Principles", "Interview Patterns"],
            resources: [
              {
                title: "System Design Primer",
                url: "https://github.com/donnemartin/system-design-primer",
                type: "course",
              },
            ],
            milestones: ["Master core theoretical foundations", "Solve 10 targeted domain exercises"],
          },
          {
            week: 2,
            focus: `Deep-Dive into ${secondary}`,
            topics: [secondary, "Indexing", "Architecture Tradeoffs"],
            resources: [
              {
                title: "PostgreSQL Documentation",
                url: "https://www.postgresql.org/docs/current/indexes.html",
                type: "documentation",
              },
            ],
            milestones: ["Build working proof of concept", "Benchmark queries"],
          },
          {
            week: 3,
            focus: "Hands-on Integration & Project Application",
            topics: ["Microservices", "Caching with Redis", "Containerization"],
            resources: [
              {
                title: "Redis Best Practices",
                url: "https://redis.io/docs/manual/patterns/",
                type: "documentation",
              },
            ],
            milestones: ["Deploy containerized service with caching"],
          },
          {
            week: 4,
            focus: "Mock Technical Interviews & Placement Readiness",
            topics: ["Mock Interviews", "Behavioral Alignment", "System Design Defense"],
            resources: [
              {
                title: "Next.js Production Guide",
                url: "https://nextjs.org/docs/app",
                type: "documentation",
              },
            ],
            milestones: ["Score > 8/10 on 3 mock interview sessions"],
          },
        ],
      };
    },
  });

  let saved: Roadmap | null = null;
  if (state.gapReport?.id) {
    saved = await saveRoadmap(state.gapReport.id, roadmapOutput, state.userId);
  }

  return { roadmap: roadmapOutput, savedRoadmap: saved };
}

// ==========================================
// 7. ROUTER AGENT
// ==========================================
export function routerNode(state: MentorState): "analysis" | "interview" | "dashboard" {
  if (state.mode === "interview") return "interview";
  if (state.mode === "dashboard") return "dashboard";
  return "analysis";
}

// ==========================================
// 8. INTERVIEWER AGENT
// ==========================================
export async function interviewNode(state: MentorState): Promise<Partial<MentorState>> {
  // If candidate answer is already supplied, skip straight to evaluate
  if (state.userAnswer && state.userAnswer.trim().length > 0 && state.currentQuestion) {
    return {};
  }

  const targetSkills = selectTargetSkillsForInterview(state.rawGaps);
  const targetSkill = targetSkills[0] || "Software Architecture";
  const questionId = `q_${Date.now()}_${state.interviewHistory.length}`;

  const question = await generateStructuredAI<InterviewQuestion>({
    systemPrompt: INTERVIEW_QUESTION_PROMPT,
    userPrompt: `Generate an interview question for skill: "${targetSkill}", difficulty: "medium". Unique id: "${questionId}". Context:\n${state.ragContext}`,
    schema: InterviewQuestionSchema,
    mockFallback: () => ({
      id: questionId,
      question: `Explain how you would architect and scale ${targetSkill} under high concurrent load.`,
      targetSkill,
      difficulty: "medium",
    }),
  });

  return { currentQuestion: question };
}

/** Check if an answer was provided to branch to evaluator */
export function checkAnswerCondition(state: MentorState): "evaluate" | "persist" {
  if (state.userAnswer && state.userAnswer.trim().length > 0 && state.currentQuestion) {
    return "evaluate";
  }
  return "persist";
}

// ==========================================
// 9. EVALUATOR AGENT (WITH ADAPTIVE DIFFICULTY)
// ==========================================
export async function evaluateNode(state: MentorState): Promise<Partial<MentorState>> {
  const question = state.currentQuestion!;
  const answer = state.userAnswer;

  const evaluation = await generateStructuredAI<InterviewTurnEvaluation>({
    systemPrompt: INTERVIEW_EVALUATION_PROMPT,
    userPrompt: `Question (${question.difficulty} difficulty, target: "${question.targetSkill}"):\n${question.question}\n\nCandidate Answer:\n${answer}`,
    schema: InterviewTurnEvaluationSchema,
    mockFallback: () => {
      const len = answer.trim().length;
      let score = 7;
      let diff: "easy" | "medium" | "hard" = "medium";
      let fb = `Good explanation covering core concepts of ${question.targetSkill}.`;

      if (len < 30) {
        score = 4;
        diff = "easy";
        fb = `Answer is too brief. Provide concrete examples and explain the mechanism step-by-step.`;
      } else if (len > 120) {
        score = 9;
        diff = "hard";
        fb = `Excellent, comprehensive answer demonstrating clear architectural depth!`;
      }

      return {
        score,
        feedback: fb,
        technicalAccuracy: score,
        depth: score,
        strengths: ["Clear terminology", "Directly addressed question"],
        weaknesses: score < 6 ? ["Lacked concrete production examples"] : [],
        missingConcepts: score < 6 ? ["Complexity analysis"] : [],
        recommendedDifficulty: diff,
      };
    },
  });

  const completedTurn: InterviewTurn = {
    question,
    answer,
    feedback: evaluation.feedback,
    score: evaluation.score,
  };

  const updatedHistory = [...state.interviewHistory, completedTurn];
  const sessionId = state.sessionId || `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const isFinished = updatedHistory.length >= DEFAULT_MAX_INTERVIEW_TURNS;

  const updatedSession: InterviewSession = {
    id: sessionId,
    reportId: state.gapReport?.id || "default_report",
    turns: updatedHistory,
    status: isFinished ? "completed" : "in-progress",
  };

  await saveInterviewTurn(updatedSession, state.userId);

  return {
    evaluation,
    interviewHistory: updatedHistory,
    interviewSession: updatedSession,
    sessionId,
  };
}

// ==========================================
// 10. READINESS DECISION AGENT
// ==========================================
export async function calculateReadinessNode(state: MentorState): Promise<Partial<MentorState>> {
  const highGaps = state.rawGaps.filter((g) => g.gapSeverity === "high").length;
  const medGaps = state.rawGaps.filter((g) => g.gapSeverity === "medium").length;
  const lowGaps = state.rawGaps.filter((g) => g.gapSeverity === "low").length;

  const interviewScores = state.interviewHistory
    .map((t) => t.score)
    .filter((s): s is number => typeof s === "number");

  const readiness = await calculateReadiness({
    userId: state.userId,
    matchScore: state.matchScore,
    gapCount: { high: highGaps, medium: medGaps, low: lowGaps },
    trackerStats: state.trackerStats,
    interviewScores: interviewScores.length > 0 ? interviewScores : undefined,
  });

  return { readinessScore: readiness };
}

// ==========================================
// 11. PERSIST AGENT
// ==========================================
export async function persistNode(state: MentorState): Promise<Partial<MentorState>> {
  if (state.gapReport) {
    await saveGapReport(state.gapReport, state.userId);
  }
  return {};
}

// ==========================================
// COMPILED LANGGRAPH WORKFLOW
// ==========================================
export function createMentorGraph() {
  const workflow = new StateGraph(MentorStateAnnotation)
    // Register all nodes
    .addNode("sync_tracker", syncTrackerNode)
    .addNode("resume_analysis", resumeAnalysisNode)
    .addNode("jd_analysis", jdAnalysisNode)
    .addNode("analyze_gap", analyzeGapNode)
    .addNode("retrieve_context", retrieveContextNode)
    .addNode("generate_roadmap", generateRoadmapNode)
    .addNode("interview", interviewNode)
    .addNode("evaluate", evaluateNode)
    .addNode("calculate_readiness", calculateReadinessNode)
    .addNode("persist", persistNode)

    // Entry point syncs tracker stats
    .addEdge("__start__", "sync_tracker")

    // Conditional Router Agent branching based on state.mode
    .addConditionalEdges("sync_tracker", routerNode, {
      analysis: "resume_analysis",
      interview: "interview",
      dashboard: "calculate_readiness",
    })

    // Analysis Pipeline
    .addEdge("resume_analysis", "jd_analysis")
    .addEdge("jd_analysis", "analyze_gap")

    // Conditional Validation Gate on skill gap analysis
    .addConditionalEdges("analyze_gap", validateGapCondition, {
      retry: "analyze_gap",
      valid: "retrieve_context",
    })

    // Context retrieval to roadmap generation
    .addEdge("retrieve_context", "generate_roadmap")
    .addEdge("generate_roadmap", "persist")

    // Interview flow: check if answer is present
    .addConditionalEdges("interview", checkAnswerCondition, {
      evaluate: "evaluate",
      persist: "persist",
    })

    // Post-evaluate & post-readiness routes to persist -> END
    .addEdge("evaluate", "persist")
    .addEdge("calculate_readiness", "persist")
    .addEdge("persist", END);

  return workflow.compile();
}

/**
 * Top-level executor for the unified agentic placement mentor workflow.
 */
export async function runMentorAgentWorkflow(initialState: {
  userId?: string;
  mode?: "analysis" | "interview" | "dashboard";
  resumeText?: string;
  jdText?: string;
  jdUrl?: string;
  sessionId?: string;
  currentQuestion?: InterviewQuestion | null;
  userAnswer?: string;
  interviewHistory?: InterviewTurn[];
  trackerStats?: TrackerStats[];
}): Promise<MentorState> {
  const graph = createMentorGraph();

  const state = await graph.invoke({
    userId: initialState.userId,
    mode: initialState.mode || "analysis",
    resumeText: initialState.resumeText || "",
    resumeData: null,
    jdText: initialState.jdText || "",
    jdUrl: initialState.jdUrl,
    jdData: null,
    ragContext: "",
    rawGaps: [],
    strengths: [],
    focusAreas: [],
    matchScore: 0,
    gapReport: null,
    roadmap: null,
    savedRoadmap: null,
    trackerStats: initialState.trackerStats || [],
    sessionId: initialState.sessionId,
    currentQuestion: initialState.currentQuestion || null,
    userAnswer: initialState.userAnswer || "",
    evaluation: null,
    interviewHistory: initialState.interviewHistory || [],
    interviewSession: null,
    readinessScore: null,
    iterationCount: 0,
    error: null,
  });

  return state;
}
