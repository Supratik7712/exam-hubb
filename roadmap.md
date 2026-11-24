# ExamHubb roadmap

- [x] Correct returning-session and Google/Lovable sign-in redirects so teacher selection is not reset to Student (signed-in teacher return and refresh verified; external provider popup not exercised)

- [x] Restore teacher dashboard access for the project owner and allow switching between assigned workspaces (dashboard, question bank, exam editor and mobile access verified)
- [x] Student-only accounts choosing Teacher get a "Request teacher access" page; admins approve in Users → Pending (request, approval and teacher dashboard opening verified)

- [x] Phase 1 – Foundation: design system, landing, app shell, backend
- [x] Phase 2 – Auth: sign up/in (email, Google, Lovable), reset password, roles, teacher approval, protected dashboards, admin user management
- [x] Phase 3 – Teacher exam setup: exams CRUD, question bank, schedule/publish, teacher overview and corresponding admin exam oversight
- [x] Grant supratiksaha2022s@gmail.com initial admin access (confirmed account; verified through admin pages)
- [x] Reduce slow loading and preview stalls: remove duplicate user checks, defer auth callback refetches, cache workspace reads and parallelize requests; signed-in navigation and sign-out verified
- [x] Enable existing admins to grant admin access to registered teammates
- [x] Phase 4 – Student exam flow: instructions, timed attempt, autosave, palette, auto-submit
- [x] Phase 5 – Server evaluation & results (student + teacher views, short-answer marking)
- [x] Phase 6 – Admin: feedback review, reports (CSV), settings (pass mark, announcement)
- [x] Phase 7 – Student performance charts, feedback, teacher live monitoring
- [x] Phase 8 – AI question generation (teacher approval) + AI study recommendations
- [x] Phase 9 – Certificates (pass mark, printable, public verification code)
- [ ] Phase 10 – QA, demo data, docs
- [x] Short answer questions with word limit + sample DSA/aptitude paper
- [x] Homepage FAQ section covering accounts, roles, question types and answer security
- [x] Proctored full-screen exam, copy blocking, 3 tab-switch warnings then cancel + teacher/admin notifications
- [x] Study materials (teacher upload PDF/Word, student download) replace the question bank menu
- [x] View certificate button on results, after-exam star feedback popup, announcements under the bell
- [x] LinkedIn buttons in the About section for the four members who have profiles (Supratik, Swastika, Suparna, Rashi) — Swayam and both teachers stay without one
