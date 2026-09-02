// app/api/dashboard/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { syncAllCodingTrackers } from "@/lib/integrations";
import { calculateOverallReadinessScore, generateDefaultReadinessSummary } from "@/lib/services/readiness";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { ReadinessSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const userId = user?.id;

    let userProfiles: any = undefined;

    if (userId) {
      const supabase = getAdminSupabase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("leetcode_username, codeforces_username, gfg_username, codechef_username")
        .eq("id", userId)
        .single();

      if (profile) {
        const prof = profile as any;
        userProfiles = {
          leetcode: prof.leetcode_username,
          codeforces: prof.codeforces_username,
          gfg: prof.gfg_username,
          codechef: prof.codechef_username,
        };
      }
    }

    // 1. Sync all trackers concurrently
    const syncedStats = await syncAllCodingTrackers(userProfiles);

    // 2. Persist updated stats in Supabase if user exists
    if (userId) {
      const supabase = getAdminSupabase();
      for (const stat of syncedStats) {
        await supabase.from("tracker_stats").upsert({
          user_id: userId,
          platform: stat.platform,
          username: (userProfiles && userProfiles[stat.platform]) || "demo_dev",
          solved: stat.solved,
          rating: stat.rating || null,
          last_synced: stat.lastSynced,
        } as any);
      }
    }

    // 3. Compute updated readiness score
    const calculated = calculateOverallReadinessScore({
      matchScore: 84,
      gapCount: { high: 1, medium: 1, low: 1 },
      trackerStats: syncedStats,
      interviewScores: [8.5, 9.0],
    });

    // 4. Save readiness snapshot if user exists
    if (userId) {
      const supabase = getAdminSupabase();
      await supabase.from("readiness_scores").insert({
        user_id: userId,
        overall_score: calculated.overallScore,
        resume_score: calculated.resumeJdScore,
        skill_gap_score: calculated.skillGapScore,
        coding_score: calculated.codingScore,
        interview_score: calculated.interviewScore,
        recorded_at: new Date().toISOString(),
      } as any);
    }

    const today = new Date().toISOString().split("T")[0];
    const summary: ReadinessSummary = {
      overallScore: calculated.overallScore,
      reportsCompleted: 3,
      interviewsCompleted: 2,
      trackerStats: syncedStats,
      history: [
        { date: "2026-08-20", score: 68 },
        { date: "2026-08-24", score: 72 },
        { date: "2026-08-28", score: 75 },
        { date: "2026-08-31", score: 80 },
        { date: today, score: calculated.overallScore },
      ],
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Dashboard Sync Error:", error);
    const fallback = generateDefaultReadinessSummary();
    return NextResponse.json(fallback, { status: 200 });
  }
}
