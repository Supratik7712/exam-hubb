import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Star } from "lucide-react";
import { EmptyState } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feedbackQuery, updateFeedback, type Feedback } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  head: () => pageHead("Feedback review", "Review and respond to user feedback on ExamHub."),
  loader: ({ context }) => context.queryClient.ensureQueryData(feedbackQuery(true)),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: AdminFeedback,
});

function AdminFeedback() {
  const { data } = useSuspenseQuery(feedbackQuery(true));
  const [tab, setTab] = useState("open");
  const rows = data.filter(f => tab === "all" || f.status === tab);
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Feedback</h2><p className="mt-1 text-muted-foreground">{data.filter(f => f.status === "open").length} open · {data.length} total</p></div>
    <Tabs value={tab} onValueChange={setTab}><TabsList>{["open", "reviewed", "resolved", "all"].map(s => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}</TabsList></Tabs>
    {rows.length ? <div className="space-y-3">{rows.map(f => <Item key={f.id} f={f} />)}</div> : <EmptyState icon={MessageSquare} title="Nothing here" text="Feedback from users appears here." />}
  </div>;
}
function Item({ f }: { f: Feedback }) {
  const qc = useQueryClient(); const update = useServerFn(updateFeedback); const [note, setNote] = useState(f.admin_note);
  const m = useMutation({ mutationFn: (status: "open" | "reviewed" | "resolved") => update({ data: { id: f.id, status, note } }),
    onSuccess: async () => { toast.success("Feedback updated"); await qc.invalidateQueries({ queryKey: ["feedback"] }); }, onError: e => toast.error(e instanceof Error ? e.message : "Couldn't update") });
  return <article className="rounded-lg border bg-card p-5 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="font-semibold">{f.author}</span><Badge variant="secondary">{f.category}</Badge>{f.rating && <span className="flex items-center gap-0.5 text-muted-foreground"><Star className="size-3.5 fill-warning text-warning" />{f.rating}</span>}</div>
      <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span></div>
    <p className="mt-2 whitespace-pre-wrap break-words">{f.message}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Input aria-label="Reply" className="max-w-md flex-1" placeholder="Reply to the user (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate("reviewed")}>Mark reviewed</Button><Button size="sm" disabled={m.isPending} onClick={() => m.mutate("resolved")}>Resolve</Button></div>
  </article>;
}
