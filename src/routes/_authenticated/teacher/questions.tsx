import { createFileRoute } from "@tanstack/react-router";
import { QuestionBank } from "@/components/question-bank";
import { workspaceQuery } from "@/lib/exams.functions";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/teacher/questions")({ head: () => pageHead("Question bank", "Manage approved MCQ and True/False questions for your ExamHub exams."), loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery("teacher")), component: QuestionBank });