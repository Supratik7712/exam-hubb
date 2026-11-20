# Next step: Phase 4 + 5 — Students take exams and get results

The "Soon" pages are the remaining roadmap phases. The most important next step is letting students actually take exams, since results, performance, certificates and reports all depend on real attempts.

## What gets built now

**Student**
- **Available exams** page: published exams the student can take, with time window, duration and marks.
- **Instructions screen** before starting (rules, duration, number of questions).
- **Exam screen**: timer, one question at a time, question palette (answered / not answered / marked for review), MCQ and True/False choices, short-answer box with live word count and limit.
- **Autosave** of every answer, safe page refresh, and **auto-submit** when time runs out.
- **Results** page: score, percentage, pass/fail, and per-question review shown only after submission.

**Teacher**
- **Results** for each exam: who attempted, scores, and a place to **mark short-answer questions** (MCQ and True/False are marked automatically).

**Admin**
- Exam list shows attempt counts and average scores.

## Security
- Correct answers never reach the student's browser during an exam.
- Starting, saving, submitting and scoring happen on the server; timers are checked by the server, so late or edited answers are rejected.
- One attempt per student per exam (can be changed later).

## After this (later phases, in order)
1. Admin reports, feedback review and settings
2. Performance analytics and activity logs
3. AI question generation (teacher approves) and study recommendations
4. Certificates with PDF download and verification code
5. Final testing and demo data

## Technical details
- New tables: `exam_attempts` (student, exam, started_at, deadline, status, score) and `attempt_answers` (attempt, question, selected option / text, marks awarded), with RLS: students see only their own rows; teachers see attempts on their exams; admins see all.
- Server functions: `listAvailableExams`, `startAttempt` (returns safe question projection without `correct_answer`), `saveAnswer`, `submitAttempt` (server-side scoring, deadline check), `getAttemptResult`, teacher `listExamAttempts`, `gradeShortAnswer` (role-checked RPC, audit logged).
- Routes: `/student/exams`, `/student/exams/$examId`, `/student/attempt/$attemptId`, `/student/results`, `/teacher/results`.
- Remove "Soon" badges for the pages that go live; tests for scoring, deadline and word-limit rules.
