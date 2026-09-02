// app/dashboard/page.tsx
import ReadinessDashboard from "@/components/ReadinessDashboard";
import { getReadinessSummary } from "@/lib/api";

export default async function DashboardPage() {
  const summary = await getReadinessSummary();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Your readiness</h1>
      <ReadinessDashboard initialSummary={summary} />
    </div>
  );
}
