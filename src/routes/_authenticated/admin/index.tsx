import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, GraduationCap, ClipboardCheck, Hourglass, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";
import { workspaceQuery } from "@/lib/exams.functions";
import { examStatus } from "@/lib/exam-rules";

export const Route = createFileRoute("/_authenticated/admin/")({ head: () => pageHead("Admin dashboard", "ExamHub platform overview, teacher approvals, exams and administrative activity."), component: AdminHome });

async function count(filter: (q: any) => any) {
  const { count } = await filter(supabase.from("profiles").select("id", { count: "exact", head: true }));
  return count ?? 0;
}

function AdminHome() {
  const { data: workspace } = useQuery(workspaceQuery("admin"));
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [total, roles, pending, audit] = await Promise.all([
        count((q) => q),
        supabase.from("user_roles").select("role"),
        count((q) => q.eq("requested_role", "teacher").eq("account_status", "pending")),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      if (roles.error) throw roles.error;
      if (audit.error) throw audit.error;
      return { total, students: roles.data.filter(r => r.role === "student").length, teachers: roles.data.filter(r => r.role === "teacher").length, pending, audit: audit.data ?? [] };
    },
  });
  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-bold">Platform overview</h2><p className="mt-2 text-muted-foreground">Accounts, assessments and administrative activity.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={data?.total ?? "…"} icon={Users} />
        <StatCard label="Students" value={data?.students ?? "…"} icon={GraduationCap} />
        <StatCard label="Approved teachers" value={data?.teachers ?? "…"} icon={ClipboardCheck} />
        <StatCard label="Pending approvals" value={data?.pending ?? "…"} icon={Hourglass} />
      </div>
      {!!data?.pending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="font-medium">{data.pending} teacher account(s) waiting for approval.</p>
          <Button asChild><Link to="/admin/users">Review now</Link></Button>
        </div>
      )}
      <section className="flex flex-wrap items-center justify-between gap-4 border-y py-6"><div className="flex items-center gap-4"><BookOpen className="size-7 text-primary" /><div><h3 className="font-bold">Examination overview</h3><p className="mt-1 text-sm text-muted-foreground">{workspace?.exams.length ?? "…"} total · {workspace?.exams.filter(e => examStatus(e) === "active").length ?? "…"} active · {workspace?.exams.filter(e => examStatus(e) === "scheduled").length ?? "…"} scheduled</p></div></div><Button variant="outline" asChild><Link to="/admin/exams">Review exams</Link></Button></section>
      <section>
        <h3 className="font-bold">Recent admin activity</h3>
        {data?.audit.length ? (
          <ul className="mt-4 divide-y text-sm">
            {data.audit.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>{a.action.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>}
      </section>
    </div>
  );
}
