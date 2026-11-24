import { createFileRoute } from "@tanstack/react-router";
import { ExamWorkspace } from "@/components/exam-workspace";
import { workspaceQuery } from "@/lib/exams.functions";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/admin/exams")({ staticData: { sitemap: false }, head: () => pageHead("Admin exam oversight", "Review and close exams across the ExamHubb platform."), loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery("admin")), component: () => <ExamWorkspace role="admin" /> });