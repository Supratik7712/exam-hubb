import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Clock, Calendar, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { studentExamsQuery, startAttempt, type StudentExam } from "@/lib/attempts.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/student/exams")({
  head: () => pageHead("Available exams", "Exams you can take now or soon on ExamHub."),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentExamsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: StudentExams,
});

export function windowState(e: StudentExam, now = Date.now()) {
  if (e.attempt?.status === "in_progress") return "continue";
  if (e.start_at && Date.parse(e.start_at) > now) return "upcoming";
  if (e.end_at && Date.parse(e.end_at) <= now) return "closed";
  return "open";
}

function StudentExams() {
  const { data } = useSuspenseQuery(studentExamsQuery);
  const navigate = useNavigate();
  const start = useServerFn(startAttempt);
  const [intro, setIntro] = useState<StudentExam | null>(null);
  const [name, setName] = useState(""); const [roll, setRoll] = useState("");
  const begin = useMutation({
    mutationFn: (examId: string) => start({ data: { id: examId, name, roll } }),
    onSuccess: (attemptId) => navigate({ to: "/student/attempt/$attemptId", params: { attemptId } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't start exam"),
  });
  const rows = data.filter(e => !(e.attempt && windowState(e) === "closed"));
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Available exams</h2><p className="mt-1 text-muted-foreground">Open an exam to read the instructions, then start when you're ready.</p></div>
    {rows.length ? <div className="grid gap-4 xl:grid-cols-2">{rows.map(e => {
      const st = windowState(e);
      return <article key={e.id} className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-muted-foreground">{e.subject}</span>
          <Badge variant={st === "open" || st === "continue" ? "default" : "secondary"} className="capitalize">{st === "continue" ? "In progress" : st}</Badge></div>
        <h3 className="mt-3 break-words text-xl font-bold">{e.title}</h3>
        <div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="flex items-center gap-1.5"><Clock className="size-4 text-muted-foreground" />{e.duration_minutes} min</span><span className="flex items-center gap-1.5"><ListChecks className="size-4 text-muted-foreground" />{e.question_count} questions</span><span>{e.total_marks} marks</span></div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><Calendar className="mt-0.5 size-4 shrink-0" />{e.start_at ? new Date(e.start_at).toLocaleString() : "Anytime"}{e.end_at ? ` – ${new Date(e.end_at).toLocaleString()}` : ""}</p>
        <div className="mt-5 flex justify-end border-t pt-4">
          {st === "continue" ? <Button onClick={() => navigate({ to: "/student/attempt/$attemptId", params: { attemptId: e.attempt!.id } })}>Continue exam</Button>
            : <Button disabled={st !== "open"} onClick={() => setIntro(e)}>{st === "upcoming" ? "Not open yet" : st === "closed" ? "Closed" : e.attempt ? "Take again" : "View instructions"}</Button>}
        </div>
      </article>;
    })}</div> : <EmptyState icon={BookOpen} title="No exams available" text="When a teacher publishes an exam, it will appear here. Finished exams are under Results." />}
    <Dialog open={!!intro} onOpenChange={o => { if (!o && !begin.isPending) setIntro(null); }}>
      <DialogContent><DialogTitle className="break-words">{intro?.title}</DialogTitle><DialogDescription>{intro?.subject} · {intro?.duration_minutes} minutes · {intro?.question_count} questions · {intro?.total_marks} marks</DialogDescription>
        {intro && <div className="space-y-4 text-sm">
          {intro.description && <p className="whitespace-pre-wrap break-words">{intro.description}</p>}
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>The timer starts as soon as you click Start and keeps running if you close the page.</li>
            <li>Your answers are saved automatically. You can come back and continue before time runs out.</li>
            <li>When time is up, the exam is submitted for you.</li>
            <li>Short answers have a word limit shown under the box.</li>
          </ul>
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="cand-name">Your full name *</Label><Input id="cand-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="As on your college ID" /></div>
            <div className="space-y-1"><Label htmlFor="cand-roll">Roll / ID number (optional)</Label><Input id="cand-roll" value={roll} maxLength={60} onChange={e => setRoll(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIntro(null)} disabled={begin.isPending}>Cancel</Button><Button onClick={() => begin.mutate(intro.id)} disabled={begin.isPending || name.trim().length < 2}>{begin.isPending ? "Starting…" : "Start exam"}</Button></div>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}
