import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, GraduationCap, ClipboardCheck, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminHome });

async function count(filter: (q: any) => any) {
  const { count } = await filter(supabase.from("profiles").select("id", { count: "exact", head: true }));
  return count ?? 0;
}

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [total, students, teachers, pending, audit] = await Promise.all([
        count((q) => q),
        count((q) => q.eq("requested_role", "student")),
        count((q) => q.eq("requested_role", "teacher").eq("account_status", "active")),
        count((q) => q.eq("requested_role", "teacher").eq("account_status", "pending")),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      return { total, students, teachers, pending, audit: audit.data ?? [] };
    },
  });
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={data?.total ?? "…"} icon={Users} />
        <StatCard label="Students" value={data?.students ?? "…"} icon={GraduationCap} />
        <StatCard label="Active teachers" value={data?.teachers ?? "…"} icon={ClipboardCheck} />
        <StatCard label="Pending approvals" value={data?.pending ?? "…"} icon={Hourglass} />
      </div>
      {!!data?.pending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="font-medium">{data.pending} teacher account(s) waiting for approval.</p>
          <Button asChild><Link to="/admin/users">Review now</Link></Button>
        </div>
      )}
      <section className="rounded-2xl border bg-card p-6">
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
