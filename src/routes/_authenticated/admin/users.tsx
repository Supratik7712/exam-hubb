import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/app-shell";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: UsersPage });

type Filter = "all" | "student" | "teacher" | "pending";

function UsersPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const byUser = new Map<string, string[]>();
      roles?.forEach((r) => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]));
      return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "activate" | "deactivate" }) => {
      const { error } = action === "approve"
        ? await supabase.rpc("admin_approve_teacher", { _user_id: id })
        : await supabase.rpc("admin_set_account_status", { _user_id: id, _status: action === "activate" ? "active" : "inactive" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Account updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((u) => {
    if (filter === "pending" && !(u.requested_role === "teacher" && u.account_status === "pending")) return false;
    if (filter === "student" && u.requested_role !== "student") return false;
    if (filter === "teacher" && u.requested_role !== "teacher") return false;
    const s = q.toLowerCase();
    return !s || [u.full_name, u.email, u.username].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="student">Students</TabsTrigger>
            <TabsTrigger value="teacher">Teachers</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Search name, email or username" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="text-destructive">Couldn't load users: {(error as Error).message}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No users match" text="Try a different filter or search." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const pending = u.requested_role === "teacher" && u.account_status === "pending";
                const self = u.id === me?.userId;
                return (
                  <TableRow key={u.id}>
                    <TableCell><div className="font-medium">{u.full_name || "—"}</div><div className="text-xs text-muted-foreground">@{u.username ?? "—"}</div></TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>{(u.roles.length ? u.roles : [u.requested_role + " (requested)"]).map((r) => <Badge key={r} variant="secondary" className="mr-1 capitalize">{r}</Badge>)}</TableCell>
                    <TableCell><StatusBadge status={u.account_status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {pending && <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: u.id, action: "approve" })}>Approve teacher</Button>}
                      {!self && u.account_status === "active" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: u.id, action: "deactivate" })}>Deactivate</Button>}
                      {!self && u.account_status === "inactive" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: u.id, action: "activate" })}>Activate</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "active" ? "bg-success text-success-foreground" : status === "pending" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}
