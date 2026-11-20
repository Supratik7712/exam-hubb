import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { settingsQuery, saveSettings } from "@/lib/extras.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => pageHead("Platform settings", "Configure ExamHub pass mark, announcements and teacher requests."),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQuery);
  const qc = useQueryClient(); const save = useServerFn(saveSettings);
  const [f, setF] = useState({ platform_name: data.platform_name, pass_percent: data.pass_percent, announcement: data.announcement, allow_teacher_requests: data.allow_teacher_requests });
  const m = useMutation({ mutationFn: () => save({ data: f }), onSuccess: async () => { toast.success("Settings saved"); await qc.invalidateQueries({ queryKey: ["settings"] }); }, onError: e => toast.error(e instanceof Error ? e.message : "Couldn't save") });
  return <form className="max-w-2xl space-y-6 rounded-2xl border bg-card p-6" onSubmit={e => { e.preventDefault(); m.mutate(); }}>
    <h2 className="text-2xl font-bold">Settings</h2>
    <div className="space-y-2"><Label htmlFor="name">Platform name</Label><Input id="name" maxLength={80} value={f.platform_name} onChange={e => setF({ ...f, platform_name: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="pass">Pass mark (%)</Label><Input id="pass" type="number" min={1} max={100} className="w-32" value={f.pass_percent} onChange={e => setF({ ...f, pass_percent: Number(e.target.value) })} /><p className="text-xs text-muted-foreground">Used for pass/fail, certificates and reports.</p></div>
    <div className="space-y-2"><Label htmlFor="ann">Announcement for all dashboards</Label><Textarea id="ann" maxLength={500} rows={3} placeholder="Leave empty for none" value={f.announcement} onChange={e => setF({ ...f, announcement: e.target.value })} /></div>
    <div className="flex items-center justify-between gap-4"><div><Label htmlFor="req">Allow teacher access requests</Label><p className="text-xs text-muted-foreground">Students can ask to become teachers.</p></div><Switch id="req" checked={f.allow_teacher_requests} onCheckedChange={v => setF({ ...f, allow_teacher_requests: v })} /></div>
    <Button type="submit" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save settings"}</Button>
  </form>;
}
