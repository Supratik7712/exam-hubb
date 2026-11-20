import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, Percent, Trophy, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard, EmptyState } from "@/components/app-shell";
import { studentExamsQuery } from "@/lib/attempts.functions";
import { percentOf } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/student/performance")({
  head: () => pageHead("My performance", "Track your ExamHub scores over time and by subject."),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentExamsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: Performance,
});

function Performance() {
  const { data } = useSuspenseQuery(studentExamsQuery);
  const done = data.filter(e => e.attempt && e.attempt.status !== "in_progress")
    .sort((a, b) => Date.parse(a.attempt!.submitted_at ?? "") - Date.parse(b.attempt!.submitted_at ?? ""))
    .map(e => ({ name: e.title.length > 18 ? e.title.slice(0, 17) + "…" : e.title, subject: e.subject, pct: percentOf(e.attempt!.score, e.attempt!.total_marks) }));
  if (!done.length) return <EmptyState icon={BarChart3} title="No results yet" text="Take an exam and your performance charts will appear here." />;
  const avg = Math.round(done.reduce((n, d) => n + d.pct, 0) / done.length);
  const best = Math.max(...done.map(d => d.pct));
  const trend = done.length > 1 ? Math.round(done[done.length - 1]!.pct - done[0]!.pct) : 0;
  const bySubject = Object.entries(done.reduce<Record<string, number[]>>((m, d) => { (m[d.subject] ??= []).push(d.pct); return m; }, {}))
    .map(([subject, v]) => ({ subject, pct: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }));
  return <div className="space-y-8">
    <div><h2 className="text-3xl font-bold">Performance</h2><p className="mt-1 text-muted-foreground">How you're doing across {done.length} exams.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Average score" value={`${avg}%`} icon={Percent} />
      <StatCard label="Best score" value={`${best}%`} icon={Trophy} />
      <StatCard label="Change since first exam" value={`${trend > 0 ? "+" : ""}${trend}%`} icon={TrendingUp} />
    </div>
    <section className="rounded-2xl border bg-card p-5"><h3 className="mb-4 font-bold">Score per exam</h3>
      <div className="h-64"><ResponsiveContainer><BarChart data={done}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} unit="%" /><Tooltip /><Bar dataKey="pct" name="Score %" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </section>
    <section className="rounded-2xl border bg-card p-5"><h3 className="mb-4 font-bold">By subject</h3>
      <ul className="space-y-3">{bySubject.map(s => <li key={s.subject}><div className="mb-1 flex justify-between text-sm"><span>{s.subject}</span><span className="font-semibold">{s.pct}%</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${s.pct}%` }} /></div></li>)}</ul>
    </section>
  </div>;
}
