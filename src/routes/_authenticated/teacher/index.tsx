import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, PlayCircle, CheckCircle2, FileQuestion, Plus, ArrowRight, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ExamBadge } from "@/components/workspace-controls";
import { workspaceQuery } from "@/lib/exams.functions";
import { examStatus } from "@/lib/exam-rules";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/teacher/")({ head: () => pageHead("Teacher dashboard", "Your exams, question bank and upcoming assessments on ExamHub."), loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery("teacher")), component: TeacherHome });

function TeacherHome() {
  const { data } = useSuspenseQuery(workspaceQuery("teacher"));
  const upcoming = data.exams.filter(e => ["scheduled", "active"].includes(examStatus(e))).sort((a, b) => Date.parse(a.start_at ?? "") - Date.parse(b.start_at ?? ""));
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><div>
        <h2 className="text-3xl font-extrabold">Teaching overview</h2>
        <p className="mt-2 text-muted-foreground">Your assessments at a glance.</p>
      </div><Button asChild><Link to="/teacher/exams"><Plus />Create exam</Link></Button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exams created" value={data.exams.length} icon={BookOpen} />
        <StatCard label="Active exams" value={data.exams.filter(e => examStatus(e) === "active").length} icon={PlayCircle} />
        <StatCard label="Completed" value={data.exams.filter(e => examStatus(e) === "completed").length} icon={CheckCircle2} />
        <StatCard label="Bank questions" value={data.questions.length} icon={FileQuestion} />
      </div>
      <div className="grid gap-8 xl:grid-cols-3"><section className="xl:col-span-2"><div className="flex items-center justify-between border-b pb-3"><h3 className="text-lg font-bold">Recent exams</h3><Button variant="ghost" asChild><Link to="/teacher/exams">View all<ArrowRight className="size-4" /></Link></Button></div>{data.exams.length ? <ul className="divide-y">{data.exams.slice(0, 6).map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-5"><div className="min-w-0"><Link to="/teacher/exams" className="break-words font-semibold">{e.title}</Link><p className="mt-1 text-sm text-muted-foreground">{e.subject} · {e.duration_minutes} minutes · {e.total_marks} marks</p></div><ExamBadge status={examStatus(e)} /></li>)}</ul> : <div className="py-12 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">No exams yet</p><Button className="mt-4" variant="outline" asChild><Link to="/teacher/exams">Create your first exam<ArrowRight /></Link></Button></div>}</section><section><h3 className="flex items-center gap-2 border-b pb-4 text-lg font-bold"><CalendarClock className="size-5" />Schedule</h3>{upcoming.length ? <ul className="divide-y">{upcoming.slice(0, 4).map(e => <li key={e.id} className="py-4"><p className="break-words font-medium">{e.title}</p><p className="mt-1 text-sm text-muted-foreground">{e.start_at ? new Date(e.start_at).toLocaleString() : "—"}</p></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No upcoming exams.</p>}<Button variant="outline" asChild><Link to="/teacher/questions"><FileQuestion />Question bank</Link></Button></section></div>
    </div>
  );
}
