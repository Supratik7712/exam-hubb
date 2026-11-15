import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Award, Brain, Clock, ShieldCheck, Sparkles, GraduationCap, Users, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useMe, homePathFor } from "@/lib/auth";
import hero from "@/assets/hero-exam.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamHub – Intelligent Online Examination System" },
      { name: "description", content: "Timed online exams, instant MCQ evaluation, analytics, AI question generation and certificates — for students, teachers and admins." },
      { property: "og:title", content: "ExamHub – Intelligent Online Examination System" },
      { property: "og:description", content: "Timed online exams, instant evaluation, analytics and AI study recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Clock, title: "Timed exams that just work", text: "Server-enforced timers, autosave, question palette, mark-for-review and auto-submit on timeout." },
  { icon: ShieldCheck, title: "Secure by design", text: "Answer keys never reach the browser. Scores are calculated on the server, not trusted from clients." },
  { icon: Brain, title: "AI question generation", text: "Draft MCQ and True/False questions by topic and difficulty. Nothing goes live without teacher approval." },
  { icon: BarChart3, title: "Performance analytics", text: "Topic-wise accuracy, strengths and weak areas for every student and every exam." },
  { icon: Sparkles, title: "Personal study plans", text: "Recommendations grounded in each student's actual results — never invented history." },
  { icon: Award, title: "Verifiable certificates", text: "Eligible students download certificates with a unique verification code." },
];

const roles = [
  { icon: GraduationCap, name: "Students", points: ["Take scheduled exams", "Instant results & review", "Analytics and recommendations", "Download certificates"] },
  { icon: ClipboardCheck, name: "Teachers", points: ["Build exams & question banks", "Review AI-generated questions", "Monitor attempts & activity", "Export result reports"] },
  { icon: Users, name: "Admins", points: ["Approve teacher accounts", "Activate or deactivate users", "Platform-wide reports", "Review feedback"] },
];

function Landing() {
  const { data: me } = useMe();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#roles" className="hover:text-foreground">For your role</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            {me ? (
              <Button asChild><Link to={homePathFor(me)}>Go to dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="size-3.5" /> Intelligent Online Examination System
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Exams that are <span className="text-highlight">fair</span>, fast and actually insightful.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              ExamHub takes you from exam creation to evaluated results and personalised study plans — in one
              secure, role-based platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Create a free account <ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild><Link to="/auth">I already have one</Link></Button>
            </div>
          </div>
          <img src={hero} alt="Student taking an online exam on ExamHub" width={1280} height={1024}
            className="w-full rounded-2xl shadow-lift" />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="max-w-xl text-3xl font-bold md:text-4xl">Everything an examination workflow needs.</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="bg-ink text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold md:text-4xl">One platform, three dashboards.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.name} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
                <r.icon className="size-7 text-highlight" />
                <h3 className="mt-3 text-xl font-bold">{r.name}</h3>
                <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
                  {r.points.map((p) => <li key={p}>— {p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-4">
          {["Teacher builds and publishes an exam", "Student reads instructions and starts", "Answers autosave until submission", "Server evaluates — results & insights follow"].map((t, i) => (
            <li key={t} className="rounded-2xl border bg-card p-6">
              <span className="font-display text-4xl font-extrabold text-highlight">0{i + 1}</span>
              <p className="mt-3 font-medium">{t}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} ExamHub. Intelligent Online Examination System.</p>
        </div>
      </footer>
    </div>
  );
}
