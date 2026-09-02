// app/page.tsx
import UploadForm from "@/components/UploadForm";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-3xl font-semibold">Find your gap. Close it.</h1>
      <p className="mb-8 text-slate-600">
        Upload your resume and a job description. The Gap Analyzer agent
        compares them and hands the result to the Interviewer agent, which
        drills into exactly what you&apos;re missing.
      </p>
      <UploadForm />
    </div>
  );
}
