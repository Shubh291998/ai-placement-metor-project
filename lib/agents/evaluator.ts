// lib/agents/evaluator.ts
import { generateStructuredAI } from "@/lib/ai/gemini";
import { INTERVIEW_EVALUATION_PROMPT } from "@/lib/ai/prompts";
import {
  InterviewTurnEvaluationSchema,
  type InterviewTurnEvaluation,
} from "@/lib/validation/schemas";
import type { InterviewQuestion } from "@/lib/types";

export async function evaluateAnswer(params: {
  question: InterviewQuestion;
  answer: string;
}): Promise<InterviewTurnEvaluation> {
  const { question, answer } = params;

  return generateStructuredAI<InterviewTurnEvaluation>({
    systemPrompt: INTERVIEW_EVALUATION_PROMPT,
    userPrompt: `Question (${question.difficulty} difficulty, target skill: "${question.targetSkill}"):\n${question.question}\n\nCandidate Answer:\n${answer}`,
    schema: InterviewTurnEvaluationSchema,
    mockFallback: () => {
      const length = answer.trim().length;
      let score = 7;
      let feedback = `Good explanation covering the core concepts of ${question.targetSkill}. To elevate your answer, mention performance tradeoffs, concrete failure scenarios, or production monitoring.`;
      let recommendedDifficulty: "easy" | "medium" | "hard" = "medium";

      if (length < 25) {
        score = 3;
        feedback = `Your answer is too brief. Be sure to define key terminology, explain the mechanism step-by-step, and provide a concrete technical example for ${question.targetSkill}.`;
        recommendedDifficulty = "easy";
      } else if (length > 150) {
        score = 9;
        feedback = `Excellent, comprehensive answer! You clearly explained the architecture, edge cases, and practical considerations for ${question.targetSkill}.`;
        recommendedDifficulty = "hard";
      }

      return {
        score,
        feedback,
        technicalAccuracy: score,
        depth: score,
        strengths: ["Clear terminology", "Addressed the core question"],
        weaknesses: score < 6 ? ["Lacked concrete production examples"] : [],
        missingConcepts: score < 6 ? ["Edge case handling", "Complexity analysis"] : [],
        recommendedDifficulty,
      };
    },
  });
}
