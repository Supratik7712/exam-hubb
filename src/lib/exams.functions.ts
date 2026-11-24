import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { examSchema, questionSchema } from "./exam-rules";

export const getWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ role: z.enum(["teacher", "admin"]) }))
  .handler(async ({ data, context }) => {
    const [{ data: allowed, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: data.role }),
      context.supabase.from("profiles").select("account_status").eq("id", context.userId).single(),
    ]);
    if (roleError) throw roleError;
    if (profileError) throw profileError;
    if (!allowed || profile?.account_status !== "active") throw new Error("Not authorized");
    const [{ data: exams, error }, { data: questions, error: qError }] = await Promise.all([
      // Teacher view is always own papers only, even for accounts that are also admins
      data.role === "teacher" ? context.supabase.from("exams").select("*").eq("teacher_id", context.userId).order("created_at", { ascending: false }) : context.supabase.from("exams").select("*").order("created_at", { ascending: false }),
      data.role === "teacher" ? context.supabase.from("questions").select("*").is("exam_id", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (error) throw error;
    if (qError) throw qError;
    const ids = (exams ?? []).map(e => e.id);
    const { data: attempts } = ids.length ? await context.supabase.from("exam_attempts").select("exam_id, score, total_marks, status").in("exam_id", ids) : { data: [] };
    const stats: Record<string, { attempts: number; avg: number | null }> = {};
    for (const a of attempts ?? []) {
      const s = (stats[a.exam_id] ??= { attempts: 0, avg: null }); const pct = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
      s.avg = a.status === "in_progress" ? s.avg : Math.round((((s.avg ?? 0) * s.attempts) + pct) / (s.attempts + 1)); s.attempts += 1;
    }
    return { exams: exams ?? [], questions: questions ?? [], stats };
  });
export const workspaceQuery = (role: "teacher" | "admin") => queryOptions({ queryKey: ["workspace", role], staleTime: 30_000, queryFn: () => getWorkspace({ data: { role } }) });
export const saveQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(questionSchema).handler(async ({ data, context }) => {
  const { id, ...values } = data;
  const { data: row, error } = id ? await context.supabase.from("questions").update(values).eq("id", id).eq("created_by", context.userId).is("exam_id", null).select("id").single() : await context.supabase.from("questions").insert({ ...values, created_by: context.userId }).select("id").single();
  if (error) throw error; return row.id;
});
export const deleteQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("questions").delete().eq("id", data.id).eq("created_by", context.userId).is("exam_id", null); if (error) throw error;
});
export const saveExam = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(examSchema).handler(async ({ data, context }) => {
  const { question_ids, ...exam } = data;
  const { data: id, error } = await context.supabase.rpc("save_exam", { _exam: { ...exam, settings: { ...exam.settings, question_ids } }, _question_ids: question_ids });
  if (error) throw error; return id;
});
export const manageExam = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid(), action: z.enum(["close", "delete", "remove"]) })).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("manage_exam", { _id: data.id, _action: data.action }); if (error) throw error;
});