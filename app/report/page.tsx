// app/report/page.tsx
import SkillGapReport from "@/components/SkillGapReport";
import type { GapAnalyzerReport } from "@/lib/types";
import { getGapReportById } from "@/lib/services/report-service";

async function fetchReport(id: string): Promise<GapAnalyzerReport> {
  // First try direct service retrieval for instant, robust SSR without self-fetch HTTP issues
  try {
    const directReport = await getGapReportById(id);
    if (directReport) {
      return directReport;
    }
  } catch (err) {
    // If direct service lookup encounters an issue, proceed to HTTP fetch
  }

  const port = process.env.PORT || 3000;
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${port}`);

  try {
    const res = await fetch(`${baseUrl}/api/reports/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (fetchErr) {
    console.warn("Self-fetch failed, falling back to cached report service:", fetchErr);
  }

  // Guaranteed fallback so the page never crashes
  const fallback = await getGapReportById(id);
  if (fallback) return fallback;

  throw new Error("Report not found");
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { id?: string } | Promise<{ id?: string }>;
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const id = resolvedParams?.id;
  if (!id) {
    return <p className="text-slate-600">No report selected.</p>;
  }
  const report = await fetchReport(id);
  return <SkillGapReport report={report} />;
}
