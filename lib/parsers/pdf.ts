// lib/parsers/pdf.ts
import pdfParse from "pdf-parse";
import { generateStructuredAI } from "@/lib/ai/gemini";
import { RESUME_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { ParsedResumeSchema, type ParsedResume } from "@/lib/validation/schemas";

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("Failed to parse PDF text:", error);
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function getMockParsedResume(rawText?: string): ParsedResume {
  const text = rawText || "";
  return {
    candidateName: "Alex Mercer",
    email: "alex.mercer@example.com",
    phone: "+1-555-0199",
    skills: [
      { name: "JavaScript", category: "language", level: "advanced" },
      { name: "TypeScript", category: "language", level: "intermediate" },
      { name: "React", category: "framework", level: "advanced" },
      { name: "Node.js", category: "framework", level: "intermediate" },
      { name: "PostgreSQL", category: "database", level: "basic" },
      { name: "Git", category: "tool", level: "intermediate" },
      { name: "Data Structures", category: "core_cs", level: "intermediate" },
    ],
    languages: ["JavaScript", "TypeScript", "Python", "SQL"],
    frameworks: ["React", "Next.js", "Express", "Tailwind CSS"],
    databases: ["PostgreSQL", "MongoDB"],
    tools: ["Git", "Docker", "VS Code", "Postman"],
    projects: [
      {
        title: "E-Commerce Microservices Platform",
        description: "Built scalable product catalog and cart services with Node.js and Redis.",
        technologies: ["Node.js", "Express", "Redis", "PostgreSQL", "Docker"],
      },
      {
        title: "Real-Time Collaborative Code Editor",
        description: "WebSocket-based live markdown and code collaboration tool with React and Node.js.",
        technologies: ["React", "TypeScript", "WebSocket", "Tailwind CSS"],
      },
    ],
    experience: [
      {
        role: "Software Engineering Intern",
        company: "TechNova Solutions",
        duration: "May 2025 - Aug 2025",
        highlights: [
          "Developed REST APIs in Node.js and improved response latency by 25%.",
          "Implemented frontend reusable component library using React and Tailwind.",
        ],
      },
    ],
    education: [
      {
        degree: "B.Tech in Computer Science & Engineering",
        institution: "Apex University",
        year: "2022 - 2026",
        score: "8.8 CGPA",
      },
    ],
    certifications: [
      "AWS Certified Cloud Practitioner",
      "Meta Front-End Developer Certificate",
    ],
    achievements: [
      "Ranked Top 5% in National Coding Olympiad 2024",
      "Solved 400+ problems across LeetCode & Codeforces",
    ],
    rawSummary: text.slice(0, 500),
  };
}

export async function parseResumeText(rawText: string): Promise<ParsedResume> {
  if (!rawText || rawText.trim().length === 0) {
    return getMockParsedResume();
  }

  return generateStructuredAI<ParsedResume>({
    systemPrompt: RESUME_EXTRACTION_PROMPT,
    userPrompt: `Here is the candidate resume text:\n\n${rawText.slice(0, 8000)}`,
    schema: ParsedResumeSchema,
    mockFallback: () => getMockParsedResume(rawText),
  });
}
