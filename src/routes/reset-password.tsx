import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password – ExamHub" },
      { name: "description", content: "Choose a new password for your ExamHub account." },
      { property: "og:title", content: "Set a new password – ExamHub" },
      { property: "og:description", content: "Reset your ExamHub password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== fd.get("confirm")) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-lift">
        <Logo />
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <div className="space-y-1.5"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" required /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" required /></div>
        <Button className="w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
