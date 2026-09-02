// app/api/interview/[sessionId]/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { InterviewAnswerRequestSchema } from "@/lib/validation/schemas";
import { getInterviewSessionById, saveInterviewSession, getGapReportById } from "@/lib/services/report-service";
import { evaluateAnswer } from "@/lib/agents/evaluator";
import { generateQuestion, selectTargetSkillsForInterview, DEFAULT_MAX_INTERVIEW_TURNS } from "@/lib/agents/interviewer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { InterviewTurn, InterviewSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await req.json();
    const parsed = InterviewAnswerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { questionId, answer } = parsed.data;
    let session = await getInterviewSessionById(sessionId);

    if (!session) {
      // Create session on the fly if needed for resilient demo
      session = {
        id: sessionId,
        reportId: "default_report",
        turns: [
          {
            question: {
              id: questionId,
              question: "Explain the architecture and concurrency model of your primary backend tech stack.",
              targetSkill: "System Architecture",
              difficulty: "medium",
            },
            answer: "",
          },
        ],
        status: "in-progress",
      };
    }

    // Find the matching turn
    const turnIndex = session.turns.findIndex((t) => t.question.id === questionId);
    const currentTurn = turnIndex >= 0 ? session.turns[turnIndex] : session.turns[session.turns.length - 1];

    if (!currentTurn) {
      return NextResponse.json({ error: "Turn not found in session" }, { status: 404 });
    }

    // 1. Evaluate candidate answer
    const evaluation = await evaluateAnswer({
      question: currentTurn.question,
      answer,
    });

    const completedTurn: InterviewTurn = {
      question: currentTurn.question,
      answer,
      feedback: evaluation.feedback,
      score: evaluation.score,
    };

    const updatedTurns = [...session.turns];
    if (turnIndex >= 0) {
      updatedTurns[turnIndex] = completedTurn;
    } else {
      updatedTurns.push(completedTurn);
    }

    // Check if session has reached limit
    const totalAnswered = updatedTurns.filter((t) => t.answer.trim().length > 0).length;
    const isFinished = totalAnswered >= DEFAULT_MAX_INTERVIEW_TURNS;

    let nextSession: InterviewSession;

    if (isFinished) {
      nextSession = {
        id: session.id,
        reportId: session.reportId,
        turns: updatedTurns,
        status: "completed",
      };
    } else {
      // Get skill gaps to select next target skill
      const report = await getGapReportById(session.reportId);
      const targetSkills = report ? selectTargetSkillsForInterview(report.gaps) : ["System Design", "Node.js", "Databases"];
      const nextSkillIndex = totalAnswered % targetSkills.length;
      const nextSkill = targetSkills[nextSkillIndex] || "System Design";

      // Next question difficulty adapts based on evaluator's recommendation
      const nextDifficulty = evaluation.recommendedDifficulty;

      const nextQuestion = await generateQuestion({
        targetSkill: nextSkill,
        difficulty: nextDifficulty,
        turnIndex: totalAnswered,
      });

      const nextTurn: InterviewTurn = {
        question: nextQuestion,
        answer: "",
      };

      nextSession = {
        id: session.id,
        reportId: session.reportId,
        turns: [...updatedTurns, nextTurn],
        status: "in-progress",
      };
    }

    const user = await getAuthenticatedUser();
    await saveInterviewSession(nextSession, user?.id);

    return NextResponse.json(
      {
        turn: completedTurn,
        next: nextSession,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Interview Answer API Error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate interview answer" },
      { status: 500 }
    );
  }
}
