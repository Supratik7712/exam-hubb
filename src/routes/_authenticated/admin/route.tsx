import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { meQuery } from "@/lib/auth";
import { requireRole } from "@/lib/role-guard";

const TITLES: Record<string, string> = { "/admin": "Admin overview", "/admin/users": "User management", "/admin/exams": "Exam oversight", "/admin/activity": "Activity log", "/admin/feedback": "Feedback", "/admin/reports": "Reports", "/admin/settings": "Settings" };

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "admin"),
  head: () => ({ meta: [{ title: "Admin overview – ExamHub" }] }),
  component: Layout,
});

function Layout() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { pathname } = useLocation();
  if (!me) return null;
  return (
    <AppShell me={me} role="admin" title={TITLES[pathname] ?? "Admin overview"}>
      <Outlet />
    </AppShell>
  );
}
