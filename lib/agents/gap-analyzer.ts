// lib/agents/gap-analyzer.ts
import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { parseResumeText } from "@/lib/parsers/pdf";
import { parseJobDescription } from "@/lib/parsers/jd-scraper";
import { retrieveRagContextForSkills } from "@/lib/rag/retriever";
import { generateStructuredAI } from "@/lib/ai/gemini";
import { SKILL_GAP_ANALYSIS_PROMPT, ROADMAP_GENERATION_PROMPT } from "@/lib/ai/prompts";
import {
  type ParsedResume,
  type ParsedJobDescription,
  type RoadmapOutput,
  SkillGapItemSchema,
  RoadmapOutputSchema,
} from "@/lib/validation/schemas";
import { z } from "zod";
import type { SkillGap, GapAnalyzerReport } from "@/lib/types";
import { getAdminSupabase } from "@/lib/supabase/admin";

// State annotation for LangGraph
export const GapAnalyzerAnnotation = Annotation.Root({
  resumeText: Annotation<string>(),
  jobDescriptionText: Annotation<string>(),
  jobUrl: Annotation<string | undefined>(),
  userId: Annotation<string | undefined>(),
  parsedResume: Annotation<ParsedResume | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  parsedJd: Annotation<ParsedJobDescription | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  ragContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
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
  deterministicMatchScore: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  roadmap: Annotation<RoadmapOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  finalReport: Annotation<GapAnalyzerReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export type GapAnalyzerState = typeof GapAnalyzerAnnotation.State;

/**
 * Deterministically computes match score between candidate skills and JD requirements.
 */
export function calculateDeterministicMatchScore(
  resume: ParsedResume,
  jd: ParsedJobDescription,
  gaps: SkillGap[]
): number {
  const required = jd.requiredSkills || [];
  if (required.length === 0) return 75;

  let totalWeight = 0;
  let earnedWeight = 0;

  const levelScoreMap: Record<string, number> = {
    none: 0,
    basic: 1,
    intermediate: 2,
    advanced: 3,
  };

  for (const req of required) {
    const weight = req.importance === "required" ? 2.0 : 1.0;
    totalWeight += weight;

    const candSkill = resume.skills.find(
      (s) => s.name.toLowerCase() === req.name.toLowerCase() ||
             req.name.toLowerCase().includes(s.name.toLowerCase()) ||
             s.name.toLowerCase().includes(req.name.toLowerCase())
    );

    const reqLevelVal = levelScoreMap[req.level] || 2;
    const candLevelVal = candSkill ? (levelScoreMap[candSkill.level] || 1) : 0;

    if (candLevelVal >= reqLevelVal) {
      earnedWeight += weight;
    } else if (candLevelVal > 0) {
      earnedWeight += weight * (candLevelVal / reqLevelVal);
    }
  }

  const baseScore = (earnedWeight / Math.max(totalWeight, 1)) * 100;

  const highGaps = gaps.filter((g) => g.gapSeverity === "high").length;
  const mediumGaps = gaps.filter((g) => g.gapSeverity === "medium").length;
  
  const penalty = highGaps * 5 + mediumGaps * 2;
  const finalScore = Math.max(10, Math.min(98, Math.round(baseScore - penalty)));
  return finalScore;
}

// 1. Extract Skills Node
async function extractSkillsNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const [parsedResume, parsedJd] = await Promise.all([
    parseResumeText(state.resumeText),
    parseJobDescription(state.jobDescriptionText, state.jobUrl),
  ]);

  return { parsedResume, parsedJd };
}

// 2. Retrieve RAG Context Node
async function retrieveRagContextNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const targetSkills = state.parsedJd?.technologies || 
    state.parsedJd?.requiredSkills.map((s) => s.name) || 
    ["Full Stack", "System Design"];

  const { contextText } = await retrieveRagContextForSkills(targetSkills);
  return { ragContext: contextText };
}

// 3. Compare Skills Node
async function compareSkillsNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const resume = state.parsedResume!;
  const jd = state.parsedJd!;
  const rag = state.ragContext;

  const compareSchema = z.object({
    jobTitle: z.string(),
    company: z.string().optional(),
    strengths: z.array(z.string()),
    gaps: z.array(SkillGapItemSchema),
    suggestedFocusAreas: z.array(z.string()),
  });

  const analysis = await generateStructuredAI({
    systemPrompt: SKILL_GAP_ANALYSIS_PROMPT,
    userPrompt: `Candidate Profile:\n${JSON.stringify(resume, null, 2)}\n\nJob Description:\n${JSON.stringify(jd, null, 2)}\n\nLearning Knowledge Context:\n${rag}`,
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

  return {
    rawGaps: analysis.gaps,
    strengths: analysis.strengths,
    focusAreas: analysis.suggestedFocusAreas,
  };
}

// 4. Validate and Score Node
async function validateAndScoreNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const score = calculateDeterministicMatchScore(
    state.parsedResume!,
    state.parsedJd!,
    state.rawGaps
  );

  return { deterministicMatchScore: score };
}

// 5. Generate Roadmap Node
async function generateRoadmapNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const gaps = state.rawGaps;
  const targetRole = state.parsedJd?.jobTitle || "Software Engineer";

  const roadmap = await generateStructuredAI<RoadmapOutput>({
    systemPrompt: ROADMAP_GENERATION_PROMPT,
    userPrompt: `Target Role: ${targetRole}\nIdentified Skill Gaps:\n${JSON.stringify(gaps, null, 2)}`,
    schema: RoadmapOutputSchema,
    mockFallback: () => {
      const weeks = [
        {
          week: 1,
          focus: "Core CS, Algorithms & Primary Gap Remediation",
          topics: [gaps[0]?.skill || "Data Structures", "Time Complexity Analysis", "Problem Solving Patterns"],
          resources: [
            {
              title: "Dynamic Programming & Graph Patterns",
              url: "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns",
              type: "article" as const,
            },
          ],
          milestones: ["Solve 15 targeted LeetCode Medium problems", "Complete deep-dive notes on core gap"],
        },
        {
          week: 2,
          focus: "System Design & Architecture Tradeoffs",
          topics: ["Microservices", "Caching with Redis", "Database Indexing & Sharding"],
          resources: [
            {
              title: "System Design Primer",
              url: "https://github.com/donnemartin/system-design-primer",
              type: "course" as const,
            },
          ],
          milestones: ["Design an end-to-end scalable distributed architecture", "Practice mock architectural interview"],
        },
        {
          week: 3,
          focus: "Advanced Framework & Database Optimization",
          topics: [gaps[1]?.skill || "PostgreSQL Optimization", "Concurrency & Async Workflows"],
          resources: [
            {
              title: "PostgreSQL Query Optimization",
              url: "https://www.postgresql.org/docs/current/indexes.html",
              type: "documentation" as const,
            },
          ],
          milestones: ["Build a mini-benchmark project showcasing query optimization"],
        },
        {
          week: 4,
          focus: "Mock Interviews & Production Readiness",
          topics: ["Behavioral STAR Stories", "Live Coding Practice", "Technical Deep-Dives"],
          resources: [
            {
              title: "Next.js & React Server Architecture",
              url: "https://nextjs.org/docs/app",
              type: "documentation" as const,
            },
          ],
          milestones: ["Complete 3 full mock interview sessions with score > 8/10"],
        },
      ];

      return {
        targetRole,
        estimatedWeeks: 4,
        weeks,
      };
    },
  });

  return { roadmap };
}

// 6. Persist Report Node
async function persistReportNode(state: GapAnalyzerState): Promise<Partial<GapAnalyzerState>> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const finalReport: GapAnalyzerReport = {
    id: reportId,
    createdAt: new Date().toISOString(),
    jobTitle: state.parsedJd?.jobTitle || "Software Engineer",
    company: state.parsedJd?.company || undefined,
    matchScore: state.deterministicMatchScore,
    strengths: state.strengths,
    gaps: state.rawGaps,
    suggestedFocusAreas: state.focusAreas,
  };

  try {
    const supabase = getAdminSupabase();
    await (supabase.from("gap_reports") as any).insert({
      id: reportId,
      user_id: state.userId || null,
      job_title: finalReport.jobTitle,
      company: finalReport.company || null,
      match_score: finalReport.matchScore,
      strengths: finalReport.strengths,
      gaps: finalReport.gaps,
      suggested_focus_areas: finalReport.suggestedFocusAreas,
    });

    if (state.roadmap) {
      await (supabase.from("roadmaps") as any).insert({
        report_id: reportId,
        user_id: state.userId || null,
        target_role: state.roadmap.targetRole,
        estimated_weeks: state.roadmap.estimatedWeeks,
        weeks: state.roadmap.weeks,
      });
    }
  } catch (err) {
    // Fail gracefully
  }

  return { finalReport };
}

export function createGapAnalyzerGraph() {
  const workflow = new StateGraph(GapAnalyzerAnnotation)
    .addNode("extract_skills", extractSkillsNode)
    .addNode("retrieve_rag_context", retrieveRagContextNode)
    .addNode("compare_skills", compareSkillsNode)
    .addNode("validate_and_score", validateAndScoreNode)
    .addNode("generate_roadmap", generateRoadmapNode)
    .addNode("persist_report", persistReportNode)
    .addEdge("__start__", "extract_skills")
    .addEdge("extract_skills", "retrieve_rag_context")
    .addEdge("retrieve_rag_context", "compare_skills")
    .addEdge("compare_skills", "validate_and_score")
    .addEdge("validate_and_score", "generate_roadmap")
    .addEdge("generate_roadmap", "persist_report")
    .addEdge("persist_report", END);

  return workflow.compile();
}

export async function runGapAnalyzerAgent(params: {
  resumeText: string;
  jobDescriptionText: string;
  jobUrl?: string;
  userId?: string;
}): Promise<GapAnalyzerReport> {
  const graph = createGapAnalyzerGraph();

  const result = await graph.invoke({
    resumeText: params.resumeText,
    jobDescriptionText: params.jobDescriptionText,
    jobUrl: params.jobUrl,
    userId: params.userId,
    parsedResume: null,
    parsedJd: null,
    ragContext: "",
    rawGaps: [],
    strengths: [],
    focusAreas: [],
    deterministicMatchScore: 0,
    roadmap: null,
    finalReport: null,
    error: null,
  });

  if (!result.finalReport) {
    throw new Error("Gap Analyzer failed to produce a valid report");
  }

  return result.finalReport;
}
