// app/api/gap-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdfBuffer } from "@/lib/parsers/pdf";
import { runGapAnalyzerAgent } from "@/lib/agents/gap-analyzer";
import { saveGapReport } from "@/lib/services/report-service";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jobDescription = (formData.get("jobDescription") as string) || "";
    const jobUrl = (formData.get("jobUrl") as string) || undefined;

    if (!resumeFile) {
      return NextResponse.json(
        { error: "A resume PDF file is required" },
        { status: 400 }
      );
    }

    if (!jobDescription.trim() && !jobUrl) {
      return NextResponse.json(
        { error: "A job description text or job URL is required" },
        { status: 400 }
      );
    }

    // 1. Extract raw text from PDF
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeText = await extractTextFromPdfBuffer(buffer);

    // 2. Identify authenticated user if present
    const user = await getAuthenticatedUser();
    const userId = user?.id;

    // 3. Run LangGraph Gap Analyzer Agent
    const report = await runGapAnalyzerAgent({
      resumeText,
      jobDescriptionText: jobDescription,
      jobUrl,
      userId,
    });

    // 4. Save report in persistence layer
    await saveGapReport(report, userId);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("Gap Analysis API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run gap analysis",
      },
      { status: 500 }
    );
  }
}
