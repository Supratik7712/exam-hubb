import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Percent, Bell, CalendarClock } from "lucide-react";
import { StatCard, EmptyState } from "@/components/app-shell";
import { meQuery } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/student/")({ component: StudentHome });

function StudentHome() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold">Hi {me?.profile?.full_name?.split(" ")[0] || "there"} 👋</h2>
        <p className="text-muted-foreground">Here's your exam overview.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming exams" value={0} icon={CalendarClock} />
        <StatCard label="Completed" value={0} icon={CheckCircle2} />
        <StatCard label="Average score" value="—" icon={Percent} hint="After your first result" />
        <StatCard label="Notifications" value={0} icon={Bell} />
      </div>
      <EmptyState icon={BookOpen} title="No exams yet" text="When a teacher publishes an exam for you, it will appear here with its schedule and instructions." />
    </div>
  );
}
