// app/interview/page.tsx
import InterviewChat from "@/components/InterviewChat";
import { startInterview } from "@/lib/api";

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: { reportId?: string } | Promise<{ reportId?: string }>;
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const reportId = resolvedParams?.reportId;
  if (!reportId) {
    return <p className="text-slate-600">No gap report selected.</p>;
  }
  const session = await startInterview(reportId);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Mock interview</h1>
      <InterviewChat initialSession={session} />
    </div>
  );
}
