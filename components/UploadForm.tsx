// components/UploadForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeGap } from "@/lib/api";

export default function UploadForm() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(resumeFile && (jobDescription.trim() || jobUrl.trim()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeFile) return;
    setLoading(true);
    setError(null);
    try {
      const report = await analyzeGap(resumeFile, jobDescription, jobUrl);
      // Report is cached server-side; route with its id.
      router.push(`/report?id=${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Resume (PDF)
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md
 file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700
 hover:file:bg-blue-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Job description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="Paste the JD text here..."
          className="w-full rounded-md border border-slate-300 p-3 text-sm
 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Job posting URL
        </label>
        <input
          type="url"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://company.com/careers/role"
          className="w-full rounded-md border border-slate-300 p-3 text-sm
 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white
 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Analyze gap"}
      </button>
    </form>
  );
}
