// app/api/webhook/cron/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { syncAllCodingTrackers } from "@/lib/integrations";
import { calculateOverallReadinessScore } from "@/lib/services/readiness";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get("secret");

    const expectedSecret = process.env.CRON_SECRET || "demo-cron-secret-2026";
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const providedSecret = bearerToken || cronHeader || querySecret;

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, leetcode_username, codeforces_username, gfg_username, codechef_username");

    let syncedCount = 0;
    const profileList = (profiles as any[]) || [];

    if (!error && profileList.length > 0) {
      for (const profile of profileList) {
        try {
          const stats = await syncAllCodingTrackers({
            leetcode: profile.leetcode_username || undefined,
            codeforces: profile.codeforces_username || undefined,
            gfg: profile.gfg_username || undefined,
            codechef: profile.codechef_username || undefined,
          });

          for (const stat of stats) {
            await supabase.from("tracker_stats").upsert({
              user_id: profile.id,
              platform: stat.platform,
              username: stat.platform,
              solved: stat.solved,
              rating: stat.rating || null,
              last_synced: stat.lastSynced,
            } as any);
          }

          const scoreCalc = calculateOverallReadinessScore({
            trackerStats: stats,
          });

          await supabase.from("readiness_scores").insert({
            user_id: profile.id,
            overall_score: scoreCalc.overallScore,
            resume_score: scoreCalc.resumeJdScore,
            skill_gap_score: scoreCalc.skillGapScore,
            coding_score: scoreCalc.codingScore,
            interview_score: scoreCalc.interviewScore,
            recorded_at: new Date().toISOString(),
          } as any);

          syncedCount++;
        } catch (syncErr) {
          console.error(`Failed to sync profile ${profile.id}:`, syncErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        syncedUsers: syncedCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron webhook execution error:", error);
    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
