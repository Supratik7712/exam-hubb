import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().uuid().optional(), topic: z.string().trim().max(200), question_text: z.string().trim().min(1).max(5000),
  question_type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]), options: z.array(z.string().trim().min(1)).max(6),
  correct_answer: z.number().int().min(-1), word_limit: z.number().int().min(10).max(2000).nullable().default(null), model_answer: z.string().max(10000).default(""), marks: z.number().positive(), difficulty: z.enum(["Easy", "Medium", "Hard"]), explanation: z.string().max(5000),
}).superRefine((q, ctx) => {
  if (q.question_type === "SHORT_ANSWER") {
    if (q.word_limit == null) ctx.addIssue({ code: "custom", message: "Set a word limit for short answer questions" });
    if (q.options.length) ctx.addIssue({ code: "custom", message: "Short answer questions have no options" });
    return;
  }
  if (q.options.length < 2) ctx.addIssue({ code: "custom", message: "Add at least two options" });
  if (q.correct_answer < 0 || q.correct_answer >= q.options.length) ctx.addIssue({ code: "custom", message: "Choose a valid correct answer" });
  if (q.question_type === "TRUE_FALSE" && JSON.stringify(q.options) !== JSON.stringify(["True", "False"])) ctx.addIssue({ code: "custom", message: "True/False options must be True and False" });
});
export const examSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), subject: z.string().trim().min(1).max(200), description: z.string().max(5000),
  duration_minutes: z.number({ message: "Set the exam timer" }).int().min(1, "Timer must be at least 1 minute").max(1440, "Timer can be at most 24 hours"), start_at: z.string().nullable(), end_at: z.string().nullable(),
  status: z.enum(["draft", "scheduled", "active"]), question_ids: z.array(z.string().uuid()),
  settings: z.object({ randomize_questions: z.boolean(), randomize_options: z.boolean(), release_results: z.boolean() }),
}).superRefine((e, ctx) => {
  if (e.status !== "draft" && !e.question_ids.length) ctx.addIssue({ code: "custom", message: "Add questions before publishing" });
  if (e.start_at && e.end_at && Date.parse(e.end_at) <= Date.parse(e.start_at)) ctx.addIssue({ code: "custom", message: "End time must follow start time" });
});
export function examStatus(e: { status: string; start_at: string | null; end_at: string | null }, now = Date.now()) {
  if (e.status === "draft" || e.status === "completed") return e.status;
  if (e.end_at && Date.parse(e.end_at) <= now) return "completed";
  if (e.start_at && Date.parse(e.start_at) > now) return "scheduled";
  return "active";
}export function countWords(text: string) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
