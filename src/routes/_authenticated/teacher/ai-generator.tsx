import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AI_HANDOFF_KEY } from "@/components/exam-workspace";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Check, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Choice } from "@/components/workspace-controls";
import { generateQuestions, type GeneratedQuestion } from "@/lib/extras.functions";
import { saveQuestion } from "@/lib/exams.functions";
import { pageHead } from "@/lib/page-head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teacher/ai-generator")({
  head: () => pageHead("AI question generator", "Draft exam questions with AI, approve them, and publish them as an exam."),
  component: AiGen,
});

const TYPES = { "Mixed": "MIXED", "MCQ": "MCQ", "True / False": "TRUE_FALSE", "Short answer": "SHORT_ANSWER" } as const;
const LABEL = { MCQ: "MCQ", TRUE_FALSE: "True / False", SHORT_ANSWER: "Short answer" } as const;
function AiGen() {
  const gen = useServerFn(generateQuestions); const save = useServerFn(saveQuestion); const qc = useQueryClient();
  const [topic, setTopic] = useState(""); const [count, setCount] = useState(5);
  const [type, setType] = useState<keyof typeof TYPES>("Mixed"); const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [items, setItems] = useState<(GeneratedQuestion & { state: "new" | "saved" | "dropped"; savedId?: string | undefined })[]>([]);
  const navigate = useNavigate(); const approvedIds = items.flatMap(x => x.state === "saved" && x.savedId ? [x.savedId] : []);
  function makeExam() { sessionStorage.setItem(AI_HANDOFF_KEY, JSON.stringify({ topic: topic.trim(), ids: approvedIds })); void navigate({ to: "/teacher/exams" }); }
  const m = useMutation({ mutationFn: () => gen({ data: { topic, count, type: TYPES[type], difficulty } }),
    onSuccess: qs => { setItems(qs.map(q => ({ ...q, state: "new" as const }))); if (!qs.length) toast.error("No usable questions came back — try again"); },
    onError: e => toast.error(e instanceof Error ? e.message : "Couldn't generate") });
  async function approve(i: number) {
    const q = items[i]!; 
    try { const savedId = await save({ data: { topic, question_text: q.question_text, question_type: q.question_type, options: q.options, correct_answer: q.correct_answer, word_limit: q.word_limit, model_answer: "", marks: q.question_type === "SHORT_ANSWER" ? 2 : 1, difficulty: q.difficulty, explanation: q.explanation } });
      setItems(s => s.map((x, j) => j === i ? { ...x, state: "saved", savedId: typeof savedId === "string" ? savedId : undefined } : x)); await qc.invalidateQueries({ queryKey: ["workspace"] }); toast.success("Approved — ready to add to an exam");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
  }
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">AI question generator</h2><p className="mt-1 text-muted-foreground">AI drafts questions — nothing is added until you approve it.</p></div>
    <form className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end" onSubmit={e => { e.preventDefault(); if (topic.trim().length >= 2) m.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="topic">Topic</Label><Input id="topic" placeholder="e.g. Binary search trees" value={topic} onChange={e => setTopic(e.target.value)} /></div>
      <Choice label="Type" value={type} options={Object.keys(TYPES)} onChange={v => setType(v as keyof typeof TYPES)} />
      <Choice label="Difficulty" value={difficulty} options={["Easy", "Medium", "Hard"]} onChange={v => setDifficulty(v as typeof difficulty)} />
      <div className="space-y-2"><Label htmlFor="count">How many</Label><Input id="count" type="number" min={1} max={10} value={count} onChange={e => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} /></div>
      <Button type="submit" disabled={m.isPending || topic.trim().length < 2}><Sparkles />{m.isPending ? "Generating…" : "Generate"}</Button>
    </form>
    {approvedIds.length > 0 && <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-card p-4 shadow-sm"><p className="text-sm"><span className="font-semibold">{approvedIds.length} approved question{approvedIds.length > 1 ? "s" : ""}</span> — put them in a paper, set the timer and publish.</p><Button onClick={makeExam}><FileText />Create exam & publish</Button></div>}
    <div className="space-y-3">{items.map((q, i) => <article key={i} className={cn("rounded-lg border bg-card p-5", q.state === "dropped" && "opacity-50")}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Badge variant="secondary">{LABEL[q.question_type]}</Badge>{q.word_limit && <Badge variant="outline">{q.word_limit} words</Badge>}</div>
        {q.state === "new" ? <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setItems(s => s.map((x, j) => j === i ? { ...x, state: "dropped" } : x))}><X />Discard</Button><Button size="sm" onClick={() => void approve(i)}><Check />Approve</Button></div>
          : <span className="text-sm text-muted-foreground">{q.state === "saved" ? "Approved" : "Discarded"}</span>}</div>
      <p className="mt-3 whitespace-pre-wrap break-words font-medium">{q.question_text}</p>
      {q.options.length > 0 && <ul className="mt-2 space-y-1 text-sm">{q.options.map((o, j) => <li key={j} className={cn("rounded px-2 py-1", j === q.correct_answer && "bg-accent font-medium")}>{String.fromCharCode(65 + j)}. {o}{j === q.correct_answer && " ✓"}</li>)}</ul>}
      {q.explanation && <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>}
    </article>)}</div>
  </div>;
}
