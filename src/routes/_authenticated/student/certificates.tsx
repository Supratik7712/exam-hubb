import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Award, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app-shell";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getCertificates, type Certificate } from "@/lib/extras.functions";
import { percentOf } from "@/lib/attempt-rules";
import { pageHead } from "@/lib/page-head";

const certsQuery = queryOptions({ queryKey: ["certificates"], staleTime: 30_000, queryFn: () => getCertificates() });
export const Route = createFileRoute("/_authenticated/student/certificates")({
  head: () => pageHead("My certificates", "Certificates for ExamHub exams you passed."),
  loader: ({ context }) => context.queryClient.ensureQueryData(certsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
  component: Certs,
});

function Certs() {
  const { data } = useSuspenseQuery(certsQuery);
  const [open, setOpen] = useState<Certificate | null>(null);
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold">Certificates</h2><p className="mt-1 text-muted-foreground">You earn a certificate for every marked exam you pass.</p></div>
    {data.length ? <div className="grid gap-4 md:grid-cols-2">{data.map(c => <article key={c.id} className="rounded-2xl border bg-card p-5">
      <Award className="size-7 text-primary" /><h3 className="mt-3 break-words text-lg font-bold">{c.exam_title}</h3>
      <p className="text-sm text-muted-foreground">{c.subject} · {percentOf(c.score, c.total_marks)}% · {new Date(c.issued_at).toLocaleDateString()}</p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">Code {c.code}</p>
      <Button className="mt-4" variant="outline" onClick={() => setOpen(c)}>View certificate</Button>
    </article>)}</div> : <EmptyState icon={Award} title="No certificates yet" text="Pass an exam and, once it's fully marked, your certificate appears here." />}
    <Dialog open={!!open} onOpenChange={o => { if (!o) setOpen(null); }}>
      <DialogContent className="max-w-2xl"><DialogTitle className="sr-only">Certificate</DialogTitle><DialogDescription className="sr-only">Certificate of achievement</DialogDescription>
        {open && <div id="certificate" className="rounded-xl border-4 border-double border-primary p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">ExamHub · Certificate of achievement</p>
          <p className="mt-6 text-sm text-muted-foreground">This certifies that</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{open.student_name}</p>
          <p className="mt-4 text-sm text-muted-foreground">passed</p>
          <p className="mt-1 break-words text-xl font-bold">{open.exam_title}</p>
          <p className="text-sm text-muted-foreground">{open.subject} · score {percentOf(open.score, open.total_marks)}%</p>
          <p className="mt-6 text-xs text-muted-foreground">Issued {new Date(open.issued_at).toLocaleDateString()} · Verification code <span className="font-mono">{open.code}</span></p>
          <p className="text-xs text-muted-foreground">Verify at {typeof window !== "undefined" ? window.location.origin : ""}/verify/{open.code}</p>
        </div>}
        <div className="flex justify-end gap-2 print:hidden">{open && <Button variant="outline" asChild><Link to="/verify/$code" params={{ code: open.code }}>Verification page</Link></Button>}<Button onClick={() => window.print()}><Printer />Print / save PDF</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
