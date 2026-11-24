import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app-shell";
import { getRecommendations } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/student/recommendations")({ staticData: { sitemap: false },
  head: () => pageHead("Study recommendations", "Personal AI study suggestions based on your ExamHubb results."),
  component: Recs,
});

function Recs() {
  const get = useServerFn(getRecommendations);
  const m = useMutation({ mutationFn: () => get(), onError: e => toast.error(e instanceof Error ? e.message : "Couldn't get suggestions") });
  const r = m.data;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-bold">Recommendations</h2><p className="mt-1 text-muted-foreground">Personal study tips from AI, based on your results.</p></div>
      <Button onClick={() => m.mutate()} disabled={m.isPending}><Sparkles />{m.isPending ? "Thinking…" : r ? "Refresh tips" : "Get my study tips"}</Button></div>
    {m.isSuccess && r === null && <EmptyState icon={Sparkles} title="No results yet" text="Finish at least one exam and come back for personal tips." />}
    {!m.isSuccess && !m.isPending && <EmptyState icon={Sparkles} title="Ready when you are" text="Click the button to get suggestions based on your exam scores." />}
    {r && <div className="space-y-4">
      <p className="rounded-2xl border bg-card p-5">{r.summary}</p>
      <div className="grid gap-4 md:grid-cols-3">{([["Strengths", r.strengths], ["Focus areas", r.focus_areas], ["Next steps", r.next_steps]] as const).map(([t, items]) =>
        <section key={t} className="rounded-2xl border bg-card p-5"><h3 className="font-bold">{t}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></section>)}</div>
    </div>}
  </div>;
}
