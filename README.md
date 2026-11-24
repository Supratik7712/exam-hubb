<div align="center">

# 🎓 ExamHubb
### Intelligent Online Examination System

**Create, take, proctor and evaluate online exams — with role-based dashboards, AI question generation, analytics and verifiable certificates.**

🌐 **Live:** [examhubb.online](https://examhubb.online)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-v1-FF4154)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RLS-4169E1?logo=postgresql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-46_passing-success)

</div>

---

## 📖 Table of Contents
1. [About the Project](#-about-the-project)
2. [Key Features](#-key-features)
3. [Role-Based Dashboards](#-role-based-dashboards)
4. [Exam Lifecycle](#-exam-lifecycle)
5. [Security Model](#-security-model)
6. [Tech Stack](#-tech-stack)
7. [Architecture](#-architecture)
8. [Database Schema](#-database-schema)
9. [Project Structure](#-project-structure)
10. [Getting Started](#-getting-started)
11. [Testing](#-testing)
12. [Design System](#-design-system)
13. [SEO & Performance](#-seo--performance)
14. [Team](#-team)
15. [License](#-license)

---

## 🧭 About the Project

**ExamHubb** is a free, open online examination platform built as the **B.Tech CSBS — Software Engineering, 5th Semester curriculum project** at **MSIT Kolkata** (Session 2024–2028).

It covers the complete examination workflow — from a teacher writing (or AI‑generating) a question paper, to a student taking a timed, proctored exam, to automatic evaluation, optional manual re‑checking, results, analytics and downloadable certificates — all inside one secure, role‑based web application.

> **Open platform:** any signed‑in student can see and attempt every published exam, and any approved teacher can create and publish papers.

---

## ✨ Key Features

| Area | Highlights |
|---|---|
| 🔐 **Authentication** | Email/password and Google sign‑in, password reset, profile management, role selection at sign‑in |
| 👥 **Three roles** | Separate **Student**, **Teacher** and **Admin** workspaces with server‑enforced access |
| 📝 **Question types** | MCQ, True/False and Short‑answer (teacher sets a word limit, e.g. 100/200 words, with live word count) |
| ⏱️ **Flexible exams** | Per‑exam timer (1–1440 min), optional schedule window, optional shuffle settings, unlimited retakes |
| 🛡️ **Online proctoring** | Mandatory fullscreen, copy/cut/right‑click blocked, tab‑switch detection — 3 warnings, then auto‑cancel with teacher & admin alerts |
| 🤖 **AI question generator** | Teachers generate questions with AI, approve each one, then create & publish the paper directly |
| ✅ **Evaluation** | Instant server‑side auto‑marking; optional **"Automatic + manual check"** mode for teacher cross‑verification |
| 🏆 **Certificates** | Auto‑issued on passing, downloadable, with a public verification page (`/verify/<code>`) |
| 📚 **Study materials** | Teachers upload PDF/Word notes; students view and download them |
| 📊 **Analytics** | Student performance charts, AI study recommendations, teacher live monitoring, admin reports with CSV export |
| 🔔 **Notifications** | Header bell with personal alerts and scheduled admin announcements (audience, start & expiry) |
| ⭐ **Feedback** | Star rating + optional comment popup after every exam, visible to admins |
| 🕵️ **Activity log** | Admin sees every attempt (candidate name, roll no., exam, time, score) and a full event timeline |

---

## 🧑‍🤝‍🧑 Role-Based Dashboards

### 🎒 Student
- **Available exams** — all published exams; enter name & roll number before starting
- **Exam screen** — fullscreen, countdown timer, question palette, autosave, auto‑submit, *Quit exam* option
- **Results** — score, pass/fail, per‑question review, *View certificate* button
- **Performance** — progress charts over time
- **Recommendations** — AI‑generated personalised study plan
- **Certificates** — view & download
- **Study materials** — teacher notes
- **Feedback** — rate exams and the platform

### 🧑‍🏫 Teacher
- **Exams** — create papers with a single *Write a question* editor (MCQ / True‑False / Short answer), set correct answers, timer, schedule, shuffle and checking mode; publish/unpublish/archive
- **AI generator** — generate → approve → create & publish
- **Results** — every attempt on *their own* papers; grade short answers; re‑check auto marks when manual check is on (students are notified of updated results)
- **Monitoring** — live attempts and proctoring alerts
- **Study materials** — upload PDF/DOC/DOCX (up to 20 MB)
- Teacher access requires **admin approval** (`/teacher-access` request flow)

### 🛠️ Admin
- **Overview** — platform‑wide live statistics
- **Users** — approve teachers, suspend users, grant admin (audited)
- **All exams** — view every exam; permanently **remove** any exam with its attempts
- **Activity log** — exam attempts table (search + CSV) and full event timeline
- **Announcements** — create, edit, delete, schedule and expire bell notifications by audience
- **Feedback** — all student ratings and comments
- **Reports** — exportable platform reports
- **Settings** — platform name, pass mark, teacher‑request toggle

---

## 🔄 Exam Lifecycle

```text
Teacher writes / AI-generates questions
            │
            ▼
   Exam created (draft) ──► Published
            │
            ▼
Student enters name & roll ──► Fullscreen proctored attempt
            │                     │ autosave · timer · tab-switch warnings (3 → cancel)
            ▼                     ▼
      Submit / Time up / Quit ──► Server-side scoring (RPC)
            │
   ┌────────┴─────────┐
   ▼                  ▼
Auto-graded     Short answer / manual check
   │                  │  teacher notified → grades → student notified
   ▼                  ▼
 Result ──► Certificate (if passed) ──► Public verification link
            │
            ▼
   Feedback popup (stars + comment) ──► Admin
```

---

## 🔒 Security Model

- **Roles stored only in `user_roles`** (`student` / `teacher` / `admin`) and checked by `has_role()` — never from profile fields or metadata.
- **Signup grants only `student`.** Teachers are approved by an admin; admin grants go through an audited function.
- **Row‑Level Security on every table** — the database is the real gate; route guards are UX only.
- **Answer keys are never sent to students** during an attempt. Students have no read access to questions; attempts receive safe projections only.
- **Start, save, submit and scoring run in server functions / `SECURITY DEFINER` RPCs** — scores are never trusted from the browser.
- **Proctoring enforced server‑side** — the client only reports tab switches; cancellation happens in the database.
- **All admin actions are audited** in `audit_log`.
- **AI keys stay server‑side** — AI calls run only in authenticated server functions with strict JSON schemas, and AI questions are saved only after teacher approval.
- **Private file storage** with short‑lived signed URLs for study materials.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | **TanStack Start v1** (React 19, SSR, server functions) |
| Build | Vite 7, deployed to an edge runtime |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Data fetching | TanStack Query + TanStack Router loaders |
| Validation | Zod |
| Backend | Lovable Cloud — PostgreSQL, Auth, Storage, RLS |
| AI | Lovable AI Gateway (structured JSON outputs) |
| Charts | Recharts |
| Testing | Vitest + Testing Library |

---

## 🏗️ Architecture

```text
┌──────────────────────── Browser ────────────────────────┐
│ React 19 UI · TanStack Router · TanStack Query           │
│ Route guards (requireRole) — UX only                     │
└───────────────┬──────────────────────────────────────────┘
                │ bearer token
┌───────────────▼──────────── Edge server ─────────────────┐
│ createServerFn (authenticated) · AI Gateway calls        │
│ Sitemap route · SSR                                      │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────── Database ────────────────────┐
│ PostgreSQL + RLS · SECURITY DEFINER RPCs · audit_log     │
│ Auth (email, Google) · Private storage bucket            │
└──────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Name, account status (active / pending / suspended) |
| `user_roles` | Role assignments (`student`, `teacher`, `admin`) |
| `exams` | Title, subject, duration, schedule, settings (shuffle, manual review), status, `question_ids` |
| `questions` | Type (MCQ / TRUE_FALSE / SHORT_ANSWER), options, correct answer, marks, word limit |
| `exam_attempts` | Student, exam, candidate name & roll, status, score, tab switches, timestamps |
| `attempt_answers` | Each answer, marks awarded, teacher feedback |
| `feedback` | Star rating + comment per exam/attempt |
| `notifications` | Personal bell notifications |
| `announcements` | Admin announcements with audience, start & expiry |
| `study_materials` | Uploaded notes metadata (files in private storage) |
| `app_settings` | Single‑row platform settings (name, pass mark, toggles) |
| `audit_log` | Every privileged action |

Key server functions: `save_exam`, `manage_exam`, `start_exam_attempt`, `save_answers`, `submit_attempt`, `report_tab_switch`, `grade_short_answer`, `request_teacher_access`, `admin_grant_admin`, `admin_save_announcement`, `admin_activity`.

---

## 📁 Project Structure

```text
src/
├── routes/
│   ├── index.tsx              # Landing page (features, how it works, FAQ, about, footer)
│   ├── auth.tsx               # Sign in / sign up
│   ├── reset-password.tsx
│   ├── verify.$code.tsx       # Public certificate verification
│   ├── sitemap[.]xml.ts       # Router-derived sitemap
│   └── _authenticated/
│       ├── student/           # exams, attempt/$attemptId, results, performance,
│       │                      # recommendations, certificates, materials, feedback
│       ├── teacher/           # exams, ai-generator, results, monitoring, materials
│       ├── admin/             # users, exams, activity, announcements, feedback,
│       │                      # reports, settings
│       ├── profile.tsx · pending.tsx · teacher-access.tsx
├── components/                # app-shell, notification-bell, answer-box,
│                              # study-materials, about-project, logo, ui/ (shadcn)
├── lib/                       # *.functions.ts server functions, exam & attempt rules,
│                              # leave-exam, sign-in intent, sitemap
├── integrations/              # backend client (auto-generated)
└── test/                      # Vitest suites
```

---

## 🚀 Getting Started

**Prerequisites:** [Bun](https://bun.sh) (or Node.js 20+)

```bash
git clone <this-repo-url>
cd examhubb
bun install
bun run dev        # http://localhost:8080
```

Environment variables (`.env`) are provided automatically by Lovable Cloud:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

> Server secrets (AI gateway key, etc.) are never committed and live only in the server runtime.

**Scripts**

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bunx vitest run` | Run tests |

---

## 🧪 Testing

46 automated tests cover:
- Role & routing guards, sign‑in role intent, auth loading
- Exam validation (timer, schedule, question types, word limits)
- Attempt scoring rules and pass mark
- Proctoring warnings and cancellation
- Leave/quit exam flow
- About section credits and LinkedIn links

```bash
bunx vitest run
```

---

## 🎨 Design System

- **Palette:** deep navy + warm amber on off‑white
- **Typography:** *Bricolage Grotesque* (headings), *Figtree* (body)
- **Components:** shadcn/ui themed through semantic CSS tokens (`src/styles.css`)
- **Responsive:** mobile hamburger menu, adaptive dashboards with collapsible sidebar, tap feedback on buttons

---

## 📈 SEO & Performance

- Unique titles, descriptions and Open Graph tags per page
- Router‑derived `sitemap.xml` + `robots.txt`; dashboards excluded from indexing
- Verified in Google Search Console
- Hover/touch link preloading, short‑lived query caching, WebP hero image, deferred off‑screen rendering

---

## 👨‍💻 Team

**B.Tech CSBS — Software Engineering · 5th Semester · MSIT Kolkata · Session 2024–2028**

| Member | Role | LinkedIn |
|---|---|---|
| **Supratik Saha** | Team Lead | [Profile](https://www.linkedin.com/in/supratiksahass/) |
| Swastika Banik | Member | [Profile](https://www.linkedin.com/in/swastika-banik-29904728b/) |
| Suparna Das | Member | [Profile](https://www.linkedin.com/in/suparna-das-6b4bbb371/) |
| Rashi Kumari | Member | [Profile](https://www.linkedin.com/in/rashi-kumari-714046336/) |
| Swayam Roy | Member | — |

**Guided by**

| Teacher | Subject | LinkedIn |
|---|---|---|
| Prof. Amit Kumar Bagh | Software Engineering | [Profile](https://www.linkedin.com/in/amit-kumar-bag-3287b8156/) |
| Prof. Sneha Nandi | Software Engineering | — |

📧 Feedback or queries: **support-query@examhhubb.online**

---

## 📄 License

© 2026 ExamHubb. All rights reserved. Developed as an academic project for educational purposes.
