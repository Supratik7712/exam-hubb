import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const json = <T,>(v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as T;

async function askAI(system: string, user: string, schema: Record<string, unknown>) {
  const key = process.env["LOVABLE_API_KEY"]; if (!key) throw new Error("AI is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      text: { format: { type: "json_schema", name: "result", strict: true, schema } } }),
  });
  if (res.status === 429) throw new Error("AI is busy right now — try again in a minute");
  if (res.status === 402) throw new Error("AI credits are used up for this workspace");
  if (!res.ok || !res.body) { console.error("AI error", res.status, await res.text()); throw new Error("AI request failed"); }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", out = "";
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { const ev = JSON.parse(line.slice(6)) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") throw new Error("AI request failed");
      } catch (e) { if (e instanceof Error && e.message === "AI request failed") throw e; }
    }
  }
  return JSON.parse(out || "{}") as unknown;
}
const strArr = { type: "array", items: { type: "string" } };
const obj = (props: Record<string, unknown>) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });

// ---------- Feedback ----------
export type Feedback = { id: string; user_id: string; category: string; rating: number | null; message: string; status: string; admin_note: string; created_at: string; author?: string | null };
export const listFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ all: z.boolean() })).handler(async ({ data, context }) => {
  let q = context.supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(200);
  if (!data.all) q = q.eq("user_id", context.userId);
  const { data: rows, error } = await q; if (error) throw new Error(error.message);
  if (!data.all) return rows as Feedback[];
  const ids = [...new Set(rows.map(r => r.user_id))];
  const { data: people } = ids.length ? await context.supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  return rows.map(r => { const p = people?.find(x => x.id === r.user_id); return { ...r, author: p?.full_name || p?.email || "User" }; }) as Feedback[];
});
export const feedbackQuery = (all: boolean) => queryOptions({ queryKey: ["feedback", all], staleTime: 15_000, queryFn: () => listFeedback({ data: { all } }) });
export const sendFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: z.enum(["General", "Exam", "Bug", "Suggestion"]), rating: z.number().int().min(1).max(5).nullable(), message: z.string().trim().max(3000), attempt_id: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    if (!data.message && !data.rating) throw new Error("Write a message or choose a rating");
    const { error } = await context.supabase.from("feedback").insert({ ...data, attempt_id: data.attempt_id ?? null, message: data.message || "No comment", user_id: context.userId }); if (error) throw new Error(error.message);
  });
export const updateFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(["open", "reviewed", "resolved"]), note: z.string().max(2000) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_update_feedback", { _id: data.id, _status: data.status, _note: data.note }); if (error) throw new Error(error.message);
  });

// ---------- Settings ----------
export const getSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("app_settings").select("*").eq("id", 1).single(); if (error) throw new Error(error.message); return data;
});
export const settingsQuery = queryOptions({ queryKey: ["settings"], staleTime: 60_000, queryFn: () => getSettings() });
export const saveSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ platform_name: z.string().trim().min(1).max(80), pass_percent: z.number().int().min(1).max(100), announcement: z.string().max(500), allow_teacher_requests: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_update_settings", { _name: data.platform_name, _pass: data.pass_percent, _announcement: data.announcement, _allow: data.allow_teacher_requests });
    if (error) throw new Error(error.message);
  });

// ---------- Reports / monitoring / certificates ----------
export type Report = { exams: number; published: number; attempts: number; graded: number; avg_percent: number | null; pass_rate: number | null; open_feedback: number;
  per_exam: { id: string; title: string; subject: string; teacher: string | null; attempts: number; avg_percent: number | null; passed: number }[] };
export const getReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("admin_report"); if (error) throw new Error(error.message); return json<Report>(data);
});
export type LiveAttempt = { id: string; exam_title: string; student_name: string; started_at: string; deadline: string; answered: number; total: number; last_activity: string | null };
export const getLiveAttempts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("teacher_live_attempts"); if (error) throw new Error(error.message); return json<LiveAttempt[]>(data) ?? [];
});
export type Certificate = { id: string; code: string; exam_title: string; subject: string; score: number; total_marks: number; issued_at: string; student_name: string };
export const getCertificates = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("student_certificates"); if (error) throw new Error(error.message); return json<Certificate[]>(data) ?? [];
});
export const verifyCertificate = createServerFn({ method: "GET" }).inputValidator(z.object({ code: z.string().max(20) })).handler(async ({ data }) => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h });
  } } });
  const { data: row, error } = await sb.rpc("verify_certificate", { _code: data.code }); if (error) { console.error(error); return null; }
  return json<{ exam_title: string; subject: string; issued_at: string; student_name: string; percent: number } | null>(row);
});

// ---------- AI ----------
export type Recommendation = { summary: string; strengths: string[]; focus_areas: string[]; next_steps: string[] };
export const getRecommendations = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("student_exams"); if (error) throw new Error(error.message);
  const exams = json<{ title: string; subject: string; attempt: { status: string; score: number; total_marks: number } | null }[]>(data) ?? [];
  const done = exams.filter(e => e.attempt && e.attempt.status !== "in_progress").map(e => `${e.title} (${e.subject}): ${e.attempt!.score}/${e.attempt!.total_marks}`);
  if (!done.length) return null;
  const r = await askAI("You are a supportive study coach for a student on an online exam platform. Keep each item under 25 words, 2-4 items per list.", `My exam results:\n${done.join("\n")}`, obj({ summary: { type: "string" }, strengths: strArr, focus_areas: strArr, next_steps: strArr }));
  return r as Recommendation;
});
export type GeneratedQuestion = { question_text: string; question_type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER"; options: string[]; correct_answer: number; word_limit: number | null; explanation: string; difficulty: "Easy" | "Medium" | "Hard" };
export const generateQuestions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ topic: z.string().trim().min(2).max(200), count: z.number().int().min(1).max(10), type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "MIXED"]), difficulty: z.enum(["Easy", "Medium", "Hard"]) }))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "teacher" }); if (!ok) throw new Error("Not authorized");
    const r = await askAI(`You write exam questions. Reply ONLY as JSON {"questions": [...]} where each item is {"question_text": string, "question_type": "MCQ"|"TRUE_FALSE"|"SHORT_ANSWER", "options": string[], "correct_answer": number, "word_limit": number|null, "explanation": string}. MCQ: exactly 4 options, correct_answer is the 0-based index. TRUE_FALSE: options ["True","False"]. SHORT_ANSWER: options [], correct_answer -1, word_limit 50-200.`,
      `Topic: ${data.topic}\nNumber: ${data.count}\nType: ${data.type === "MIXED" ? "a mix of MCQ, TRUE_FALSE and SHORT_ANSWER" : data.type}\nDifficulty: ${data.difficulty}`, obj({ questions: { type: "array", items: obj({ question_text: { type: "string" }, question_type: { type: "string", enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"] }, options: strArr, correct_answer: { type: "integer" }, word_limit: { type: ["integer", "null"] }, explanation: { type: "string" } }) } })) as { questions?: GeneratedQuestion[] };
    return (r.questions ?? []).slice(0, data.count).map(q => {
      const t = q.question_type === "TRUE_FALSE" || q.question_type === "SHORT_ANSWER" ? q.question_type : "MCQ";
      const options = t === "TRUE_FALSE" ? ["True", "False"] : t === "SHORT_ANSWER" ? [] : (q.options ?? []).map(String).slice(0, 6);
      const ca = t === "SHORT_ANSWER" ? -1 : Math.min(Math.max(0, Number(q.correct_answer) || 0), Math.max(0, options.length - 1));
      return { question_text: String(q.question_text ?? ""), question_type: t, options, correct_answer: ca, word_limit: t === "SHORT_ANSWER" ? Math.min(2000, Math.max(10, Number(q.word_limit) || 100)) : null, explanation: String(q.explanation ?? ""), difficulty: data.difficulty } as GeneratedQuestion;
    }).filter(q => q.question_text && (q.question_type === "SHORT_ANSWER" || q.options.length >= 2));
  });

// ---------- Notifications ----------
export type AppNotification = { id: string; title: string; body: string; read_at: string | null; created_at: string };
export const listNotifications = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("notifications").select("id, title, body, read_at, created_at").order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error(error.message); return data as AppNotification[];
});
export const notificationsQuery = queryOptions({ queryKey: ["notifications"], staleTime: 30_000, refetchInterval: 60_000, queryFn: () => listNotifications() });
export const markNotificationsRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.rpc("mark_notifications_read"); if (error) throw new Error(error.message);
});
