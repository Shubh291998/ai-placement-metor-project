// tests/api.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET as getSummary } from "../app/api/dashboard/summary/route";
import { POST as postSync } from "../app/api/dashboard/sync/route";
import { GET as getReport } from "../app/api/reports/[id]/route";
import { GET as getRoadmapRoute } from "../app/api/roadmaps/[id]/route";
import { POST as postInterviewStart } from "../app/api/interview/start/route";
import { POST as postInterviewAnswer } from "../app/api/interview/[sessionId]/answer/route";
import { NextRequest } from "next/server";

describe("Protected API Routes Authentication Verification", () => {
  it("should return 401 for unauthenticated GET /api/dashboard/summary", async () => {
    const req = new NextRequest("http://localhost:3000/api/dashboard/summary");
    const res = await getSummary(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 for unauthenticated POST /api/dashboard/sync", async () => {
    const req = new NextRequest("http://localhost:3000/api/dashboard/sync", { method: "POST" });
    const res = await postSync(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 for unauthenticated GET /api/reports/[id]", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/rep_123");
    const res = await getReport(req, { params: { id: "rep_123" } });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 for unauthenticated GET /api/roadmaps/[id]", async () => {
    const req = new NextRequest("http://localhost:3000/api/roadmaps/rdm_123");
    const res = await getRoadmapRoute(req, { params: { id: "rdm_123" } });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 for unauthenticated POST /api/interview/start", async () => {
    const req = new NextRequest("http://localhost:3000/api/interview/start", {
      method: "POST",
      body: JSON.stringify({ reportId: "rep_123" }),
    });
    const res = await postInterviewStart(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 for unauthenticated POST /api/interview/[sessionId]/answer", async () => {
    const req = new NextRequest("http://localhost:3000/api/interview/ses_123/answer", {
      method: "POST",
      body: JSON.stringify({ questionId: "q_1", answer: "test answer" }),
    });
    const res = await postInterviewAnswer(req, { params: { sessionId: "ses_123" } });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});
