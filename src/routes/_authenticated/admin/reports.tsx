import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { BookOpen, ClipboardList, Percent, Trophy, Download } from "lucide-react";
import { StatCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getReport } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";

const reportQuery = queryOptions({ queryKey: ["admin-report"], staleTime: 30_000, queryFn: () => getReport() });
export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => pageHead("Platform reports", "Exam, attempt and pass-rate reports across ExamHubb."),
  loader: ({ context }) => context.queryClient.ensureQueryData(reportQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: Reports,
});

function Reports() {
  const { data: r } = useSuspenseQuery(reportQuery);
  function csv() {
    const rows = [["Exam", "Subject", "Teacher", "Attempts", "Average %", "Passed"], ...r.per_exam.map(e => [e.title, e.subject, e.teacher ?? "", e.attempts, e.avg_percent ?? "", e.passed])];
    const blob = new Blob([rows.map(x => x.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "examhubb-report.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-bold">Reports</h2><p className="mt-1 text-muted-foreground">{r.open_feedback} open feedback items</p></div><Button variant="outline" onClick={csv}><Download />Download CSV</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Exams" value={r.exams} hint={`${r.published} published`} icon={BookOpen} />
      <StatCard label="Attempts" value={r.attempts} hint={`${r.graded} fully marked`} icon={ClipboardList} />
      <StatCard label="Average score" value={r.avg_percent != null ? `${r.avg_percent}%` : "—"} icon={Percent} />
      <StatCard label="Pass rate" value={r.pass_rate != null ? `${r.pass_rate}%` : "—"} icon={Trophy} />
    </div>
    <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Exam</th><th className="p-3">Teacher</th><th className="p-3">Attempts</th><th className="p-3">Average</th><th className="p-3">Passed</th></tr></thead>
      <tbody>{r.per_exam.length ? r.per_exam.map(e => <tr key={e.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.subject}</p></td><td className="p-3">{e.teacher}</td><td className="p-3">{e.attempts}</td><td className="p-3">{e.avg_percent != null ? `${e.avg_percent}%` : "—"}</td><td className="p-3">{e.passed}</td></tr>)
        : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No published exams yet.</td></tr>}</tbody></table></div>
  </div>;
}
