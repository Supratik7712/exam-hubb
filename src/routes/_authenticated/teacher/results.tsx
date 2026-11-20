import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { workspaceQuery } from "@/lib/exams.functions";
import { listExamAttempts, getAttemptDetail, gradeShortAnswer, type StaffAttempt } from "@/lib/attempts.functions";
import { percentOf } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teacher/results")({
  head: () => pageHead("Exam results", "Review student attempts and mark short answers on ExamHub."),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery("teacher")),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: TeacherResults,
});

function TeacherResults() {
  const { data } = useSuspenseQuery(workspaceQuery("teacher"));
  const published = data.exams.filter(e => e.status !== "draft");
  const [examId, setExamId] = useState<string | undefined>(published[0]?.id);
  const [open, setOpen] = useState<StaffAttempt | null>(null);
  const list = useServerFn(listExamAttempts);
  const attempts = useQuery({ queryKey: ["exam-attempts", examId], enabled: !!examId, queryFn: () => list({ data: { id: examId! } }) });
  if (!published.length) return <EmptyState icon={ClipboardList} title="No published exams" text="Results appear here once you publish an exam and students attempt it." />;
  const rows = attempts.data ?? [];
  const finished = rows.filter(r => r.status !== "in_progress");
  const avg = finished.length ? Math.round(finished.reduce((n, r) => n + percentOf(r.score, r.total_marks), 0) / finished.length) : null;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-3xl font-bold">Results</h2><p className="mt-1 text-muted-foreground">{rows.length} attempts{avg != null ? ` · average ${avg}%` : ""} · {rows.filter(r => r.status === "submitted").length} need marking</p></div>
      <Select value={examId ?? ""} onValueChange={setExamId}><SelectTrigger className="w-72" aria-label="Exam"><SelectValue placeholder="Choose exam" /></SelectTrigger>
        <SelectContent>{published.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select>
    </div>
    {attempts.isLoading ? <p className="text-muted-foreground">Loading attempts…</p> : rows.length ? <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Student</th><th className="p-3">Submitted</th><th className="p-3">Score</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className="border-b last:border-0">
        <td className="p-3"><p className="font-medium">{r.student_name}</p><p className="text-xs text-muted-foreground">{r.student_email}</p></td>
        <td className="p-3">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
        <td className="p-3 font-semibold">{r.status === "in_progress" ? "—" : `${r.score} / ${r.total_marks} (${percentOf(r.score, r.total_marks)}%)`}</td>
        <td className="p-3"><Badge variant={r.status === "submitted" ? "destructive" : r.status === "graded" ? "default" : "secondary"}>{r.status === "submitted" ? "Needs marking" : r.status === "graded" ? "Marked" : "In progress"}</Badge></td>
        <td className="p-3 text-right"><Button size="sm" variant="outline" disabled={r.status === "in_progress"} onClick={() => setOpen(r)}>{r.status === "submitted" ? "Mark" : "View"}</Button></td>
      </tr>)}</tbody></table></div> : <EmptyState icon={ClipboardList} title="No attempts yet" text="Student attempts for this exam will appear here." />}
    <AttemptDialog attempt={open} onClose={() => setOpen(null)} examId={examId} />
  </div>;
}

function AttemptDialog({ attempt, onClose, examId }: { attempt: StaffAttempt | null; onClose: () => void; examId: string | undefined }) {
  const qc = useQueryClient();
  const get = useServerFn(getAttemptDetail);
  const grade = useServerFn(gradeShortAnswer);
  const detail = useQuery({ queryKey: ["attempt-detail", attempt?.id], enabled: !!attempt, queryFn: () => get({ data: { id: attempt!.id } }) });
  const [marks, setMarks] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: (v: { answer_id: string; marks: number }) => grade({ data: v }),
    onSuccess: async () => { toast.success("Marks saved"); await Promise.all([qc.invalidateQueries({ queryKey: ["attempt-detail", attempt?.id] }), qc.invalidateQueries({ queryKey: ["exam-attempts", examId] })]); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save marks"),
  });
  const d = detail.data;
  return <Dialog open={!!attempt} onOpenChange={o => { if (!o) onClose(); }}>
    <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogTitle>{attempt?.student_name}</DialogTitle>
      <DialogDescription>{d ? `Score ${d.score} / ${d.total_marks}` : "Loading…"}</DialogDescription>
      {d && <div className="space-y-3">{d.questions.map((q, i) => <article key={q.id} className="rounded-lg border p-4">
        <div className="flex justify-between gap-2 text-sm text-muted-foreground"><span>Question {i + 1}</span><span>{q.marks_awarded ?? "—"} / {q.marks}</span></div>
        <p className="mt-1 whitespace-pre-wrap break-words font-medium">{q.question_text}</p>
        {q.question_type === "SHORT_ANSWER" ? <div className="mt-3 space-y-3">
          <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">{q.answer_text || "No answer"}</p>
          {q.answer_id && q.answer_text.trim() && <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); const v = Number(marks[q.id] ?? q.marks_awarded ?? ""); if (Number.isNaN(v)) return; m.mutate({ answer_id: q.answer_id!, marks: v }); }}>
            <Input aria-label={`Marks for question ${i + 1}`} type="number" step="0.5" min={0} max={q.marks} className="w-24" value={marks[q.id] ?? (q.marks_awarded != null ? String(q.marks_awarded) : "")} onChange={e => setMarks(s => ({ ...s, [q.id]: e.target.value }))} />
            <span className="text-sm text-muted-foreground">/ {q.marks}</span><Button size="sm" type="submit" disabled={m.isPending}>Save marks</Button>
            {q.marks_awarded != null && <CheckCircle2 className="size-4 text-primary" />}
          </form>}
        </div> : <ul className="mt-2 space-y-1 text-sm">{q.options.map((o, j) => <li key={j} className={cn("rounded px-2 py-1", j === q.correct_answer && "bg-accent font-medium")}>{String.fromCharCode(65 + j)}. {o}{j === q.selected_option && <span className="ml-2 text-xs text-muted-foreground">(student's answer)</span>}</li>)}</ul>}
      </article>)}</div>}
    </DialogContent>
  </Dialog>;
}
