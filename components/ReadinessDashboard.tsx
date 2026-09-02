// components/ReadinessDashboard.tsx
"use client";
import { useState } from "react";
import { syncTrackers } from "@/lib/api";
import type { ReadinessSummary } from "@/lib/types";

export default function ReadinessDashboard({
  initialSummary,
}: {
  initialSummary: ReadinessSummary;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      setSummary(await syncTrackers());
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Readiness score" value={`${summary.overallScore}%`} />
        <StatCard
          label="Gap reports completed"
          value={summary.reportsCompleted}
        />
        <StatCard
          label="Mock interviews completed"
          value={summary.interviewsCompleted}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">
            Coding tracker sync
          </h2>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Platform</th>
                <th className="px-4 py-2">Solved</th>
                <th className="px-4 py-2">Rating</th>
                <th className="px-4 py-2">Last synced</th>
              </tr>
            </thead>
            <tbody>
              {summary.trackerStats.map((t) => (
                <tr key={t.platform} className="border-t border-slate-100">
                  <td className="px-4 py-2 capitalize">{t.platform}</td>
                  <td className="px-4 py-2">{t.solved}</td>
                  <td className="px-4 py-2">{t.rating ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {t.lastSynced ? new Date(t.lastSynced).toLocaleDateString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">
          Score history
        </h2>
        <div className="flex h-32 items-end gap-1">
          {summary.history.map((point) => (
            <div
              key={point.date}
              title={`${point.date}: ${point.score}%`}
              style={{ height: `${Math.max(point.score, 4)}%` }}
              className="flex-1 rounded-t bg-blue-500/80 hover:bg-blue-600 transition-colors"
            />
          ))}
          {summary.history.length === 0 && (
            <p className="text-sm text-slate-400 py-8">No score history recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
