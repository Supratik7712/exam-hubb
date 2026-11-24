import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Percent, Bell, CalendarClock } from "lucide-react";
import { StatCard, EmptyState } from "@/components/app-shell";
import { meQuery } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { studentExamsQuery } from "@/lib/attempts.functions";
import { percentOf } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/student/")({ staticData: { sitemap: false }, head: () => pageHead("Student dashboard", "Your upcoming exams, results and notifications on ExamHubb."), loader: ({ context }) => context.queryClient.ensureQueryData(studentExamsQuery), component: StudentHome });

function StudentHome() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: exams } = useSuspenseQuery(studentExamsQuery);
  const done = exams.filter(e => e.attempt && e.attempt.status !== "in_progress");
  const open = exams.filter(e => !e.attempt || e.attempt.status === "in_progress");
  const avg = done.length ? Math.round(done.reduce((n, e) => n + percentOf(e.attempt!.score, e.attempt!.total_marks), 0) / done.length) + "%" : "—";
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold">Hi {me?.profile?.full_name?.split(" ")[0] || "there"} 👋</h2>
        <p className="text-muted-foreground">Here's your exam overview.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming exams" value={open.length} icon={CalendarClock} />
        <StatCard label="Completed" value={done.length} icon={CheckCircle2} />
        <StatCard label="Average score" value={avg} icon={Percent} hint="After your first result" />
        <StatCard label="Awaiting marking" value={done.filter(e => e.attempt!.status === "submitted").length} icon={Bell} />
      </div>
      {open.length ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-6"><div><p className="font-semibold">{open.length} exam{open.length === 1 ? "" : "s"} waiting for you</p><p className="text-sm text-muted-foreground">Next: {open[0]!.title}</p></div><Button asChild><Link to="/student/exams">See available exams</Link></Button></div> : <EmptyState icon={BookOpen} title="No exams yet" text="When a teacher publishes an exam for you, it will appear here with its schedule and instructions." />}
    </div>
  );
}
