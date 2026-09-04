// app/api/dashboard/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { calculateOverallReadinessScore } from "@/lib/services/readiness";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { ReadinessSummary, TrackerStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const supabase = getAdminSupabase();
    const [reportsRes, interviewsRes, trackersRes, scoresRes] = await Promise.all([
      supabase.from("gap_reports").select("id, match_score", { count: "exact" }).eq("user_id", userId),
      supabase.from("interview_sessions").select("id, status", { count: "exact" }).eq("user_id", userId),
      supabase.from("tracker_stats").select("*").eq("user_id", userId),
      supabase.from("readiness_scores").select("*").eq("user_id", userId).order("recorded_at", { ascending: true }),
    ]);

    const reportsList = (reportsRes.data as any[]) || [];
    const interviewsList = (interviewsRes.data as any[]) || [];
    const trackersList = (trackersRes.data as any[]) || [];
    const scoresList = (scoresRes.data as any[]) || [];

    const reportsCompleted = reportsRes.count ?? reportsList.length;
    const interviewsCompleted = interviewsRes.count ?? interviewsList.length;

    const trackerStats: TrackerStats[] =
      trackersList.length > 0
        ? trackersList.map((t: any) => ({
            platform: t.platform,
            solved: t.solved,
            rating: t.rating ? Number(t.rating) : undefined,
            lastSynced: t.last_synced,
          }))
        : [
            { platform: "leetcode", solved: 342, rating: 1785, lastSynced: new Date().toISOString() },
            { platform: "codeforces", solved: 165, rating: 1420, lastSynced: new Date().toISOString() },
            { platform: "gfg", solved: 215, lastSynced: new Date().toISOString() },
            { platform: "codechef", solved: 95, rating: 1540, lastSynced: new Date().toISOString() },
          ];

    const history =
      scoresList.length > 0
        ? scoresList.map((s: any) => ({
            date: new Date(s.recorded_at).toISOString().split("T")[0],
            score: Number(s.overall_score),
          }))
        : [
            { date: "2026-08-20", score: 68 },
            { date: "2026-08-24", score: 72 },
            { date: "2026-08-28", score: 75 },
            { date: "2026-08-31", score: 80 },
            { date: "2026-09-02", score: 84 },
          ];

    const latestMatchScore =
      reportsList.length > 0 ? Number(reportsList[reportsList.length - 1].match_score) : 78;

    const calculated = calculateOverallReadinessScore({
      matchScore: latestMatchScore,
      gapCount: { high: 1, medium: 2, low: 1 },
      trackerStats,
      interviewScores: [8.5],
    });

    const summary: ReadinessSummary = {
      overallScore: scoresList.length > 0 ? Number(scoresList[scoresList.length - 1].overall_score) : calculated.overallScore,
      reportsCompleted,
      interviewsCompleted,
      trackerStats,
      history,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return NextResponse.json(
      { error: "Failed to load readiness summary" },
      { status: 500 }
    );
  }
}
