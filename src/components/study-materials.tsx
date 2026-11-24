import { useRef, useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/app-shell";

export const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
export const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "study-materials";

export const materialsQuery = queryOptions({
  queryKey: ["study-materials"], staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message); return data;
  },
});
const size = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

async function download(path: string, name: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120, { download: name });
  if (error || !data) { toast.error("Couldn't open the file"); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}

export function StudyMaterials({ teacherId }: { teacherId?: string }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(materialsQuery);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState(""); const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault(); if (!teacherId || !file) return;
    if (file.size > MAX_BYTES) { toast.error("Files can be up to 20 MB"); return; }
    setBusy(true);
    const path = `${teacherId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (up.error) { setBusy(false); { toast.error(up.error.message.includes("mime") ? "Only PDF, Word, PowerPoint or text files" : up.error.message); return; } }
    const { error } = await supabase.from("study_materials").insert({ teacher_id: teacherId, title: title.trim() || file.name, subject: subject.trim(), description: description.trim(), file_path: path, file_name: file.name, file_size: file.size });
    setBusy(false);
    if (error) { await supabase.storage.from(BUCKET).remove([path]); { toast.error(error.message); return; } }
    toast.success("Material uploaded — students can see it now");
    setTitle(""); setSubject(""); setDescription(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
    void qc.invalidateQueries({ queryKey: ["study-materials"] });
  }
  async function remove(id: string, path: string) {
    if (!confirm("Delete this material for everyone?")) return;
    const { error } = await supabase.from("study_materials").delete().eq("id", id); if (error) { toast.error(error.message); return; }
    await supabase.storage.from(BUCKET).remove([path]); toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["study-materials"] });
  }

  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Study materials</h2><p className="mt-1 text-muted-foreground">{teacherId ? "Upload notes, suggestions and study files for your students." : "Notes and study files shared by your teachers."}</p></div>
    {teacherId && <form onSubmit={upload} className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="m-title">Title</Label><Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Linked lists — chapter notes" /></div>
      <div className="space-y-1.5"><Label htmlFor="m-subject">Subject (optional)</Label><Input id="m-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={80} placeholder="e.g. DSA" /></div>
      <div className="space-y-1.5 md:col-span-2"><Label htmlFor="m-desc">Short note (optional)</Label><Textarea id="m-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={2} /></div>
      <div className="space-y-1.5"><Label htmlFor="m-file">File (PDF, Word, PowerPoint or text · max 20 MB)</Label><Input id="m-file" ref={fileRef} type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
      <div className="flex items-end"><Button type="submit" disabled={!file || busy}><Upload />{busy ? "Uploading…" : "Upload material"}</Button></div>
    </form>}
    {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map(m => <article key={m.id} className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><FileText className="size-5" /></span>
        <div className="min-w-0"><h3 className="break-words font-bold">{m.title}</h3><p className="text-xs text-muted-foreground">{[m.subject, size(m.file_size), new Date(m.created_at).toLocaleDateString()].filter(Boolean).join(" · ")}</p></div></div>
      {m.description && <p className="mt-3 break-words text-sm text-muted-foreground">{m.description}</p>}
      <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{m.file_name}</p>
      <div className="mt-auto flex gap-2 pt-4"><Button size="sm" variant="outline" onClick={() => void download(m.file_path, m.file_name)}><Download />Download</Button>
        {teacherId === m.teacher_id && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(m.id, m.file_path)}><Trash2 />Delete</Button>}</div>
    </article>)}</div> : <EmptyState icon={FileText} title="No study materials yet" text={teacherId ? "Upload your first notes file above." : "Your teachers haven't shared any notes yet."} />}
  </div>;
}
