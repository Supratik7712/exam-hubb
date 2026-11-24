import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { awaitingTeacherApproval, homePathFor, meQuery, primaryRole } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/teacher-access")({
  head: () => pageHead("Teacher access", "Request teacher access to create and manage exams on ExamHubb."),
  component: TeacherAccess,
});

function TeacherAccess() {
  const { data: me, refetch, isFetching, isLoading } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const requested = !!me && awaitingTeacherApproval(me.profile, me.roles);
  const request = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("request_teacher_access"); if (error) throw error; },
    onSuccess: async () => { toast.success("Request sent to your administrators"); await qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function check() {
    const r = await refetch();
    if (r.data?.roles.includes("teacher")) navigate({ to: "/teacher" });
    else toast.info("Not approved yet — an administrator still needs to approve your request.");
  }
  const isTeacher = !!me?.roles.includes("teacher");
  useEffect(() => { if (isTeacher) void navigate({ to: "/teacher", replace: true }); }, [isTeacher, navigate]);
  const fallback = me && primaryRole(me) ? homePathFor(me) : null;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (isTeacher) return null;

  const Icon = requested ? Hourglass : ClipboardCheck;
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lift">
        <Logo className="justify-center" />
        <Icon className="mx-auto mt-6 size-10 text-highlight" />
        <h1 className="mt-4 text-2xl font-bold">{requested ? "Teacher request sent" : "This account isn't a teacher yet"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {requested
            ? `An administrator needs to approve ${me?.email ?? "this account"} before the teacher dashboard opens.`
            : `${me?.email ?? "This account"} only has student access. Ask your administrators for teacher access to create exams and manage questions.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {requested
            ? <Button onClick={check} disabled={isFetching}>{isFetching && <Loader2 className="animate-spin" />}Check again</Button>
            : <Button onClick={() => request.mutate()} disabled={request.isPending}>{request.isPending && <Loader2 className="animate-spin" />}Request teacher access</Button>}
          {fallback && fallback !== "/teacher-access" && <Button variant="outline" asChild><Link to={fallback}>Back to my dashboard</Link></Button>}
        </div>
      </div>
    </div>
  );
}
