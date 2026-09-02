// app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGapReportById } from "@/lib/services/report-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    const report = await getGapReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("Fetch Report API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gap report" },
      { status: 500 }
    );
  }
}
