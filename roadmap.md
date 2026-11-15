# ExamHub roadmap

- [x] Correct returning-session and Google/Lovable sign-in redirects so teacher selection is not reset to Student (signed-in teacher return and refresh verified; external provider popup not exercised)

- [x] Restore teacher dashboard access for the project owner and allow switching between assigned workspaces (dashboard, question bank, exam editor and mobile access verified)
- [x] Student-only accounts choosing Teacher get a "Request teacher access" page; admins approve in Users → Pending (request, approval and teacher dashboard opening verified)

- [x] Phase 1 – Foundation: design system, landing, app shell, backend
- [x] Phase 2 – Auth: sign up/in (email, Google, Lovable), reset password, roles, teacher approval, protected dashboards, admin user management
- [x] Phase 3 – Teacher exam setup: exams CRUD, question bank, schedule/publish, teacher overview and corresponding admin exam oversight
- [x] Grant supratiksaha2022s@gmail.com initial admin access (confirmed account; verified through admin pages)
- [x] Reduce slow loading and preview stalls: remove duplicate user checks, defer auth callback refetches, cache workspace reads and parallelize requests; signed-in navigation and sign-out verified
- [x] Enable existing admins to grant admin access to registered teammates
- [ ] Phase 4 – Student exam flow: instructions, timed attempt, autosave, palette, auto-submit
- [ ] Phase 5 – Server evaluation & results (student + teacher views)
- [ ] Phase 6 – Admin: all exams, reports, feedback review, settings
- [ ] Phase 7 – Analytics, feedback, activity logs
- [ ] Phase 8 – AI question generation (teacher approval) + AI recommendations
- [ ] Phase 9 – Certificates (eligibility + PDF + verification code)
- [ ] Phase 10 – QA, demo data, docs
