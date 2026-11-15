import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, ClipboardCheck, ShieldCheck, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ProviderButtons } from "@/components/provider-buttons";
import { fetchMe, homePathFor, primaryRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { takeSignInRole } from "@/lib/signin-intent";

const searchSchema = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in – ExamHub" },
      { name: "description", content: "Sign in or create your ExamHub student or teacher account." },
      { property: "og:title", content: "Sign in – ExamHub" },
      { property: "og:description", content: "Access your ExamHub dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type LoginRole = "student" | "teacher" | "admin";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  username: z.string().trim().min(3, "At least 3 characters").max(30).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, _ and . only"),
  email: z.string().trim().email("Enter a valid email").max(255),
  contact_number: z.string().trim().max(20).regex(/^[0-9+\-\s]*$/, "Digits only").optional(),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loginRole, setLoginRole] = useState<LoginRole>("student");
  const [signupRole, setSignupRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  const goHome = async (preferredRole?: LoginRole) => {
    const me = await fetchMe();
    qc.setQueryData(["me"], me);
    if (preferredRole && preferredRole !== "teacher" && me && !me.roles.includes(preferredRole) && primaryRole(me)) {
      toast.info(`Signed in as ${primaryRole(me)} — redirecting to your dashboard.`);
    }
    await navigate({ to: homePathFor(me, preferredRole), replace: true });
  };

  // Already signed in (or returning from Google/Lovable): go to dashboard.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => { if (data.user) await goHome(takeSignInRole()); }).catch((error: Error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await goHome(loginRole);
  }

  async function onSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = signupSchema.safeParse(fd);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { email, password, ...meta } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/auth", data: { ...meta, requested_role: signupRole } },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) { await goHome(); return; }
    setSentTo(email);
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSentTo(email);
  }

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-10 text-primary-foreground lg:flex">
        <Logo inverted className="text-primary-foreground" />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Assessments with <span className="text-highlight">integrity</span> built in.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/75">Server-side evaluation, protected answer keys and role-based access for every student, teacher and admin.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">Admin accounts are provisioned securely — not through public sign-up.</p>
      </aside>

      <main className="flex items-center justify-center bg-hero p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lift">
          <div className="mb-6 lg:hidden"><Logo /></div>

          {sentTo ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-success" />
              <h1 className="mt-4 text-2xl font-bold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a link to <strong>{sentTo}</strong>. {mode === "forgot" ? "Open it to set a new password." : "Confirm your email to finish signing up."}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); navigate({ to: "/auth", search: {} }); }}>Back to sign in</Button>
            </div>
          ) : mode === "forgot" ? (
            <form onSubmit={onForgot} className="space-y-4">
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Enter your account email and we'll send a reset link.</p>
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
              <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Send reset link</Button>
              <p className="text-center text-sm"><Link to="/auth" className="text-primary underline">Back to sign in</Link></p>
            </form>
          ) : mode === "signup" ? (
            <form onSubmit={onSignUp} className="space-y-4" noValidate>
              <div>
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Already registered? <Link to="/auth" className="text-primary underline">Sign in</Link></p>
              </div>
              <RolePicker value={signupRole} onChange={(v) => setSignupRole(v as "student" | "teacher")} options={["student", "teacher"]} />
              {signupRole === "teacher" && (
                <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">Teacher accounts need administrator approval before you can create exams.</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" />{err("full_name")}</div>
                <div className="space-y-1.5"><Label htmlFor="username">Username</Label><Input id="username" name="username" />{err("username")}</div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" />{err("email")}</div>
              <div className="space-y-1.5"><Label htmlFor="contact_number">Contact number <span className="text-muted-foreground">(optional)</span></Label><Input id="contact_number" name="contact_number" />{err("contact_number")}</div>
              <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" />{err("password")}</div>
              <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create account</Button>
              <Divider />
              <ProviderButtons onSuccess={() => goHome()} />
              <p className="text-center text-xs text-muted-foreground">Signing up with Google or Lovable creates a student account.</p>
            </form>
          ) : (
            <form onSubmit={onSignIn} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="mt-1 text-sm text-muted-foreground">New here? <Link to="/auth" search={{ mode: "signup" }} className="text-primary underline">Create an account</Link></p>
              </div>
              <RolePicker value={loginRole} onChange={(v) => setLoginRole(v as LoginRole)} options={["student", "teacher", "admin"]} />
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary underline">Forgot password?</Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Sign in as {loginRole}</Button>
              <Divider />
              <ProviderButtons role={loginRole} onSuccess={() => goHome(loginRole)} />
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

const roleMeta = {
  student: { icon: GraduationCap, label: "Student" },
  teacher: { icon: ClipboardCheck, label: "Teacher" },
  admin: { icon: ShieldCheck, label: "Admin" },
} as const;

function RolePicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (keyof typeof roleMeta)[] }) {
  return (
    <div role="radiogroup" aria-label="Role" className={cn("grid gap-2", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => {
        const M = roleMeta[o];
        const active = value === o;
        return (
          <button key={o} type="button" role="radio" aria-checked={active} onClick={() => onChange(o)}
            className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
            <M.icon className="size-5" />{M.label}
          </button>
        );
      })}
    </div>
  );
}

function Divider() {
  return <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>;
}
