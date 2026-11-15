import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().uuid().optional(), topic: z.string().trim().max(200), question_text: z.string().trim().min(1).max(5000),
  question_type: z.enum(["MCQ", "TRUE_FALSE"]), options: z.array(z.string().trim().min(1)).min(2).max(6),
  correct_answer: z.number().int().min(0), marks: z.number().positive(), difficulty: z.enum(["Easy", "Medium", "Hard"]), explanation: z.string().max(5000),
}).superRefine((q, ctx) => {
  if (q.correct_answer >= q.options.length) ctx.addIssue({ code: "custom", message: "Choose a valid correct answer" });
  if (q.question_type === "TRUE_FALSE" && JSON.stringify(q.options) !== JSON.stringify(["True", "False"])) ctx.addIssue({ code: "custom", message: "True/False options must be True and False" });
});
export const examSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), subject: z.string().trim().min(1).max(200), description: z.string().max(5000),
  duration_minutes: z.number().int().positive(), start_at: z.string().nullable(), end_at: z.string().nullable(),
  status: z.enum(["draft", "scheduled", "active"]), question_ids: z.array(z.string().uuid()),
  settings: z.object({ randomize_questions: z.boolean(), randomize_options: z.boolean(), release_results: z.boolean() }),
}).superRefine((e, ctx) => {
  if (e.status !== "draft" && (!e.question_ids.length || !e.start_at || !e.end_at)) ctx.addIssue({ code: "custom", message: "Select questions and set a schedule before publishing" });
  if (e.start_at && e.end_at && Date.parse(e.end_at) <= Date.parse(e.start_at)) ctx.addIssue({ code: "custom", message: "End time must follow start time" });
});
export function examStatus(e: { status: string; start_at: string | null; end_at: string | null }, now = Date.now()) {
  if (e.status === "draft" || e.status === "completed") return e.status;
  if (e.end_at && Date.parse(e.end_at) <= now) return "completed";
  if (e.start_at && Date.parse(e.start_at) > now) return "scheduled";
  return "active";
}