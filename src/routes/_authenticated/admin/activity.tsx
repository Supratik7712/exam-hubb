import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminActivity } from "@/lib/attempts.functions";
import { pageHead } from "@/lib/page-head";

const activityQuery = queryOptions({ queryKey: ["admin-activity"], staleTime: 10_000, refetchInterval: 30_000, queryFn: () => getAdminActivity() });
export const Route = createFileRoute("/_authenticated/admin/activity")({ staticData: { sitemap: false },
  head: () => pageHead("Activity log", "Track every exam attempt and event across ExamHubb."),
  loader: ({ context }) => context.queryClient.ensureQueryData(activityQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: Activity,
});

const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : "—";
function Activity() {
  const { data } = useSuspenseQuery(activityQuery);
  const [tab, setTab] = useState("attempts"); const [q, setQ] = useState("");
  const s = q.toLowerCase();
  const attempts = data.attempts.filter(a => [a.candidate_name, a.account_name, a.email, a.roll_number, a.exam_title].some(v => v?.toLowerCase().includes(s)));
  const events = data.events.filter(e => e.text.toLowerCase().includes(s));
  function csv() {
    const rows = [["Name entered", "Roll", "Account", "Email", "Exam", "Subject", "Teacher", "Started", "Submitted", "Status", "Score", "Total", "Tab switches"],
      ...attempts.map(a => [a.candidate_name, a.roll_number, a.account_name ?? "", a.email ?? "", a.exam_title, a.subject, a.teacher ?? "", fmt(a.started_at), fmt(a.submitted_at), a.status, a.score, a.total_marks, a.tab_switches])];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "examhubb-attempts.csv"; el.click(); URL.revokeObjectURL(el.href);
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-bold">Activity log</h2><p className="mt-1 text-muted-foreground">{data.attempts.length} exam attempts · {data.events.length} recent events · refreshes every 30 seconds</p></div>
      <Button variant="outline" onClick={csv}><Download />Download attempts CSV</Button></div>
    <div className="flex flex-wrap items-center gap-3"><Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="attempts">Exam attempts</TabsTrigger><TabsTrigger value="events">All events</TabsTrigger></TabsList></Tabs>
      <Input aria-label="Search" className="max-w-xs" placeholder="Search name, email, exam…" value={q} onChange={e => setQ(e.target.value)} /></div>
    {tab === "attempts" ? <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Student</th><th className="p-3">Exam</th><th className="p-3">Started</th><th className="p-3">Submitted</th><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3">Tab switches</th></tr></thead>
      <tbody>{attempts.length ? attempts.map(a => <tr key={a.id} className="border-b last:border-0 align-top">
        <td className="p-3"><p className="font-medium">{a.candidate_name || a.account_name || "—"}</p><p className="text-xs text-muted-foreground">{a.roll_number && `Roll ${a.roll_number} · `}{a.email}</p></td>
        <td className="p-3"><p>{a.exam_title}</p><p className="text-xs text-muted-foreground">{a.subject}{a.teacher ? ` · ${a.teacher}` : ""}</p></td>
        <td className="p-3 whitespace-nowrap">{fmt(a.started_at)}</td><td className="p-3 whitespace-nowrap">{fmt(a.submitted_at)}</td>
        <td className="p-3"><Badge variant={a.status === "cancelled" ? "destructive" : a.status === "in_progress" ? "default" : "secondary"} className="capitalize">{a.status.replace("_", " ")}</Badge></td>
        <td className="p-3">{a.score}/{a.total_marks}</td><td className={`p-3 ${a.tab_switches ? "text-destructive" : ""}`}>{a.tab_switches}</td>
      </tr>) : <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No attempts found.</td></tr>}</tbody></table></div>
    : <ul className="divide-y rounded-lg border bg-card text-sm">{events.length ? events.map((e, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="flex items-center gap-2"><Badge variant="secondary" className="capitalize">{e.kind}</Badge>{e.text}</span><span className="text-xs text-muted-foreground">{fmt(e.at)}</span></li>) : <li className="p-6 text-center text-muted-foreground">No events found.</li>}</ul>}
  </div>;
}
