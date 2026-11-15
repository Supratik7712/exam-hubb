import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, PlayCircle, CheckCircle2, Users, FileQuestion } from "lucide-react";
import { StatCard, EmptyState } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/teacher/")({ component: TeacherHome });

function TeacherHome() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold">Teaching overview</h2>
        <p className="text-muted-foreground">Create exams, manage your question bank and track results.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exams created" value={0} icon={BookOpen} />
        <StatCard label="Active exams" value={0} icon={PlayCircle} />
        <StatCard label="Completed" value={0} icon={CheckCircle2} />
        <StatCard label="Participating students" value={0} icon={Users} />
      </div>
      <EmptyState icon={FileQuestion} title="Exam builder arrives in the next phase" text="You'll be able to create exams, add MCQ and True/False questions, schedule and publish them." />
    </div>
  );
}
