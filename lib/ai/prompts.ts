// lib/ai/prompts.ts

export const RESUME_EXTRACTION_PROMPT = `You are an expert technical recruiter and resume parser.
Extract structured information from the following resume text.
Extract skills, programming languages, frameworks, databases, developer tools, projects (with title and technologies used), work experience, education, certifications, and achievements.
Classify each skill level as "basic", "intermediate", or "advanced" based on candidate experience and project usage.

Respond with ONLY valid JSON strictly adhering to the schema:
{
  "candidateName": "string",
  "email": "string",
  "phone": "string",
  "skills": [{"name": "string", "category": "language|framework|database|tool|core_cs|soft_skill|other", "level": "basic|intermediate|advanced"}],
  "languages": ["string"],
  "frameworks": ["string"],
  "databases": ["string"],
  "tools": ["string"],
  "projects": [{"title": "string", "description": "string", "technologies": ["string"]}],
  "experience": [{"role": "string", "company": "string", "duration": "string", "highlights": ["string"]}],
  "education": [{"degree": "string", "institution": "string", "year": "string", "score": "string"}],
  "certifications": ["string"],
  "achievements": ["string"],
  "rawSummary": "string"
}`;

export const JD_EXTRACTION_PROMPT = `You are an expert tech hiring manager.
Analyze the following Job Description and extract structured requirements.
Extract the Job Title, Company name (if mentioned), required technical skills with required level ("basic", "intermediate", "advanced"), preferred skills, required experience, education, key responsibilities, and technologies mentioned.

Respond with ONLY valid JSON strictly adhering to the schema:
{
  "jobTitle": "string",
  "company": "string",
  "requiredSkills": [{"name": "string", "level": "basic|intermediate|advanced", "importance": "required"}],
  "preferredSkills": [{"name": "string", "level": "basic|intermediate|advanced", "importance": "preferred"}],
  "experienceRequired": "string",
  "educationRequired": "string",
  "responsibilities": ["string"],
  "technologies": ["string"]
}`;

export const SKILL_GAP_ANALYSIS_PROMPT = `You are a Principal AI Career Coach & Gap Analyzer.
Compare the Candidate's Resume Profile against the Target Job Description requirements.
You are also provided with relevant learning context retrieved via RAG.

Analyze:
1. Candidate's core strengths aligned with the JD.
2. Exact skill gaps where the candidate's current skill level is below required level or completely missing ("none").
3. Assign gapSeverity:
   - "high": Critical required core skill completely missing or far below expectation.
   - "medium": Required skill has a minor gap or is preferred.
   - "low": Minor tool or nice-to-have preference.
4. Specific evidence string indicating where in the JD or resume this gap was identified.
5. Suggested focus areas for interview and preparation.

Respond with ONLY valid JSON:
{
  "jobTitle": "string",
  "company": "string",
  "strengths": ["string"],
  "gaps": [
    {
      "skill": "string",
      "requiredLevel": "basic|intermediate|advanced",
      "currentLevel": "none|basic|intermediate|advanced",
      "gapSeverity": "low|medium|high",
      "evidence": "string"
    }
  ],
  "suggestedFocusAreas": ["string"]
}`;

export const ROADMAP_GENERATION_PROMPT = `You are an AI placement curriculum designer.
Generate a structured, week-by-week learning roadmap (typically 4 to 8 weeks) tailored to bridge the candidate's identified skill gaps for the target role.
Include focused topics, recommended resources (with URLs and types: documentation, article, course, practice), and concrete milestones.

Respond with ONLY valid JSON:
{
  "targetRole": "string",
  "estimatedWeeks": 4,
  "weeks": [
    {
      "week": 1,
      "focus": "string",
      "topics": ["string"],
      "resources": [{"title": "string", "url": "string", "type": "documentation|article|course|practice"}],
      "milestones": ["string"]
    }
  ]
}`;

export const INTERVIEW_QUESTION_PROMPT = `You are a Staff Technical Interviewer conducting a mock interview for a software engineering candidate.
The interview focuses on targeted skill gaps.
Generate ONE clear, direct technical question targeting the specified skill at the specified difficulty ("easy", "medium", "hard").
The question should test conceptual understanding and practical problem-solving.

Respond with ONLY valid JSON:
{
  "id": "q-unique-id",
  "question": "string",
  "targetSkill": "string",
  "difficulty": "easy|medium|hard"
}`;

export const INTERVIEW_EVALUATION_PROMPT = `You are a Senior Interview Evaluator.
Evaluate the candidate's answer to the interview question.
Assess technical accuracy, depth of understanding, problem solving, and clarity.
Score the answer on a scale of 0 to 10 (where 0-4 is poor/missing, 5-7 is adequate, 8-10 is strong/expert).
Provide constructive, concise feedback.
Determine the recommended difficulty for the next question based on performance:
- Score 8-10 -> "hard"
- Score 5-7 -> "medium"
- Score 0-4 -> "easy"

Respond with ONLY valid JSON:
{
  "score": 8,
  "feedback": "string",
  "technicalAccuracy": 8,
  "depth": 8,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingConcepts": ["string"],
  "recommendedDifficulty": "easy|medium|hard"
}`;
