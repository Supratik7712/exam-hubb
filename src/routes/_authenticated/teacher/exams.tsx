import { createFileRoute } from "@tanstack/react-router";
import { ExamWorkspace } from "@/components/exam-workspace";
import { workspaceQuery } from "@/lib/exams.functions";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/teacher/exams")({ head: () => pageHead("Teacher exams", "Create, schedule, publish and manage your ExamHub exams."), loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery("teacher")), component: () => <ExamWorkspace role="teacher" /> });