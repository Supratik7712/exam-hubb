import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Choice } from "@/components/workspace-controls";
import { feedbackQuery, sendFeedback } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/feedback")({
  head: () => pageHead("Feedback", "Share feedback about exams and ExamHubb."),
  loader: ({ context }) => context.queryClient.ensureQueryData(feedbackQuery(false)),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: FeedbackPage,
});

const CATS = ["General", "Exam", "Bug", "Suggestion"] as const;
function FeedbackPage() {
  const { data } = useSuspenseQuery(feedbackQuery(false));
  const qc = useQueryClient(); const send = useServerFn(sendFeedback);
  const [category, setCategory] = useState<(typeof CATS)[number]>("General");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const m = useMutation({ mutationFn: () => send({ data: { category, rating, message } }),
    onSuccess: async () => { toast.success("Thanks for your feedback"); setMessage(""); setRating(null); await qc.invalidateQueries({ queryKey: ["feedback"] }); },
    onError: e => toast.error(e instanceof Error ? e.message : "Couldn't send") });
  return <div className="grid gap-6 lg:grid-cols-2">
    <form className="space-y-4 rounded-2xl border bg-card p-5" onSubmit={e => { e.preventDefault(); if (message.trim()) m.mutate(); }}>
      <h2 className="text-2xl font-bold">Send feedback</h2>
      <Choice label="Category" value={category} options={[...CATS]} onChange={v => setCategory(v as (typeof CATS)[number])} />
      <div><p className="mb-1 text-sm font-medium">Rating (optional)</p><div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(rating === n ? null : n)}><Star className={cn("size-6", rating && n <= rating ? "fill-warning text-warning" : "text-muted-foreground")} /></button>)}</div></div>
      <Textarea aria-label="Message" rows={5} maxLength={3000} placeholder="Tell us what worked or what didn't" value={message} onChange={e => setMessage(e.target.value)} />
      <Button type="submit" disabled={m.isPending || !message.trim()}>{m.isPending ? "Sending…" : "Send feedback"}</Button>
    </form>
    <section className="space-y-3"><h3 className="font-bold">Your feedback</h3>
      {data.length ? data.map(f => <article key={f.id} className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex justify-between gap-2"><Badge variant="secondary">{f.category}</Badge><Badge variant={f.status === "resolved" ? "default" : "outline"} className="capitalize">{f.status}</Badge></div>
        <p className="mt-2 whitespace-pre-wrap break-words">{f.message}</p>
        {f.admin_note && <p className="mt-2 rounded-md bg-muted p-2 text-muted-foreground">Admin reply: {f.admin_note}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
      </article>) : <p className="text-sm text-muted-foreground">Nothing sent yet.</p>}
    </section>
  </div>;
}
