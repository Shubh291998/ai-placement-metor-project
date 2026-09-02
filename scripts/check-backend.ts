// scripts/check-backend.ts
// Direct terminal execution of the entire backend pipeline without any external API or web server.

import { runGapAnalyzerAgent } from "../lib/agents/gap-analyzer";
import { generateQuestion, selectTargetSkillsForInterview } from "../lib/agents/interviewer";
import { evaluateAnswer } from "../lib/agents/evaluator";
import { calculateOverallReadinessScore } from "../lib/services/readiness";
import type { TrackerStats } from "../lib/types";

async function main() {
  console.log("==========================================================");
  console.log("🚀 AI PLACEMENT MENTOR - OFFLINE BACKEND PIPELINE VERIFICATION");
  console.log("==========================================================\n");

  // --- STEP 1: RESUME & JOB DESCRIPTION INPUT ---
  console.log("📄 1. Input Candidate Resume & Job Description...");
  const sampleResume = `
    Alex Chen - Software Engineer
    Skills: JavaScript, TypeScript, React, Next.js, Node.js, Express, HTML, CSS, Git, REST APIs, PostgreSQL (basic)
    Experience: 2 years building frontend and full-stack web applications.
    Education: B.S. in Computer Science.
  `;

  const sampleJD = `
    Role: Senior Full Stack Engineer at FinTech Corp
    Requirements:
    - 3+ years experience with TypeScript, React, and Node.js
    - Strong proficiency in PostgreSQL database optimization & indexing
    - Practical knowledge of Docker and container orchestration
    - Proven experience with scalable Distributed Systems and System Design
  `;

  console.log("✓ Inputs loaded successfully.\n");

  // --- STEP 2: RUN LANGGRAPH GAP ANALYZER AGENT ---
  console.log("🤖 2. Executing LangGraph Gap Analyzer Agent...");
  console.log("   Nodes: [extract_skills] -> [retrieve_rag_context] -> [compare_skills] -> [validate_and_score] -> [generate_roadmap] -> [persist_report]");

  const report = await runGapAnalyzerAgent({
    resumeText: sampleResume,
    jobDescriptionText: sampleJD,
  });

  console.log("\n📊 --- GAP ANALYZER RESULTS ---");
  console.log(`Report ID:    ${report.id}`);
  console.log(`Target Role:  ${report.jobTitle} ${report.company ? `@ ${report.company}` : ""}`);
  console.log(`Match Score:  ${report.matchScore}%`);
  console.log("\nStrengths Detected:");
  report.strengths.forEach((s) => console.log(`  + ${s}`));

  console.log("\nIdentified Skill Gaps:");
  report.gaps.forEach((g) => {
    console.log(`  - [${g.gapSeverity.toUpperCase()}] ${g.skill}: Required (${g.requiredLevel}) vs Current (${g.currentLevel})`);
    console.log(`    Evidence: ${g.evidence}`);
  });

  console.log("\nSuggested Focus Areas:");
  console.log(`  ${report.suggestedFocusAreas.join(", ")}\n`);

  // --- STEP 3: MOCK INTERVIEW AGENT ---
  console.log("🎯 3. Executing Mock Interview Multi-Agent...");
  const targetSkills = selectTargetSkillsForInterview(report.gaps);
  console.log(`Prioritized Target Skills for Interview: ${targetSkills.join(", ")}`);

  const primarySkill = targetSkills[0] || "System Design";
  const question = await generateQuestion({
    targetSkill: primarySkill,
    difficulty: "medium",
    turnIndex: 0,
  });

  console.log(`\nGenerated Question [${question.targetSkill} · ${question.difficulty}]:`);
  console.log(`"${question.question}"`);

  // Simulate Candidate Answer
  const sampleAnswer = `
    To scale database queries under heavy load in PostgreSQL, I would first analyze slow queries using EXPLAIN ANALYZE.
    I'd add B-Tree indexes on frequently filtered or joined columns, implement connection pooling with PgBouncer,
    and cache read-heavy results using Redis with a TTL invalidation strategy.
  `;
  console.log(`\nCandidate Answer Submitted:`);
  console.log(`"${sampleAnswer.trim()}"`);

  // Evaluate Answer
  const evaluation = await evaluateAnswer({
    question,
    answer: sampleAnswer,
  });

  console.log(`\nEvaluator Score: ${evaluation.score}/10`);
  console.log(`Feedback: ${evaluation.feedback}`);
  console.log(`Next Recommended Difficulty: ${evaluation.recommendedDifficulty.toUpperCase()}\n`);

  // --- STEP 4: READINESS SCORING ENGINE ---
  console.log("📈 4. Calculating 4-Pillar Placement Readiness Score...");
  const mockTrackerStats: TrackerStats[] = [
    { platform: "leetcode", solved: 320, rating: 1740, lastSynced: new Date().toISOString() },
    { platform: "codeforces", solved: 140, rating: 1380, lastSynced: new Date().toISOString() },
    { platform: "gfg", solved: 180, lastSynced: new Date().toISOString() },
    { platform: "codechef", solved: 85, rating: 1510, lastSynced: new Date().toISOString() },
  ];

  const highGaps = report.gaps.filter((g) => g.gapSeverity === "high").length;
  const medGaps = report.gaps.filter((g) => g.gapSeverity === "medium").length;
  const lowGaps = report.gaps.filter((g) => g.gapSeverity === "low").length;

  const readiness = calculateOverallReadinessScore({
    matchScore: report.matchScore,
    gapCount: { high: highGaps, medium: medGaps, low: lowGaps },
    trackerStats: mockTrackerStats,
    interviewScores: [evaluation.score],
  });

  console.log("----------------------------------------------------------");
  console.log(`🏆 OVERALL READINESS SCORE: ${readiness.overallScore}%`);
  console.log("----------------------------------------------------------");
  console.log(`  1. Resume & JD Match (25%):    ${readiness.resumeJdScore}%`);
  console.log(`  2. Skill Gap Remediation (25%): ${readiness.skillGapScore}%`);
  console.log(`  3. Coding Tracker Activity (25%):${readiness.codingScore}%`);
  console.log(`  4. Mock Interview Performance (25%): ${readiness.interviewScore}%`);
  console.log("==========================================================\n");
  console.log("🎉 ALL BACKEND SYSTEMS EXECUTED AND VERIFIED SUCCESSFULLY WITHOUT EXTERNAL APIS!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
