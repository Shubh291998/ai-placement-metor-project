// app/api/interview/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { InterviewStartRequestSchema } from "@/lib/validation/schemas";
import { getGapReportById, saveInterviewSession } from "@/lib/services/report-service";
import { runMentorAgentWorkflow } from "@/lib/agents/graph";
import { selectTargetSkillsForInterview } from "@/lib/agents/interviewer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { InterviewSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body = await req.json();
    const parsed = InterviewStartRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportId } = parsed.data;
    const report = await getGapReportById(reportId, userId);

    if (!report) {
      return NextResponse.json({ error: "Gap report not found" }, { status: 404 });
    }

    // Select candidate skill gaps
    const targetSkills = selectTargetSkillsForInterview(report.gaps);
    const primarySkill = targetSkills[0] || "Software Engineering & System Architecture";

    // Run LangGraph Interviewer Agent in interview mode
    const state = await runMentorAgentWorkflow({
      userId,
      mode: "interview",
      resumeText: report.strengths.join("\n"),
      jdText: `${report.jobTitle}\nSkills: ${primarySkill}`,
    });

    const firstQuestion = state.currentQuestion || {
      id: `q_${Date.now()}_0`,
      question: `Explain core concepts, architecture, and practical considerations for ${primarySkill}.`,
      targetSkill: primarySkill,
      difficulty: "medium",
    };

    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const session: InterviewSession = {
      id: sessionId,
      reportId: report.id,
      turns: [
        {
          question: firstQuestion,
          answer: "",
        },
      ],
      status: "in-progress",
    };

    await saveInterviewSession(session, userId);

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Interview Start API Error:", error);
    return NextResponse.json(
      { error: "Failed to start interview session" },
      { status: 500 }
    );
  }
}
