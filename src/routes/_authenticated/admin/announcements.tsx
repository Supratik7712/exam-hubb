import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app-shell";
import { allAnnouncementsQuery, saveAnnouncement, deleteAnnouncement, type Announcement } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => pageHead("Announcements", "Create, edit, schedule and delete the announcements shown under the bell icon."),
  loader: ({ context }) => context.queryClient.ensureQueryData(allAnnouncementsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: AnnouncementsPage,
});

type Draft = { id: string | null; title: string; body: string; audience: Announcement["audience"]; starts_at: string; expires_at: string };
const AUDIENCE = { all: "Everyone", student: "Students", teacher: "Teachers", admin: "Admins" } as const;
const local = (v: string | null) => { if (!v) return ""; const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const iso = (v: string) => v ? new Date(v).toISOString() : null;
const DURATIONS = [["1 hour", 1], ["1 day", 24], ["3 days", 72], ["1 week", 168]] as const;
function statusOf(a: Announcement, now = Date.now()) {
  if (Date.parse(a.starts_at) > now) return "Scheduled";
  if (a.expires_at && Date.parse(a.expires_at) <= now) return "Expired";
  return "Live";
}

function AnnouncementsPage() {
  const { data } = useSuspenseQuery(allAnnouncementsQuery);
  const qc = useQueryClient(); const save = useServerFn(saveAnnouncement); const del = useServerFn(deleteAnnouncement);
  const [edit, setEdit] = useState<Draft | null>(null); const [remove, setRemove] = useState<Announcement | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });
  const saveM = useMutation({ mutationFn: (d: Draft) => save({ data: { id: d.id, title: d.title, body: d.body, audience: d.audience, starts_at: iso(d.starts_at), expires_at: iso(d.expires_at) } }),
    onSuccess: async () => { toast.success("Announcement saved"); setEdit(null); await refresh(); }, onError: e => toast.error(e instanceof Error ? e.message : "Couldn't save") });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: async () => { toast.success("Announcement deleted"); setRemove(null); await refresh(); }, onError: e => toast.error(e instanceof Error ? e.message : "Couldn't delete") });

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-3xl font-bold">Announcements</h2><p className="mt-1 text-muted-foreground">Shown under the bell icon. {data.filter(a => statusOf(a) === "Live").length} live now.</p></div>
      <Button onClick={() => setEdit({ id: null, title: "", body: "", audience: "all", starts_at: "", expires_at: "" })}><Plus />New announcement</Button>
    </div>
    {data.length ? <div className="space-y-3">{data.map(a => { const st = statusOf(a); return <article key={a.id} className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant={st === "Live" ? "default" : "secondary"}>{st}</Badge><Badge variant="outline">{AUDIENCE[a.audience]}</Badge></div>
          <h3 className="mt-2 break-words font-semibold">{a.title}</h3>{a.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{a.body}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />From {new Date(a.starts_at).toLocaleString()} · {a.expires_at ? `until ${new Date(a.expires_at).toLocaleString()}` : "no end time"}</p></div>
        <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${a.title}`} onClick={() => setEdit({ id: a.id, title: a.title, body: a.body, audience: a.audience, starts_at: local(a.starts_at), expires_at: local(a.expires_at) })}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${a.title}`} onClick={() => setRemove(a)}><Trash2 className="size-4" /></Button></div>
      </div></article>; })}</div>
      : <EmptyState icon={Megaphone} title="No announcements" text="Create one to show it in everyone's bell." />}

    <Dialog open={!!edit} onOpenChange={o => { if (!o && !saveM.isPending) setEdit(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogTitle>{edit?.id ? "Edit announcement" : "New announcement"}</DialogTitle><DialogDescription>It appears under the bell icon for the people you choose.</DialogDescription>
      {edit && <form className="space-y-4" onSubmit={e => { e.preventDefault(); saveM.mutate(edit); }}>
        <div className="space-y-2"><Label htmlFor="a-title">Title</Label><Input id="a-title" required maxLength={120} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="a-body">Message <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="a-body" rows={3} maxLength={1000} value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} /></div>
        <div className="space-y-2"><Label>Show to</Label><Select value={edit.audience} onValueChange={v => setEdit({ ...edit, audience: v as Draft["audience"] })}><SelectTrigger aria-label="Show to"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(AUDIENCE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="a-start">Start <span className="font-normal text-muted-foreground">(empty = now)</span></Label><Input id="a-start" type="datetime-local" value={edit.starts_at} onChange={e => setEdit({ ...edit, starts_at: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="a-end">End <span className="font-normal text-muted-foreground">(empty = never)</span></Label><Input id="a-end" type="datetime-local" value={edit.expires_at} onChange={e => setEdit({ ...edit, expires_at: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-1"><span className="mr-1 text-xs text-muted-foreground">Show for:</span>{DURATIONS.map(([l, h]) => <Button key={l} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { const from = edit.starts_at ? new Date(edit.starts_at) : new Date(); setEdit({ ...edit, expires_at: local(new Date(from.getTime() + h * 3600_000).toISOString()) }); }}>{l}</Button>)}</div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" disabled={saveM.isPending}>{saveM.isPending ? "Saving…" : "Save"}</Button></div>
      </form>}
    </DialogContent></Dialog>

    <Dialog open={!!remove} onOpenChange={o => { if (!o && !delM.isPending) setRemove(null); }}><DialogContent>
      <DialogTitle>Delete announcement?</DialogTitle><DialogDescription>"{remove?.title}" will disappear from everyone's bell.</DialogDescription>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemove(null)}>Cancel</Button><Button variant="destructive" disabled={delM.isPending} onClick={() => remove && delM.mutate(remove.id)}>Delete</Button></div>
    </DialogContent></Dialog>
  </div>;
}
