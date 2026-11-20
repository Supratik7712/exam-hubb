import { describe, expect, it } from "vitest";
import { questionSchema, examSchema, examStatus, countWords } from "@/lib/exam-rules";
const question = { topic: "Logic", question_text: "Is true true?", question_type: "TRUE_FALSE", options: ["True", "False"], correct_answer: 0, marks: 1, difficulty: "Easy", explanation: "" };
const exam = { title: "Logic", subject: "Math", description: "", duration_minutes: 30, start_at: null, end_at: null, status: "draft", question_ids: [], settings: { randomize_questions: false, randomize_options: false, release_results: false } };
describe("exam setup rules", () => {
  it("supports MCQ", () => expect(questionSchema.safeParse({ ...question, question_type: "MCQ" }).success).toBe(true));
  it("requires True/False options for True/False questions", () => expect(questionSchema.safeParse({ ...question, options: ["Yes", "No"] }).success).toBe(false));
  it("rejects a correct answer outside the options", () => expect(questionSchema.safeParse({ ...question, correct_answer: 2 }).success).toBe(false));
  it("requires a word limit for short answer", () => expect(questionSchema.safeParse({ ...question, question_type: "SHORT_ANSWER", options: [], correct_answer: -1 }).success).toBe(false));
  it("accepts short answer with a 100 word limit", () => expect(questionSchema.safeParse({ ...question, question_type: "SHORT_ANSWER", options: [], correct_answer: -1, word_limit: 100 }).success).toBe(true));
  it("counts words", () => expect(countWords("  a quick   brown fox ")).toBe(4));
  it("allows empty drafts", () => expect(examSchema.safeParse(exam).success).toBe(true));
  it("requires questions and timing before publishing", () => expect(examSchema.safeParse({ ...exam, status: "active" }).success).toBe(false));
  it("moves scheduled exams to active when start time arrives", () => expect(examStatus({ status: "scheduled", start_at: "2026-11-15T10:00:00Z", end_at: "2026-11-15T13:00:00Z" }, Date.parse("2026-11-15T12:00:00Z"))).toBe("active"));
  it("treats ended exams as completed", () => expect(examStatus({ status: "active", start_at: null, end_at: "2026-11-15T11:00:00Z" }, Date.parse("2026-11-15T12:00:00Z"))).toBe("completed"));
});