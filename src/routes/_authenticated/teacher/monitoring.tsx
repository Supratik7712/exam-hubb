import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { getLiveAttempts } from "@/lib/extras.functions";
import { formatClock } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/teacher/monitoring")({
  head: () => pageHead("Live monitoring", "See which students are taking your ExamHubb exams right now."),
  component: Monitoring,
});

function Monitoring() {
  const get = useServerFn(getLiveAttempts);
  const { data, isLoading, dataUpdatedAt } = useQuery({ queryKey: ["live-attempts"], queryFn: () => get(), refetchInterval: 10_000 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const rows = data ?? [];
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Live monitoring</h2><p className="mt-1 text-muted-foreground">{rows.length} students in an exam right now · updates every 10 seconds{dataUpdatedAt ? ` · last ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}</p></div>
    {isLoading ? <p className="text-muted-foreground">Loading…</p> : rows.length ? <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Student</th><th className="p-3">Exam</th><th className="p-3">Progress</th><th className="p-3">Time left</th><th className="p-3">Last activity</th></tr></thead>
      <tbody>{rows.map(r => { const left = Math.max(0, Math.floor((Date.parse(r.deadline) - now) / 1000)); return <tr key={r.id} className="border-b last:border-0">
        <td className="p-3 font-medium">{r.student_name}</td><td className="p-3">{r.exam_title}</td>
        <td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${r.total ? (r.answered / r.total) * 100 : 0}%` }} /></div>{r.answered}/{r.total}</div></td>
        <td className={`p-3 font-mono ${left < 60 ? "text-destructive" : ""}`}>{formatClock(left)}</td>
        <td className="p-3 text-muted-foreground">{r.last_activity ? new Date(r.last_activity).toLocaleTimeString() : "Not started answering"}</td>
      </tr>; })}</tbody></table></div> : <EmptyState icon={Activity} title="No one is taking an exam right now" text="When students start one of your exams, they show up here live." />}
  </div>;
}
