// app/api/gap-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdfBuffer } from "@/lib/parsers/pdf";
import { runMentorAgentWorkflow } from "@/lib/agents/graph";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authenticated user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

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

    // 2. Extract raw text from PDF
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeText = await extractTextFromPdfBuffer(buffer);

    // 3. Run unified LangGraph Mentor Agent Workflow
    const state = await runMentorAgentWorkflow({
      userId,
      mode: "analysis",
      resumeText,
      jdText: jobDescription,
      jdUrl: jobUrl,
    });

    if (!state.gapReport) {
      return NextResponse.json(
        { error: "Failed to generate gap analysis report" },
        { status: 500 }
      );
    }

    return NextResponse.json(state.gapReport, { status: 200 });
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
