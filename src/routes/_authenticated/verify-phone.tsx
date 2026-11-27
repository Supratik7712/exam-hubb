import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchMe, homePathFor, meQuery } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";
import { sendPhoneCode, verifyPhoneCode } from "@/lib/phone-verification.functions";
import { PHONE_RESEND_SECONDS, phoneSchema } from "@/lib/phone-verification-rules";

export const Route = createFileRoute("/_authenticated/verify-phone")({
  staticData: { sitemap: false },
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/auth" });
    if (me.profile?.phone_verified) throw redirect({ to: homePathFor(me) });
  },
  head: () => pageHead("Verify your phone", "Verify your mobile number once to activate your new ExamHubb account."),
  component: VerifyPhonePage,
});

function VerifyPhonePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useServerFn(sendPhoneCode);
  const verify = useServerFn(verifyPhoneCode);
  const [phone, setPhone] = useState(me?.profile?.contact_number ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Enter a valid phone number"); return; }
    setBusy(true);
    try {
      const result = await send({ data: { phone: parsed.data } });
      setPhone(result.phone);
      setSentTo(result.phone);
      setResendAt(new Date(result.resendAt).getTime());
      toast.success(`Code sent to ${result.phone}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setBusy(true);
    try {
      await verify({ data: { code } });
      const fresh = await fetchMe();
      qc.setQueryData(["me"], fresh);
      toast.success("Phone verified — your account is ready");
      await navigate({ to: homePathFor(fresh), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify the code");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-hero p-5 sm:p-8">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lift sm:p-8">
        <Logo />
        <div className="mt-8 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {sentTo ? <ShieldCheck className="size-6" /> : <MessageSquareText className="size-6" />}
        </div>
        <h1 className="mt-5 text-2xl font-bold">Verify your mobile number</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This is a one-time check for your new account. You won’t need a code when you sign in again.
        </p>

        {!sentTo ? (
          <form onSubmit={onSend} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number with country code</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
              <p className="text-xs text-muted-foreground">Textbee will send a 6-digit code from the connected Android phone.</p>
            </div>
            <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Send verification code</Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="mt-6 space-y-4">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">Code sent to <strong>{sentTo}</strong></div>
            <div className="space-y-1.5">
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus className="text-center text-xl tracking-[0.5em]" placeholder="••••••" />
              <p className="text-xs text-muted-foreground">The code expires in 10 minutes. Five incorrect attempts invalidate it.</p>
            </div>
            <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Verify and open my dashboard</Button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setSentTo(null); setResendAt(null); }}>Change number</Button>
              <Button type="button" variant="link" size="sm" disabled={busy || secondsLeft > 0} onClick={() => onSend()}>
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
              </Button>
            </div>
          </form>
        )}
        <div className="mt-6 border-t pt-4 text-center">
          <Button variant="link" size="sm" onClick={signOut}>Use a different account</Button>
        </div>
        <p className="sr-only">Resend wait time: {PHONE_RESEND_SECONDS} seconds</p>
      </section>
    </main>
  );
}
