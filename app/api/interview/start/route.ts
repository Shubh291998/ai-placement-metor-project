// app/api/interview/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { InterviewStartRequestSchema } from "@/lib/validation/schemas";
import { getGapReportById, saveInterviewSession } from "@/lib/services/report-service";
import { selectTargetSkillsForInterview, generateQuestion } from "@/lib/agents/interviewer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { InterviewSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InterviewStartRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportId } = parsed.data;
    const report = await getGapReportById(reportId);

    if (!report) {
      return NextResponse.json({ error: "Gap report not found" }, { status: 404 });
    }

    // Select candidate skill gaps
    const targetSkills = selectTargetSkillsForInterview(report.gaps);
    const primarySkill = targetSkills[0] || "Software Engineering & System Architecture";

    // Generate initial question
    const firstQuestion = await generateQuestion({
      targetSkill: primarySkill,
      difficulty: "medium",
      turnIndex: 0,
    });

    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const user = await getAuthenticatedUser();

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

    await saveInterviewSession(session, user?.id);

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Interview Start API Error:", error);
    return NextResponse.json(
      { error: "Failed to start interview session" },
      { status: 500 }
    );
  }
}
