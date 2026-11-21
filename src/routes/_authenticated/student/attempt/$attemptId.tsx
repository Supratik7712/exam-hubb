import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnswerBox } from "@/components/answer-box";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { attemptQuery, saveAnswer, submitAttempt, type Attempt, type AttemptQuestion } from "@/lib/attempts.functions";
import { secondsLeft, formatClock, percentOf, passed } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/extras.functions";
import { cn } from "@/lib/utils";
import { leaveExam } from "@/lib/leave-exam";

export const Route = createFileRoute("/_authenticated/student/attempt/$attemptId")({
  head: () => pageHead("Exam", "Take your ExamHub exam."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(attemptQuery(params.attemptId)),
  errorComponent: ({ error }) => <div role="alert" className="space-y-3"><p className="text-destructive">{error instanceof Error ? error.message : String(error)}</p><Link to="/student/exams" className="text-primary underline">Back to exams</Link></div>,
  component: AttemptPage,
});

function AttemptPage() {
  const { attemptId } = Route.useParams();
  const { data } = useSuspenseQuery(attemptQuery(attemptId));
  return data.status === "in_progress" ? <ExamScreen attempt={data} /> : <ResultScreen attempt={data} />;
}

type Ans = Pick<AttemptQuestion, "selected_option" | "answer_text" | "marked_for_review">;
const answered = (a: Ans | undefined) => !!a && (a.selected_option != null || a.answer_text.trim() !== "");

function ExamScreen({ attempt }: { attempt: Attempt }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useServerFn(saveAnswer);
  const submit = useServerFn(submitAttempt);
  const [loadedAt] = useState(() => Date.now());
  const [left, setLeft] = useState(() => secondsLeft(attempt.deadline, attempt.now, loadedAt));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Ans>>(() => Object.fromEntries(attempt.questions.map(q => [q.id, { selected_option: q.selected_option, answer_text: q.answer_text, marked_for_review: q.marked_for_review }])));
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, Ans>>({});
  const submitted = useRef(false);
  const q = attempt.questions[idx];

  async function flush(qid: string) {
    const a = pending.current[qid]; if (!a) return;
    delete pending.current[qid]; clearTimeout(timers.current[qid]);
    setSaving("saving");
    try { await save({ data: { attempt_id: attempt.id, question_id: qid, ...a } }); setSaving("saved"); }
    catch (e) { setSaving("error"); toast.error(e instanceof Error ? e.message : "Couldn't save answer"); }
  }
  function update(qid: string, patch: Partial<Ans>, delay: number) {
    setAnswers(prev => {
      const next = { ...prev[qid]!, ...patch };
      pending.current[qid] = next;
      clearTimeout(timers.current[qid]);
      timers.current[qid] = setTimeout(() => void flush(qid), delay);
      return { ...prev, [qid]: next };
    });
  }
  async function finish(auto: boolean) {
    if (submitted.current) return; submitted.current = true; setSubmitting(true);
    try {
      await Promise.all(Object.keys(pending.current).map(flush));
      await submit({ data: { id: attempt.id } });
      toast.success(auto ? "Time's up — your exam was submitted" : "Exam submitted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't submit"); submitted.current = false; }
    finally {
      setSubmitting(false); setConfirm(false);
      await Promise.all([qc.invalidateQueries({ queryKey: ["attempt", attempt.id] }), qc.invalidateQueries({ queryKey: ["student-exams"] })]);
    }
  }
  async function leave() {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await leaveExam(
        async () => { await Promise.all(Object.keys(pending.current).map(flush)); },
        async () => { await submit({ data: { id: attempt.id } }); },
        async () => {
          await qc.invalidateQueries({ queryKey: ["student-exams"] });
          qc.removeQueries({ queryKey: ["attempt", attempt.id] });
          toast.success("Exam ended — this attempt cannot be resumed");
          await navigate({ to: "/student/exams" });
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't end the exam — please try again");
      submitted.current = false;
      setSubmitting(false);
    }
  }
  useEffect(() => {
    const t = setInterval(() => {
      const s = secondsLeft(attempt.deadline, attempt.now, loadedAt); setLeft(s);
      if (s <= 0) void finish(true);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (Object.keys(pending.current).length) e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);
  if (!q) return <p>This exam has no questions.</p>;
  const a = answers[q.id]!;
  const done = attempt.questions.filter(x => answered(answers[x.id])).length;
  return <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">{attempt.exam.subject}</p><h2 className="break-words text-2xl font-bold">{attempt.exam.title}</h2></div>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-lg font-bold", left <= 60 ? "border-destructive text-destructive" : "bg-card")} aria-live="polite"><Clock className="size-5" />{formatClock(left)}</div>
          <Button variant="outline" onClick={() => setLeaving(true)} disabled={submitting}><LogOut className="size-4" />Leave exam</Button>
        </div>
      </div>
      <article className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>Question {idx + 1} of {attempt.questions.length}</span><span>{q.marks} {q.marks === 1 ? "mark" : "marks"}</span></div>
        <p className="mt-3 whitespace-pre-wrap break-words text-lg font-medium">{q.question_text}</p>
        <div className="mt-5">
          {q.question_type === "SHORT_ANSWER"
            ? <AnswerBox wordLimit={q.word_limit ?? 100} value={a.answer_text} onChange={v => update(q.id, { answer_text: v }, 1200)} />
            : <div role="radiogroup" aria-label="Options" className="space-y-2">{q.options.map((opt, i) => <button key={i} type="button" role="radio" aria-checked={a.selected_option === i}
                onClick={() => update(q.id, { selected_option: i }, 0)}
                className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-muted", a.selected_option === i && "border-primary bg-accent")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold", a.selected_option === i && "border-primary bg-primary text-primary-foreground")}>{String.fromCharCode(65 + i)}</span><span className="break-words">{opt}</span></button>)}</div>}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => update(q.id, { marked_for_review: !a.marked_for_review }, 0)}><Flag className={cn("size-4", a.marked_for_review && "fill-current text-warning")} />{a.marked_for_review ? "Unmark review" : "Mark for review"}</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft />Previous</Button>
            {idx < attempt.questions.length - 1 ? <Button onClick={() => setIdx(idx + 1)}>Next<ChevronRight /></Button> : <Button onClick={() => setConfirm(true)}>Finish</Button>}
          </div>
        </div>
      </article>
    </section>
    <aside className="space-y-4 rounded-lg border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
      <div className="flex items-center justify-between text-sm"><span className="font-semibold">Questions</span><span className="text-muted-foreground">{saving === "saving" ? "Saving…" : saving === "saved" ? "All changes saved" : saving === "error" ? "Not saved" : ""}</span></div>
      <div className="grid grid-cols-5 gap-2">{attempt.questions.map((x, i) => { const s = answers[x.id]; return <button key={x.id} type="button" aria-label={`Question ${i + 1}`} onClick={() => setIdx(i)}
        className={cn("relative grid h-9 place-items-center rounded-md border text-sm font-semibold", answered(s) ? "border-primary bg-primary text-primary-foreground" : "bg-background", i === idx && "ring-2 ring-ring ring-offset-2")}>{i + 1}{s?.marked_for_review && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-warning" />}</button>; })}</div>
      <ul className="space-y-1 text-xs text-muted-foreground"><li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-primary" />Answered ({done})</li><li className="flex items-center gap-2"><span className="size-3 rounded-sm border" />Not answered ({attempt.questions.length - done})</li><li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" />Marked for review</li></ul>
      <Button className="w-full" onClick={() => setConfirm(true)} disabled={submitting}>Submit exam</Button>
    </aside>
    <Dialog open={confirm} onOpenChange={o => { if (!submitting) setConfirm(o); }}>
      <DialogContent><DialogTitle>Submit your exam?</DialogTitle><DialogDescription>You answered {done} of {attempt.questions.length} questions. You can't change answers after submitting.</DialogDescription>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirm(false)} disabled={submitting}>Keep working</Button><Button onClick={() => void finish(false)} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={leaving} onOpenChange={o => { if (!submitting) setLeaving(o); }}>
      <DialogContent><DialogTitle>Quit this exam?</DialogTitle><DialogDescription>This ends your current attempt and submits your answers so far. The timer stops and you cannot resume this attempt. You can start a new attempt later.</DialogDescription>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setLeaving(false)} disabled={submitting}>Stay in exam</Button><Button variant="destructive" onClick={() => void leave()} disabled={submitting}>{submitting ? "Ending exam…" : "Quit exam"}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}

function ResultScreen({ attempt }: { attempt: Attempt }) {
  const passMark = useQuery(settingsQuery).data?.pass_percent ?? 40;
  const graded = attempt.status === "graded"; const score = attempt.score ?? 0;
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <p className="text-sm text-muted-foreground">{attempt.exam.subject}</p>
      <h2 className="mt-1 break-words text-2xl font-bold">{attempt.exam.title}</h2>
      <p className="mt-6 font-display text-5xl font-extrabold">{score}<span className="text-2xl text-muted-foreground"> / {attempt.total_marks}</span></p>
      <p className="mt-2 text-muted-foreground">{percentOf(score, attempt.total_marks)}%</p>
      <div className="mt-4">{graded ? <Badge variant={passed(score, attempt.total_marks, passMark) ? "default" : "destructive"}>{passed(score, attempt.total_marks, passMark) ? "Pass" : "Fail"}</Badge> : <Badge variant="secondary">Short answers awaiting teacher marking</Badge>}</div>
      <div className="mt-6 flex justify-center gap-2"><Button asChild variant="outline"><Link to="/student/results">All results</Link></Button><Button asChild><Link to="/student/exams">Available exams</Link></Button></div>
    </div>
    {attempt.review ? <div className="space-y-3"><h3 className="text-lg font-bold">Answer review</h3>{attempt.questions.map((q, i) => <article key={q.id} className="rounded-lg border bg-card p-5">
      <div className="flex justify-between gap-2 text-sm text-muted-foreground"><span>Question {i + 1}</span><span>{q.marks_awarded ?? "—"} / {q.marks}</span></div>
      <p className="mt-2 whitespace-pre-wrap break-words font-medium">{q.question_text}</p>
      {q.question_type === "SHORT_ANSWER" ? <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">{q.answer_text || "No answer"}</p>
        : <ul className="mt-3 space-y-1 text-sm">{q.options.map((o, j) => <li key={j} className={cn("flex items-center gap-2 rounded-md px-2 py-1", j === q.correct_answer && "bg-accent font-medium")}>
          {j === q.correct_answer ? <CheckCircle2 className="size-4 text-primary" /> : j === q.selected_option ? <XCircle className="size-4 text-destructive" /> : <span className="size-4" />}{o}{j === q.selected_option && <span className="text-xs text-muted-foreground">(your answer)</span>}</li>)}</ul>}
      {q.explanation && <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>}
    </article>)}</div> : <p className="text-center text-sm text-muted-foreground">Your teacher hasn't released the answer review for this exam.</p>}
  </div>;
}
