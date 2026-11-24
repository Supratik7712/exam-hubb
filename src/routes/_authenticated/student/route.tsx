import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { meQuery } from "@/lib/auth";
import { requireRole } from "@/lib/role-guard";

const TITLES: Record<string, string> = { "/student": "Student dashboard", "/student/exams": "Available exams", "/student/results": "Results", "/student/performance": "Performance", "/student/recommendations": "Recommendations", "/student/certificates": "Certificates", "/student/feedback": "Feedback", "/student/materials": "Study materials" };

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "student"),
  head: () => ({ meta: [{ title: "Student dashboard – ExamHubb" }] }),
  component: Layout,
});

function Layout() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { pathname } = useLocation();
  return (
    <AppShell me={me!} role="student" title={TITLES[pathname] ?? "Student dashboard"}>
      <Outlet />
    </AppShell>
  );
}
