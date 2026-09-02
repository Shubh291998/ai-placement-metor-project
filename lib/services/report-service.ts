// lib/services/report-service.ts
import type { GapAnalyzerReport, InterviewSession, InterviewTurn, SkillGap } from "@/lib/types";
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

export async function getGapReportById(id: string): Promise<GapAnalyzerReport | null> {
  if (reportCache.has(id)) {
    return reportCache.get(id)!;
  }

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("gap_reports")
      .select("*")
      .eq("id", id)
      .single();

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
