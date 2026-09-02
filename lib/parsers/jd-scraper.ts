// lib/parsers/jd-scraper.ts
import * as cheerio from "cheerio";
import { generateStructuredAI } from "@/lib/ai/gemini";
import { JD_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { ParsedJobDescriptionSchema, type ParsedJobDescription } from "@/lib/validation/schemas";

/** Validates URL and prevents Server-Side Request Forgery (SSRF) */
export function validateUrlForSsrf(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https protocols are supported");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback and local hostnames
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Access to local addresses is prohibited");
  }

  // Block private IP ranges
  const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const octet1 = parseInt(ipMatch[1], 10);
    const octet2 = parseInt(ipMatch[2], 10);
    if (
      octet1 === 10 || // 10.0.0.0/8
      (octet1 === 172 && octet2 >= 16 && octet2 <= 31) || // 172.16.0.0/12
      (octet1 === 192 && octet2 === 168) || // 192.168.0.0/16
      (octet1 === 169 && octet2 === 254) // 169.254.0.0/16 Link-local
    ) {
      throw new Error("Access to private IP ranges is prohibited");
    }
  }

  return parsed;
}

export async function scrapeJobDescriptionFromUrl(url: string): Promise<string> {
  const validatedUrl = validateUrlForSsrf(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(validatedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch job description URL: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noisy elements
    $("script, style, noscript, nav, header, footer, svg, img, form, iframe").remove();

    // Prefer main content containers if available
    const mainContent =
      $("main").text() ||
      $("article").text() ||
      $(".job-description").text() ||
      $(".description").text() ||
      $("body").text();

    const cleanedText = mainContent
      .replace(/\s+/g, " ")
      .replace(/[\r\n]+/g, "\n")
      .trim();

    return cleanedText.slice(0, 10000);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Job description URL fetch timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getMockParsedJobDescription(rawText?: string): ParsedJobDescription {
  const text = rawText || "";
  let title = "Full Stack Engineer";
  let company = "Acme Cloud Corp";

  if (text.toLowerCase().includes("frontend") || text.toLowerCase().includes("react")) {
    title = "Frontend Engineer";
  } else if (text.toLowerCase().includes("backend") || text.toLowerCase().includes("distributed")) {
    title = "Backend Engineer";
  }

  return {
    jobTitle: title,
    company: company,
    requiredSkills: [
      { name: "React", level: "advanced", importance: "required" },
      { name: "TypeScript", level: "intermediate", importance: "required" },
      { name: "Node.js", level: "intermediate", importance: "required" },
      { name: "System Design", level: "intermediate", importance: "required" },
      { name: "PostgreSQL", level: "intermediate", importance: "required" },
      { name: "Docker", level: "intermediate", importance: "required" },
    ],
    preferredSkills: [
      { name: "GraphQL", level: "basic", importance: "preferred" },
      { name: "Kubernetes", level: "basic", importance: "preferred" },
      { name: "Redis", level: "intermediate", importance: "preferred" },
      { name: "AWS", level: "intermediate", importance: "preferred" },
    ],
    experienceRequired: "1-3 years in full-stack web application development",
    educationRequired: "B.Tech/B.S. in Computer Science or related field",
    responsibilities: [
      "Architect and build high-performance web applications using React and Node.js.",
      "Design reliable PostgreSQL relational databases and REST/GraphQL APIs.",
      "Participate in code reviews, automated unit testing, and agile sprint cycles.",
    ],
    technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Redis", "AWS"],
  };
}

export async function parseJobDescription(rawText: string, jobUrl?: string): Promise<ParsedJobDescription> {
  let contentToParse = rawText;

  if (!contentToParse && jobUrl) {
    contentToParse = await scrapeJobDescriptionFromUrl(jobUrl);
  }

  if (!contentToParse || contentToParse.trim().length === 0) {
    return getMockParsedJobDescription();
  }

  return generateStructuredAI<ParsedJobDescription>({
    systemPrompt: JD_EXTRACTION_PROMPT,
    userPrompt: `Here is the Job Description text:\n\n${contentToParse.slice(0, 8000)}`,
    schema: ParsedJobDescriptionSchema,
    mockFallback: () => getMockParsedJobDescription(contentToParse),
  });
}
