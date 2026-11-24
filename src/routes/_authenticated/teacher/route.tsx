import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { meQuery } from "@/lib/auth";
import { requireRole } from "@/lib/role-guard";

const TITLES: Record<string, string> = { "/teacher": "Teacher dashboard", "/teacher/exams": "Exam management", "/teacher/materials": "Study materials", "/teacher/results": "Results", "/teacher/ai-generator": "AI generator", "/teacher/monitoring": "Live monitoring" };

export const Route = createFileRoute("/_authenticated/teacher")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "teacher"),
  head: () => ({ meta: [{ title: "Teacher dashboard – ExamHubb" }] }),
  component: Layout,
});

function Layout() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { pathname } = useLocation();
  if (!me) return null;
  return (
    <AppShell me={me} role="teacher" title={TITLES[pathname] ?? "Teacher dashboard"}>
      <Outlet />
    </AppShell>
  );
}
