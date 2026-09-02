// lib/validation/schemas.ts
import { z } from "zod";

// --- Resume Schemas ---
export const ResumeSkillItemSchema = z.object({
  name: z.string(),
  category: z.enum(["language", "framework", "database", "tool", "core_cs", "soft_skill", "other"]).default("other"),
  level: z.enum(["none", "basic", "intermediate", "advanced"]).default("basic"),
});

export const ResumeProjectSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
});

export const ResumeExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  duration: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});

export const ResumeEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string().optional(),
  score: z.string().optional(),
});

export const ParsedResumeSchema = z.object({
  candidateName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  skills: z.array(ResumeSkillItemSchema).default([]),
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  databases: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  experience: z.array(ResumeExperienceSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  rawSummary: z.string().optional(),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

// --- Job Description Schemas ---
export const JDSkillItemSchema = z.object({
  name: z.string(),
  level: z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
  importance: z.enum(["required", "preferred"]).default("required"),
});

export const ParsedJobDescriptionSchema = z.object({
  jobTitle: z.string(),
  company: z.string().optional(),
  requiredSkills: z.array(JDSkillItemSchema).default([]),
  preferredSkills: z.array(JDSkillItemSchema).default([]),
  experienceRequired: z.string().optional(),
  educationRequired: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export type ParsedJobDescription = z.infer<typeof ParsedJobDescriptionSchema>;

// --- Skill Gap Schemas ---
export const SkillGapItemSchema = z.object({
  skill: z.string(),
  requiredLevel: z.enum(["basic", "intermediate", "advanced"]),
  currentLevel: z.enum(["none", "basic", "intermediate", "advanced"]),
  gapSeverity: z.enum(["low", "medium", "high"]),
  evidence: z.string(),
});

export const GapReportOutputSchema = z.object({
  jobTitle: z.string(),
  company: z.string().optional(),
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(SkillGapItemSchema),
  suggestedFocusAreas: z.array(z.string()),
});

export type GapReportOutput = z.infer<typeof GapReportOutputSchema>;

// --- Roadmap Schemas ---
export const RoadmapResourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  type: z.enum(["documentation", "article", "course", "practice"]),
});

export const RoadmapWeekSchema = z.object({
  week: z.number().int().positive(),
  focus: z.string(),
  topics: z.array(z.string()),
  resources: z.array(RoadmapResourceSchema).default([]),
  milestones: z.array(z.string()),
});

export const RoadmapOutputSchema = z.object({
  targetRole: z.string(),
  estimatedWeeks: z.number().int().min(1).max(24).default(4),
  weeks: z.array(RoadmapWeekSchema),
});

export type RoadmapOutput = z.infer<typeof RoadmapOutputSchema>;

// --- Interview Schemas ---
export const InterviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  targetSkill: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const InterviewTurnEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string(),
  technicalAccuracy: z.number().min(0).max(10).optional(),
  depth: z.number().min(0).max(10).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  missingConcepts: z.array(z.string()).optional(),
  recommendedDifficulty: z.enum(["easy", "medium", "hard"]),
});

export type InterviewTurnEvaluation = z.infer<typeof InterviewTurnEvaluationSchema>;

// --- API Request Schemas ---
export const InterviewStartRequestSchema = z.object({
  reportId: z.string().min(1),
});

export const InterviewAnswerRequestSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
});
