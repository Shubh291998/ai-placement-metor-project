# 🎯 AI Placement Mentor

An intelligent, multi-agent placement mentorship platform that analyzes skill gaps between student resumes and job descriptions, conducts targeted adaptive mock interviews, aggregates live coding platform activity, and computes comprehensive 4-pillar placement readiness scores.

---

## 🌟 Key Architecture & Features

### 1. 🤖 LangGraph Gap Analyzer Agent
- **PDF Resume Parsing**: Extracts structured technical skills, experience, and educational background via `pdf-parse`.
- **Job Description Extraction**: Ingests raw text or scrapes live job postings via `cheerio`.
- **RAG-Augmented Context**: Queries Supabase `pgvector` with 384-dimensional local MiniLM embeddings (`@xenova/transformers`) to ground recommendations in industry standards.
- **Deterministic Match Scoring**: Weighted matching algorithm evaluating required vs. current skill proficiencies with configurable penalties for severe skill gaps.
- **Automated Roadmap Generation**: Builds a tailored 4-week remediation curriculum with targeted resources and milestones.

### 2. 🎯 Adaptive Mock Interviewer Multi-Agent
- **Gap-Targeted Question Generation**: Formulates technical questions focusing on high-severity skill deficiencies.
- **Rubric-Based Evaluation**: Real-time evaluator agent grades candidate responses (0–10), provides constructive feedback, and dynamically adjusts the difficulty (`easy` ➔ `medium` ➔ `hard`) for subsequent questions.

### 3. 📊 Coding Platform Integrations
- Aggregates live problem-solving statistics and contest ratings from:
  - **LeetCode** (GraphQL API)
  - **Codeforces** (Official REST API)
  - **GeeksforGeeks** (Profile Scraping)
  - **CodeChef** (Rating Scraping)

### 4. 📈 4-Pillar Readiness Scoring Engine
Computes an objective, normalized 0–100 readiness score:
- **25%** Resume & Job Description Alignment
- **25%** Skill Gap Remediation
- **25%** Coding Platform Track Record
- **25%** Mock Interview Performance

### 5. 🗄️ Database & Schema
- Complete PostgreSQL schema located in `supabase/migrations/20260902_init_schema.sql`.
- Configured with Row Level Security (RLS) on all tables and pgvector cosine similarity RPC (`match_learning_resources`).

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm

### 1. Installation
```bash
npm install
```

### 2. Offline Backend Demo (No API Keys Needed)
Verify the complete end-to-end multi-agent pipeline directly in your terminal:
```bash
npm run demo
```

### 3. Run Automated Tests
Execute the full Vitest suite (10/10 unit tests):
```bash
npm test
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the UI.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials:
```env
# Google Gemini API (optional: fallback demo mode is active if omitted)
GEMINI_API_KEY=your-gemini-api-key

# Supabase (optional: in-memory cache is active if omitted)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Webhook secret for scheduled cron synchronization
CRON_SECRET=your-secret-key
```

---

## 📁 Repository Structure

```
├── app/
│   ├── api/
│   │   ├── gap-analysis/         # POST: Run resume vs JD analysis
│   │   ├── reports/[id]/         # GET: Fetch gap report by ID
│   │   ├── interview/start/      # POST: Initialize mock interview session
│   │   ├── interview/[sessionId]/answer/ # POST: Submit answer & get evaluation
│   │   ├── dashboard/summary/    # GET: Fetch readiness summary
│   │   ├── dashboard/sync/       # POST: Manually sync coding stats
│   │   └── webhook/cron/         # POST: Scheduled sync webhook
│   ├── dashboard/page.tsx        # Readiness dashboard
│   ├── interview/page.tsx        # Mock interview chat interface
│   ├── report/page.tsx           # Gap analysis report
│   └── page.tsx                  # Home upload form
├── components/                   # React components (UploadForm, InterviewChat, etc.)
├── lib/
│   ├── agents/                   # LangGraph & Gemini agents (Gap Analyzer, Interviewer, Evaluator)
│   ├── integrations/             # LeetCode, Codeforces, GFG, CodeChef scrapers/APIs
│   ├── parsers/                  # PDF parser & JD web scraper
│   ├── rag/                      # pgvector store & retriever
│   └── services/                 # Readiness calculation & report cache services
├── supabase/
│   ├── migrations/               # PostgreSQL + pgvector schema
│   └── seed.sql                  # Seed knowledge documents for RAG
├── tests/                        # Vitest automated test suites
└── scripts/                      # Offline terminal runner scripts
```

---

## 📜 License
MIT
