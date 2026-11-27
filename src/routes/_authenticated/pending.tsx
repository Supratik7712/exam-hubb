import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hourglass, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { meQuery, homePathFor } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";
import { requirePhoneVerified } from "@/lib/role-guard";

export const Route = createFileRoute("/_authenticated/pending")({ staticData: { sitemap: false },
  beforeLoad: ({ context }) => requirePhoneVerified(context.queryClient),
  head: () => pageHead("Account status", "Check your ExamHubb account approval and access status."),
  component: Pending,
});

function Pending() {
  const { data: me, refetch, isFetching } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inactive = me?.profile?.account_status === "inactive";
  async function check() {
    const r = await refetch();
    const dest = homePathFor(r.data ?? null);
    if (dest !== "/pending") navigate({ to: dest });
  }
  async function signOut() {
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const Icon = inactive ? Ban : Hourglass;
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lift">
        <Logo className="justify-center" />
        <Icon className="mx-auto mt-6 size-10 text-highlight" />
        <h1 className="mt-4 text-2xl font-bold">{inactive ? "Account deactivated" : "Awaiting approval"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {inactive
            ? "An administrator has deactivated this account. Contact your institution's admin to restore access."
            : "Your teacher account has been created. An administrator needs to approve it before you can create exams."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!inactive && <Button onClick={check} disabled={isFetching}>Check again</Button>}
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
