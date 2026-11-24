import { GraduationCap, Linkedin, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type Person = {
  name: string;
  role: string;
  /** Full LinkedIn profile URL. Leave "" until the link is supplied — the icon is hidden then. */
  linkedin: string;
};

export const projectInfo = {
  college: "MSIT Kolkata",
  course: "B.Tech CSBS — Software Engineering",
  semester: "5th Semester Curriculum Project",
  session: "Session 2024–2028",
  graduating: "Graduating 2028",
  guideRole: "Teacher — Software Engineering",
  summary:
    "ExamHubb is an online examination platform where teachers set the question paper, students sit for timed exams in the browser, and every paper is evaluated on the server. Questions come in three patterns — multiple choice, true / false and short answer with a word limit the teacher fixes. Correct answers stay on the server until the result is released, so a paper cannot be read off a student's screen. Results, performance insights, AI study recommendations and verifiable certificates follow automatically, and each role sees only its own dashboard.",
  members: [
    { name: "Supratik Saha", role: "Team Lead", linkedin: "https://www.linkedin.com/in/supratiksahass/" },
    { name: "Swastika Banik", role: "Project Member", linkedin: "https://www.linkedin.com/in/swastika-banik-29904728b/" },
    { name: "Suparna Das", role: "Project Member", linkedin: "https://www.linkedin.com/in/suparna-das-6b4bbb371/" },
    { name: "Rashi Kumari", role: "Project Member", linkedin: "" },
    { name: "Swayam Roy", role: "Project Member", linkedin: "" },
  ] satisfies Person[],
  guides: [
    { name: "Prof. Amit Kumar Bagh", role: "Teacher — Software Engineering", linkedin: "" },
    { name: "Prof. Sneha Nandi", role: "Teacher — Software Engineering", linkedin: "" },
  ] satisfies Person[],
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isProfileUrl(value: string) {
  return /^https?:\/\/([\w-]+\.)?linkedin\.com\//i.test(value.trim());
}

export function LinkedInLink({ person, className }: { person: Person; className?: string }) {
  const url = person.linkedin.trim();
  if (!isProfileUrl(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${person.name} on LinkedIn`}
      title="Open LinkedIn profile"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-highlight hover:bg-accent hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Linkedin className="size-4" />
    </a>
  );
}

export function AboutBody({ stacked = false }: { stacked?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <GraduationCap className="size-3.5" /> {projectInfo.college}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
          {projectInfo.course} · {projectInfo.semester}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
          {projectInfo.session} · {projectInfo.graduating}
        </span>
      </div>

      <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        {projectInfo.summary}
      </p>

      <div className={cn("mt-10 grid gap-8", stacked ? "md:grid-cols-1" : "md:grid-cols-[1.35fr_1fr]")}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4 text-highlight" /> Project team
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {projectInfo.members.map((m) => (
              <li
                key={m.name}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  {initials(m.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{m.name}</span>
                  <span className="block text-xs text-muted-foreground">{m.role}</span>
                </span>
                <LinkedInLink person={m} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-4 text-highlight" /> Guided by
          </h3>
          <ul className="mt-4 space-y-3">
            {projectInfo.guides.map((g) => (
              <li
                key={g.name}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-accent/60 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{g.name}</span>
                  <span className="block text-xs text-muted-foreground">{g.role}</span>
                </span>
                <LinkedInLink person={g} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Submitted as a group curriculum project for the 5th semester, B.Tech Computer Science &amp;
            Business System, {projectInfo.college} — {projectInfo.session}.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold md:text-4xl">About this project</h2>
      <p className="mt-3 max-w-xl text-muted-foreground">
        What ExamHubb is, who built it and who guided us.
      </p>
      <div className="mt-8">
        <AboutBody />
      </div>
    </section>
  );
}

export function AboutDialogButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View about
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About ExamHubb</DialogTitle>
          <DialogDescription>
            {projectInfo.college} · {projectInfo.course} · {projectInfo.semester} ·{" "}
            {projectInfo.session}
          </DialogDescription>
        </DialogHeader>
        <AboutBody stacked />
      </DialogContent>
    </Dialog>
  );
}
