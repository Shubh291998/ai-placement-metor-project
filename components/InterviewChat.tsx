// components/InterviewChat.tsx
"use client";
import { useState } from "react";
import { submitAnswer } from "@/lib/api";
import type { InterviewSession, InterviewTurn } from "@/lib/types";

export default function InterviewChat({
  initialSession,
}: {
  initialSession: InterviewSession;
}) {
  const [session, setSession] = useState(initialSession);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<InterviewTurn[]>(
    initialSession.turns
  );

  const currentTurn = session.turns[session.turns.length - 1];
  const isDone = session.status === "completed";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !currentTurn) return;
    setSubmitting(true);
    try {
      const { turn, next } = await submitAnswer(
        session.id,
        currentTurn.question.id,
        answer
      );
      setHistory((prev) => [...prev, turn]);
      setSession(next);
      setAnswer("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="space-y-4">
        {history.map((turn, i) => (
          <div key={i} className="space-y-2">
            <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">
              <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
                {turn.question.targetSkill} · {turn.question.difficulty}
              </span>
              {turn.question.question}
            </div>
            {turn.answer && (
              <div className="ml-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-slate-800">
                {turn.answer}
              </div>
            )}
            {turn.feedback && (
              <div className="ml-6 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                <strong>Feedback ({turn.score}/10):</strong> {turn.feedback}
              </div>
            )}
          </div>
        ))}
      </div>

      {isDone ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Interview complete — check your dashboard for the updated readiness score.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Type your answer…"
            className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit answer"}
          </button>
        </form>
      )}
    </div>
  );
}
