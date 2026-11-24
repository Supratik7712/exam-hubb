import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentExam = {
  id: string; title: string; subject: string; description: string; duration_minutes: number;
  start_at: string | null; end_at: string | null; total_marks: number; question_count: number;
  attempt: { id: string; status: "in_progress" | "submitted" | "graded" | "cancelled"; score: number; total_marks: number; submitted_at: string | null } | null;
};
export type AttemptQuestion = {
  id: string; question_text: string; question_type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER"; options: string[]; marks: number; word_limit: number | null;
  selected_option: number | null; answer_text: string; marked_for_review: boolean; marks_awarded: number | null;
  correct_answer: number | null; explanation: string | null;
};
export type Attempt = {
  id: string; status: "in_progress" | "submitted" | "graded" | "cancelled"; deadline: string; started_at: string; submitted_at: string | null; now: string;
  score: number | null; total_marks: number; review: boolean;
  exam: { id: string; title: string; subject: string; description: string; duration_minutes: number }; questions: AttemptQuestion[];
};
export type StaffAttempt = { id: string; status: string; score: number; total_marks: number; submitted_at: string | null; started_at: string; student_name: string; student_email: string | null };
export type StaffAttemptDetail = { id: string; status: string; score: number; total_marks: number; questions: (Omit<AttemptQuestion, "marked_for_review" | "explanation"> & { answer_id: string | null; correct_answer: number })[] };

const id = z.object({ id: z.string().uuid() });

export const listStudentExams = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("student_exams"); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(data ?? [])) as StudentExam[];
});
export const studentExamsQuery = queryOptions({ queryKey: ["student-exams"], staleTime: 15_000, queryFn: () => listStudentExams() });

export const startAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), name: z.string().trim().min(2, "Please enter your full name").max(120), roll: z.string().trim().max(60).default("") }))
  .handler(async ({ data, context }) => {
  const { data: attemptId, error } = await context.supabase.rpc("start_exam_attempt", { _exam_id: data.id, _name: data.name, _roll: data.roll }); if (error) throw new Error(error.message);
  return attemptId as string;
});
export const getAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(id).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.rpc("get_attempt", { _attempt_id: data.id }); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(row)) as Attempt;
});
export const attemptQuery = (attemptId: string) => queryOptions({ queryKey: ["attempt", attemptId], staleTime: 0, queryFn: () => getAttempt({ data: { id: attemptId } }) });

export const saveAnswer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ attempt_id: z.string().uuid(), question_id: z.string().uuid(), selected_option: z.number().int().min(0).max(10).nullable(), answer_text: z.string().max(20000), marked_for_review: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("save_answer", { _attempt_id: data.attempt_id, _question_id: data.question_id, _selected: data.selected_option as number, _text: data.answer_text, _review: data.marked_for_review });
    if (error) throw new Error(error.message);
  });
export const submitAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(id).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("submit_attempt", { _attempt_id: data.id }); if (error) throw new Error(error.message);
});

export const listExamAttempts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(id).handler(async ({ data, context }) => {
  const { data: rows, error } = await context.supabase.rpc("staff_exam_attempts", { _exam_id: data.id }); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(rows ?? [])) as StaffAttempt[];
});
export const getAttemptDetail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(id).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.rpc("staff_attempt_detail", { _attempt_id: data.id }); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(row)) as StaffAttemptDetail;
});
export const gradeShortAnswer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ answer_id: z.string().uuid(), marks: z.number().min(0) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("grade_short_answer", { _answer_id: data.answer_id, _marks: data.marks }); if (error) throw new Error(error.message);
  });

export const reportTabSwitch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(id).handler(async ({ data, context }) => {
  const { data: r, error } = await context.supabase.rpc("report_tab_switch", { _attempt_id: data.id }); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(r)) as { count: number; cancelled: boolean };
});

export type AdminActivity = {
  attempts: { id: string; started_at: string; submitted_at: string | null; status: string; score: number; total_marks: number; tab_switches: number; candidate_name: string; roll_number: string; account_name: string | null; email: string | null; exam_title: string; subject: string; teacher: string | null }[];
  events: { at: string; kind: string; text: string }[];
};
export const getAdminActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("admin_activity"); if (error) throw new Error(error.message);
  return JSON.parse(JSON.stringify(data)) as AdminActivity;
});
