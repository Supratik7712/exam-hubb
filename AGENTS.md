<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Roles live only in `public.user_roles` (enum student/teacher/admin), checked via `has_role()`; never derive privileges from profile fields or user metadata — prevents privilege escalation.
- Signup trigger grants only `student`; teachers start `pending` with no role until approved; bootstrap admins are manually provisioned and subsequent grants use the audited `admin_grant_admin` RPC — public signup never creates elevated roles.
- Admin mutations go through SECURITY DEFINER RPCs that check `has_role(auth.uid(),'admin')` and write `audit_log` — keeps authorization server-side and auditable.
- Role dashboards live at `/_authenticated/{student,teacher,admin}` with a `requireRole` beforeLoad; this is UX only, RLS is the real gate.
- Sign-in role selection and workspace switching may target only roles assigned in user_roles; choosing Teacher without the role opens /teacher-access (request via audited `request_teacher_access` RPC, admin approves), other missing roles fall back to the primary role — navigation must never grant privileges.
- Preserve explicit OAuth role intent once in sessionStorage and navigate after provider completion; returning sessions without intent use the primary role, not the form default — prevents student redirects and iframe sign-in stalls.
- Answer keys must never be readable by students during attempts; exam start/submit/evaluation run in server functions — scores are never trusted from the client.
- Staff exam reads use authenticated server functions; exam writes use transactional role-checked RPCs, and bank questions are copied into exams — published exams cannot change when bank questions are edited.
- Student roles have no question read policy; future attempt functions must return safe projections without answer keys — prevents early answer disclosure.
- Schedule auth-triggered cache work outside the auth callback and ignore repeated same-user sign-in events — avoids auth-lock deadlocks and focus-driven reloads.
- Use short-lived Query caches for workspace reads and parallel independent server reads — reduces repeated network round trips without changing server authorization.
- Exam attempts start, save, submit and score only through SECURITY DEFINER RPCs called from server functions; students never get correct answers until submitted and the exam releases results — keeps answer keys and scoring server-side.
- AI calls run only in authenticated server functions through the Lovable AI Gateway with strict JSON schemas; AI-generated questions are never saved until a teacher approves each one — keeps keys server-side and humans in control.
- Pass mark lives in the single-row app_settings table (admin-only RPC updates) and is used by results, certificates and reports — one source of truth.
- Explicit exam leaving saves pending answers and finalizes the attempt through the existing submission RPC before navigation — prevents abandoned attempts from remaining resumable.
- Exam proctoring (tab-switch count, cancellation, staff notifications) is enforced by the `report_tab_switch` RPC; the client only reports events — cancellation can't be bypassed from the browser.
- Study materials live in the private `study-materials` bucket under `<teacher_uid>/` with a `study_materials` row; reads use short-lived signed URLs for active users only.
- Admin announcements and personal notifications render only in the header bell popover, not as page banners.

- Sitemap is router-derived (src/lib/sitemap.ts + src/routes/sitemap[.]xml.ts); every route must declare staticData.sitemap — keeps the sitemap in sync with public pages.
