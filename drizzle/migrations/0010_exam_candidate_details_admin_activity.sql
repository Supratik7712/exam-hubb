ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS candidate_name text NOT NULL DEFAULT '';
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS roll_number text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.start_exam_attempt(_exam_id uuid, _name text, _roll text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF length(trim(coalesce(_name,''))) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'Please enter your full name'; END IF;
  IF length(coalesce(_roll,'')) > 60 THEN RAISE EXCEPTION 'Roll number is too long'; END IF;
  _id := public.start_attempt(_exam_id);
  UPDATE exam_attempts SET candidate_name = trim(_name), roll_number = trim(coalesce(_roll,''))
   WHERE id = _id AND student_id = auth.uid() AND candidate_name = '';
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.start_exam_attempt(uuid,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_exam_attempt(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activity() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN jsonb_build_object(
    'attempts', COALESCE((SELECT jsonb_agg(x ORDER BY x.started_at DESC) FROM (
      SELECT a.id, a.started_at, a.submitted_at, a.status, a.score, a.total_marks, a.tab_switches,
             a.candidate_name, a.roll_number, p.full_name AS account_name, p.email,
             e.title AS exam_title, e.subject, t.full_name AS teacher
      FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
      LEFT JOIN profiles p ON p.id = a.student_id LEFT JOIN profiles t ON t.id = e.teacher_id
      ORDER BY a.started_at DESC LIMIT 1000) x), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(y ORDER BY y.at DESC) FROM (
      SELECT * FROM (
        SELECT created_at AS at, 'account' AS kind, 'New account: ' || coalesce(nullif(full_name,''), email, 'user') AS text FROM profiles
        UNION ALL SELECT e.created_at, 'exam', 'Exam created: ' || e.title || ' by ' || coalesce(p.full_name,'teacher') FROM exams e LEFT JOIN profiles p ON p.id=e.teacher_id
        UNION ALL SELECT a.started_at, 'attempt', coalesce(nullif(a.candidate_name,''), p.full_name, 'Student') || ' started ' || e.title FROM exam_attempts a JOIN exams e ON e.id=a.exam_id LEFT JOIN profiles p ON p.id=a.student_id
        UNION ALL SELECT a.submitted_at, CASE WHEN a.status='cancelled' THEN 'cancelled' ELSE 'submit' END,
          coalesce(nullif(a.candidate_name,''), p.full_name, 'Student') || CASE WHEN a.status='cancelled' THEN ' was cancelled in ' ELSE ' submitted ' END || e.title || ' (' || a.score || '/' || a.total_marks || ')'
          FROM exam_attempts a JOIN exams e ON e.id=a.exam_id LEFT JOIN profiles p ON p.id=a.student_id WHERE a.submitted_at IS NOT NULL
        UNION ALL SELECT f.created_at, 'feedback', coalesce(p.full_name,'User') || ' sent feedback (' || f.category || ')' FROM feedback f LEFT JOIN profiles p ON p.id=f.user_id
        UNION ALL SELECT m.created_at, 'material', 'Study material uploaded: ' || m.title FROM study_materials m
        UNION ALL SELECT l.created_at, 'admin', coalesce(p.full_name,'Admin') || ': ' || replace(l.action,'_',' ') FROM audit_log l LEFT JOIN profiles p ON p.id=l.actor_id
      ) u ORDER BY at DESC LIMIT 300) y), '[]'::jsonb)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_activity() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_activity() TO authenticated;