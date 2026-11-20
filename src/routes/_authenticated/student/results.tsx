import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { studentExamsQuery } from "@/lib/attempts.functions";
import { percentOf, passed } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/extras.functions";

export const Route = createFileRoute("/_authenticated/student/results")({
  head: () => pageHead("My results", "Scores and reviews of your submitted ExamHub exams."),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentExamsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: Results,
});

function Results() {
  const { data } = useSuspenseQuery(studentExamsQuery);
  const passMark = useQuery(settingsQuery).data?.pass_percent ?? 40;
  const done = data.filter(e => e.attempt && e.attempt.status !== "in_progress");
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Results</h2><p className="mt-1 text-muted-foreground">{done.length} submitted exams</p></div>
    {done.length ? <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Exam</th><th className="p-3">Submitted</th><th className="p-3">Score</th><th className="p-3">Result</th><th className="p-3" /></tr></thead>
      <tbody>{done.map(e => { const a = e.attempt!; const graded = a.status === "graded"; return <tr key={e.id} className="border-b last:border-0">
        <td className="p-3"><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.subject}</p></td>
        <td className="p-3">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</td>
        <td className="p-3 font-semibold">{a.score} / {a.total_marks} <span className="font-normal text-muted-foreground">({percentOf(a.score, a.total_marks)}%)</span></td>
        <td className="p-3">{graded ? <Badge variant={passed(a.score, a.total_marks, passMark) ? "default" : "destructive"}>{passed(a.score, a.total_marks, passMark) ? "Pass" : "Fail"}</Badge> : <Badge variant="secondary">Awaiting marking</Badge>}</td>
        <td className="p-3 text-right"><Link className="font-medium text-primary underline-offset-4 hover:underline" to="/student/attempt/$attemptId" params={{ attemptId: a.id }}>View</Link></td>
      </tr>; })}</tbody></table></div>
      : <EmptyState icon={ClipboardList} title="No results yet" text="Your score appears here after you submit an exam." />}
  </div>;
}
