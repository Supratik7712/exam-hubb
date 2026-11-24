import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, BarChart3, Award, Brain, Clock, ShieldCheck, Sparkles, GraduationCap, Users, ClipboardCheck, HelpCircle, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { AboutSection } from "@/components/about-project";
import { useMe, homePathFor } from "@/lib/auth";
import hero from "@/assets/hero-exam.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamHubb – Intelligent Online Examination System" },
      { name: "description", content: "Timed online exams, instant MCQ evaluation, analytics, AI question generation and certificates — for students, teachers and admins." },
      { property: "og:title", content: "ExamHubb – Intelligent Online Examination System" },
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

const FAQ_FIRST_QUESTION = "Who can use ExamHubb?";

const faqs = [
  {
    q: FAQ_FIRST_QUESTION,
    a: "Three kinds of accounts, each with its own dashboard. Students take exams and see their results, teachers build question banks and exam papers, and admins oversee users, approvals and the whole platform.",
  },
  {
    q: "How do I sign in?",
    a: "You can register with an email and password, or continue with Google or Lovable. If you forget your password, use the “Forgot password?” link on the sign-in page and we will email you a reset link.",
  },
  {
    q: "I registered but I am not a teacher. How do I get teacher access?",
    a: "Sign in, choose Teacher on the sign-in screen and click “Request teacher access”. An admin sees your request under Users → Pending and approves it. Once approved, the teacher dashboard opens for your account.",
  },
  {
    q: "What kinds of questions can a teacher put in a paper?",
    a: "Three patterns, chosen while writing each question: multiple choice (MCQ), true / false, and short answer — a sentence or a few lines, with a word limit you set. Teachers mark the correct answer for MCQ and true / false while building the paper.",
  },
  {
    q: "Do students see the correct answers during an exam?",
    a: "No. Answer keys stay on the server, so they are never sent to the student's browser during an attempt. Marks are calculated server-side, and you can review your responses after the result is out.",
  },
  {
    q: "Can a teacher reuse questions across exams?",
    a: "Yes. Save questions in your question bank and add them to any paper you build. Each exam keeps its own copy, so editing a bank question later never changes an exam that is already published.",
  },
  {
    q: "Who can add more admins?",
    a: "An existing admin can grant admin access to any registered user from the Users page. Every such change is recorded in the audit log, and public sign-up can never create an admin account.",
  },
  {
    q: "What happens after an exam is submitted?",
    a: "The paper is evaluated automatically on the server, the result is recorded, and performance insights — topic-wise accuracy, strengths and weak areas — follow for the student and the teacher.",
  },
];

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#roles", label: "For your role" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#about", label: "About" },
];

function Landing() {
  const { data: me } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle><Logo /></SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-6 flex flex-col gap-2 border-t pt-6">
                  {me ? (
                    <Button asChild onClick={() => setMenuOpen(false)}>
                      <Link to={homePathFor(me)}>Go to dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild onClick={() => setMenuOpen(false)}>
                        <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                      </Button>
                      <Button variant="outline" asChild onClick={() => setMenuOpen(false)}>
                        <Link to="/auth">Sign in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground">{l.label}</a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {me ? (
              <Button asChild><Link to={homePathFor(me)}>Go to dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
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
              ExamHubb takes you from exam creation to evaluated results and personalised study plans — in one
              secure, role-based platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Create a free account <ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild><Link to="/auth">I already have one</Link></Button>
            </div>
          </div>
          <img src={hero} alt="Student taking an online exam on ExamHubb" width={1280} height={1024}
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

      <section id="faq" className="bg-hero border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <HelpCircle className="size-3.5" /> Frequently asked questions
          </span>
          <h2 className="mt-5 text-3xl font-bold md:text-4xl">Questions, answered.</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Everything about accounts, roles, question types and how your answers are handled.
          </p>

          <div className="mt-10 rounded-2xl border bg-card px-6 shadow-soft">
            <Accordion type="single" collapsible defaultValue={FAQ_FIRST_QUESTION}>
              {faqs.map((item) => (
                <AccordionItem key={item.q} value={item.q} className="last:border-b-0">
                  <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Can't find your answer? Sign in — account and teacher-access requests are handled inside ExamHubb by your platform admins.
          </p>
        </div>
      </section>

      <AboutSection />

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© 2026 ExamHubb. All rights reserved.</p>
          <p>
            Feedback or queries?{" "}
            <a
              href="mailto:support-query@examhhubb.online"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              support-query@examhhubb.online
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
