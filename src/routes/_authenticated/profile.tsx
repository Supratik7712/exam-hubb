import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meQuery, primaryRole } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/profile")({ staticData: { sitemap: false },
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!primaryRole(me) || me?.profile?.account_status !== "active") throw redirect({ to: "/pending" });
  },
  head: () => pageHead("Profile", "Manage your ExamHubb name, username and contact details."),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, _ and . only"),
  contact_number: z.string().trim().max(20).regex(/^[0-9+\-\s]*$/, "Digits only"),
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const p = me!.profile;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: parsed.data.full_name,
      username: parsed.data.username.toLowerCase(),
      contact_number: parsed.data.contact_number || null,
    }).eq("id", me!.userId);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "That username is taken" : error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <AppShell me={me!} role={primaryRole(me)!} title="Profile">
      <form onSubmit={onSubmit} className="max-w-xl space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" defaultValue={p?.full_name ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="username">Username</Label><Input id="username" name="username" defaultValue={p?.username ?? ""} /></div>
        </div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={me!.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label htmlFor="contact_number">Contact number</Label><Input id="contact_number" name="contact_number" defaultValue={p?.contact_number ?? ""} /></div>
        <p className="text-sm text-muted-foreground">Role: <span className="font-semibold capitalize text-foreground">{me!.roles.join(", ")}</span></p>
        <Button disabled={busy}>Save changes</Button>
      </form>
    </AppShell>
  );
}
