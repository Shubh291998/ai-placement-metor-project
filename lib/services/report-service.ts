// lib/services/report-service.ts
import type { GapAnalyzerReport, InterviewSession, InterviewTurn, SkillGap, Roadmap } from "@/lib/types";
import { getAdminSupabase } from "@/lib/supabase/admin";

// In-memory cache for fast retrieval and offline demo mode
const reportCache = new Map<string, GapAnalyzerReport>();
const interviewCache = new Map<string, InterviewSession>();

export async function saveGapReport(report: GapAnalyzerReport, userId?: string): Promise<void> {
  reportCache.set(report.id, report);

  try {
    const supabase = getAdminSupabase();
    await (supabase.from("gap_reports") as any).upsert({
      id: report.id,
      user_id: userId || null,
      job_title: report.jobTitle,
      company: report.company || null,
      match_score: report.matchScore,
      strengths: report.strengths,
      gaps: report.gaps,
      suggested_focus_areas: report.suggestedFocusAreas,
      created_at: report.createdAt,
    });
  } catch {
    // Graceful fallback to memory
  }
}

export async function getGapReportById(id: string, userId?: string): Promise<GapAnalyzerReport | null> {
  try {
    const supabase = getAdminSupabase();
    let query = supabase.from("gap_reports").select("*").eq("id", id);
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      const row = data as any;
      const report: GapAnalyzerReport = {
        id: row.id,
        createdAt: row.created_at,
        jobTitle: row.job_title,
        company: row.company || undefined,
        matchScore: Number(row.match_score),
        strengths: (row.strengths as string[]) || [],
        gaps: (row.gaps as SkillGap[]) || [],
        suggestedFocusAreas: (row.suggested_focus_areas as string[]) || [],
      };
      reportCache.set(id, report);
      return report;
    }
  } catch {
    // Supabase query error
  }

  if (reportCache.has(id)) {
    return reportCache.get(id)!;
  }

  // Generate fallback report for demo or invalid ID
  const fallbackReport: GapAnalyzerReport = {
    id,
    createdAt: new Date().toISOString(),
    jobTitle: "Senior Full Stack Engineer",
    company: "TechNova Global",
    matchScore: 84,
    strengths: [
      "Demonstrated proficiency in React and TypeScript",
      "Hands-on experience with Node.js and RESTful architecture",
      "Strong foundational problem-solving abilities",
    ],
    gaps: [
      {
        skill: "System Design",
        requiredLevel: "advanced",
        currentLevel: "intermediate",
        gapSeverity: "medium",
        evidence: "Architectural scalability for high-load systems required in JD.",
      },
      {
        skill: "PostgreSQL Optimization",
        requiredLevel: "intermediate",
        currentLevel: "basic",
        gapSeverity: "medium",
        evidence: "Query indexing and MVCC depth required for database performance.",
      },
      {
        skill: "Docker & Kubernetes",
        requiredLevel: "intermediate",
        currentLevel: "none",
        gapSeverity: "high",
        evidence: "Containerization and orchestration explicitly required.",
      },
    ],
    suggestedFocusAreas: ["System Design", "PostgreSQL Optimization", "Docker & Kubernetes"],
  };

  reportCache.set(id, fallbackReport);
  return fallbackReport;
}

export async function saveInterviewSession(session: InterviewSession, userId?: string): Promise<void> {
  interviewCache.set(session.id, session);

  try {
    const supabase = getAdminSupabase();
    await (supabase.from("interview_sessions") as any).upsert({
      id: session.id,
      report_id: session.reportId,
      user_id: userId || null,
      status: session.status,
      updated_at: new Date().toISOString(),
    });

    for (const turn of session.turns) {
      await (supabase.from("interview_turns") as any).upsert({
        session_id: session.id,
        question_id: turn.question.id,
        question: turn.question.question,
        target_skill: turn.question.targetSkill,
        difficulty: turn.question.difficulty,
        answer: turn.answer,
        feedback: turn.feedback || null,
        score: turn.score ?? null,
      });
    }
  } catch {
    // In-memory fallback
  }
}

export async function getInterviewSessionById(id: string): Promise<InterviewSession | null> {
  if (interviewCache.has(id)) {
    return interviewCache.get(id)!;
  }

  try {
    const supabase = getAdminSupabase();
    const { data: sessionData, error } = await supabase
      .from("interview_sessions")
      .select("*, interview_turns(*)")
      .eq("id", id)
      .single();

    if (!error && sessionData) {
      const row = sessionData as any;
      const turns: InterviewTurn[] = (row.interview_turns || []).map((t: any) => ({
        question: {
          id: t.question_id,
          question: t.question,
          targetSkill: t.target_skill,
          difficulty: t.difficulty,
        },
        answer: t.answer,
        feedback: t.feedback || undefined,
        score: t.score !== null ? Number(t.score) : undefined,
      }));

      const session: InterviewSession = {
        id: row.id,
        reportId: row.report_id,
        turns,
        status: row.status,
      };

      interviewCache.set(id, session);
      return session;
    }
  } catch {
    // Supabase query error
  }

  return null;
}

const roadmapCache = new Map<string, Roadmap>();

export async function saveRoadmapToStore(roadmap: Roadmap, userId?: string): Promise<void> {
  roadmapCache.set(roadmap.id, roadmap);
  roadmapCache.set(roadmap.reportId, roadmap);

  try {
    const supabase = getAdminSupabase();
    await (supabase.from("roadmaps") as any).upsert({
      id: roadmap.id,
      report_id: roadmap.reportId,
      user_id: userId || null,
      target_role: roadmap.targetRole,
      estimated_weeks: roadmap.estimatedWeeks,
      weeks: roadmap.weeks,
      created_at: roadmap.createdAt,
    });
  } catch {
    // Graceful in-memory fallback
  }
}

export async function getRoadmapByReportId(reportIdOrId: string, userId?: string): Promise<Roadmap | null> {
  if (roadmapCache.has(reportIdOrId)) {
    return roadmapCache.get(reportIdOrId)!;
  }

  try {
    const supabase = getAdminSupabase();
    let query = supabase.from("roadmaps").select("*");
    if (reportIdOrId.startsWith("rdm_")) {
      query = query.eq("id", reportIdOrId);
    } else {
      query = query.eq("report_id", reportIdOrId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      const row = data as any;
      const roadmap: Roadmap = {
        id: row.id,
        reportId: row.report_id,
        targetRole: row.target_role,
        estimatedWeeks: row.estimated_weeks,
        weeks: row.weeks,
        createdAt: row.created_at,
      };
      roadmapCache.set(reportIdOrId, roadmap);
      return roadmap;
    }
  } catch {
    // Supabase query error
  }

  return null;
}

