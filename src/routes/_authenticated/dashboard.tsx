import { createFileRoute, redirect } from "@tanstack/react-router";
import { meQuery, homePathFor } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/dashboard")({ staticData: { sitemap: false },
  head: () => pageHead("Your dashboard", "Open your role-based ExamHubb workspace."),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    throw redirect({ to: homePathFor(me) });
  },
});
