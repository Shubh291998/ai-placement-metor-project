// app/api/roadmaps/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoadmapByReportId } from "@/lib/services/report-service";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing roadmap ID" }, { status: 400 });
    }

    const roadmap = await getRoadmapByReportId(id, user.id);
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json(roadmap, { status: 200 });
  } catch (error) {
    console.error("Fetch Roadmap API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}
