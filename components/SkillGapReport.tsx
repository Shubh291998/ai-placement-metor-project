// components/SkillGapReport.tsx
"use client";
import Link from "next/link";
import type { GapAnalyzerReport } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

export default function SkillGapReport({
  report,
}: {
  report: GapAnalyzerReport;
}) {
  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {report.jobTitle}
            {report.company ? ` · ${report.company}` : ""}
          </h1>
          <p className="text-sm text-slate-500">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-700">
            {report.matchScore}%
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Match score
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Strengths</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {report.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Skill gaps</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">Skill</th>
                <th className="px-4 py-2">Required</th>
                <th className="px-4 py-2">Current</th>
                <th className="px-4 py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {report.gaps.map((gap) => (
                <tr key={gap.skill} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {gap.skill}
                  </td>
                  <td className="px-4 py-2 capitalize">{gap.requiredLevel}</td>
                  <td className="px-4 py-2 capitalize">{gap.currentLevel}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${SEVERITY_STYLES[gap.gapSeverity] || "bg-slate-100 text-slate-700"}`}
                    >
                      {gap.gapSeverity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">
          Suggested focus areas
        </h2>
        <div className="flex flex-wrap gap-2">
          {report.suggestedFocusAreas.map((area) => (
            <span
              key={area}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {area}
            </span>
          ))}
        </div>
      </section>

      <Link
        href={`/interview?reportId=${report.id}`}
        className="inline-block rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
      >
        Start mock interview on these gaps →
      </Link>
    </div>
  );
}
