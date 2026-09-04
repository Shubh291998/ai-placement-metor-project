// app/api/interview/[sessionId]/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { InterviewAnswerRequestSchema } from "@/lib/validation/schemas";
import {
  getInterviewSessionById,
  saveInterviewSession,
  getGapReportById,
} from "@/lib/services/report-service";
import { evaluateAnswer } from "@/lib/agents/evaluator";
import {
  generateQuestion,
  selectTargetSkillsForInterview,
  DEFAULT_MAX_INTERVIEW_TURNS,
} from "@/lib/agents/interviewer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { InterviewTurn, InterviewSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

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
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    // Find the matching turn
    const turnIndex = session.turns.findIndex((t) => t.question.id === questionId);
    const currentTurn = turnIndex >= 0 ? session.turns[turnIndex] : session.turns[session.turns.length - 1];

    if (!currentTurn) {
      return NextResponse.json({ error: "Turn not found in session" }, { status: 404 });
    }

    // 1. Evaluate candidate answer via Evaluator Agent
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
      const report = await getGapReportById(session.reportId, userId);
      const targetSkills = report
        ? selectTargetSkillsForInterview(report.gaps)
        : ["System Design", "Node.js", "Databases"];
      const nextSkillIndex = totalAnswered % targetSkills.length;
      const nextSkill = targetSkills[nextSkillIndex] || "System Design";

      // Next question difficulty adapts based on evaluator's recommendation:
      // score >= 8 -> hard, score >= 6 -> medium, score < 6 -> easy
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

    await saveInterviewSession(nextSession, userId);

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
