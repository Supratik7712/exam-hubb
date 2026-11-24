import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, XCircle } from "lucide-react";
import { verifyCertificate } from "@/lib/extras.functions";

export const Route = createFileRoute("/verify/$code")({
  loader: ({ params }) => verifyCertificate({ data: { code: params.code } }),
  head: () => ({ meta: [{ title: "Verify certificate – ExamHubb" }, { name: "description", content: "Check that an ExamHubb certificate is genuine." }, { property: "og:title", content: "Verify certificate – ExamHubb" }, { property: "og:description", content: "Check that an ExamHubb certificate is genuine." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  errorComponent: () => <p className="p-10 text-center">Couldn't check this certificate right now.</p>,
  component: Verify,
});

function Verify() {
  const c = Route.useLoaderData(); const { code } = Route.useParams();
  return <main className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-soft">
    {c ? <><Award className="mx-auto size-10 text-primary" /><h1 className="mt-3 text-2xl font-bold">Valid certificate</h1>
      <p className="mt-4"><span className="font-semibold">{c.student_name}</span> passed <span className="font-semibold">{c.exam_title}</span> ({c.subject}) with {c.percent}%.</p>
      <p className="mt-2 text-sm text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()} · Code {code.toUpperCase()}</p></>
      : <><XCircle className="mx-auto size-10 text-destructive" /><h1 className="mt-3 text-2xl font-bold">Certificate not found</h1><p className="mt-2 text-sm text-muted-foreground">No valid certificate matches code {code}.</p></>}
    <Link to="/" className="mt-6 inline-block text-sm text-primary underline">Go to ExamHubb</Link>
  </div></main>;
}
