CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL DEFAULT 'General' CHECK (category IN ('General','Exam','Bug','Suggestion')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 3000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_own_read ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY feedback_own_insert ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_note = '');

CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name text NOT NULL DEFAULT 'ExamHub',
  pass_percent integer NOT NULL DEFAULT 40 CHECK (pass_percent BETWEEN 1 AND 100),
  announcement text NOT NULL DEFAULT '',
  allow_teacher_requests boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id) VALUES (1);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.admin_update_feedback(_id uuid, _status text, _note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _status NOT IN ('open','reviewed','resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE feedback SET status = _status, admin_note = left(coalesce(_note,''), 2000) WHERE id = _id;
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), 'feedback_updated', _id, jsonb_build_object('status', _status));
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_settings(_name text, _pass integer, _announcement text, _allow boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _pass < 1 OR _pass > 100 THEN RAISE EXCEPTION 'Pass mark must be 1-100'; END IF;
  UPDATE app_settings SET platform_name = left(btrim(_name),80), pass_percent = _pass, announcement = left(coalesce(_announcement,''),500),
    allow_teacher_requests = _allow, updated_at = now() WHERE id = 1;
  INSERT INTO audit_log (actor_id, action, metadata) VALUES (auth.uid(), 'settings_updated', jsonb_build_object('pass_percent', _pass, 'allow_teacher_requests', _allow));
END $$;

CREATE OR REPLACE FUNCTION public.admin_report() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pass int;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT pass_percent INTO _pass FROM app_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'exams', (SELECT count(*) FROM exams),
    'published', (SELECT count(*) FROM exams WHERE status <> 'draft'),
    'attempts', (SELECT count(*) FROM exam_attempts),
    'graded', (SELECT count(*) FROM exam_attempts WHERE status = 'graded'),
    'avg_percent', (SELECT round(avg(CASE WHEN total_marks > 0 THEN score*100/total_marks END)) FROM exam_attempts WHERE status <> 'in_progress'),
    'pass_rate', (SELECT round(100.0 * count(*) FILTER (WHERE total_marks > 0 AND score*100/total_marks >= _pass) / nullif(count(*),0)) FROM exam_attempts WHERE status = 'graded'),
    'open_feedback', (SELECT count(*) FROM feedback WHERE status = 'open'),
    'per_exam', coalesce((SELECT jsonb_agg(x ORDER BY x->>'title') FROM (SELECT jsonb_build_object('id', e.id, 'title', e.title, 'subject', e.subject,
        'teacher', coalesce(nullif(p.full_name,''), p.email),
        'attempts', count(t.id), 'avg_percent', round(avg(CASE WHEN t.status <> 'in_progress' AND t.total_marks > 0 THEN t.score*100/t.total_marks END)),
        'passed', count(*) FILTER (WHERE t.status = 'graded' AND t.total_marks > 0 AND t.score*100/t.total_marks >= _pass)) x
      FROM exams e LEFT JOIN exam_attempts t ON t.exam_id = e.id LEFT JOIN profiles p ON p.id = e.teacher_id
      WHERE e.status <> 'draft' GROUP BY e.id, p.full_name, p.email) s), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.teacher_live_attempts() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'teacher') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'exam_title', e.title, 'student_name', coalesce(nullif(p.full_name,''), p.email, 'Student'),
    'started_at', t.started_at, 'deadline', t.deadline,
    'answered', (SELECT count(*) FROM attempt_answers a WHERE a.attempt_id = t.id AND (a.selected_option IS NOT NULL OR btrim(a.answer_text) <> '')),
    'total', (SELECT count(*) FROM questions q WHERE q.exam_id = e.id),
    'last_activity', (SELECT max(updated_at) FROM attempt_answers a WHERE a.attempt_id = t.id)) ORDER BY t.deadline)
    FROM exam_attempts t JOIN exams e ON e.id = t.exam_id LEFT JOIN profiles p ON p.id = t.student_id
    WHERE e.teacher_id = auth.uid() AND t.status = 'in_progress' AND t.deadline >= now()), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.student_certificates() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pass int;
BEGIN
  IF NOT has_role(auth.uid(),'student') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT pass_percent INTO _pass FROM app_settings WHERE id = 1;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'code', upper(substr(replace(t.id::text,'-',''),1,12)), 'exam_title', e.title, 'subject', e.subject,
    'score', t.score, 'total_marks', t.total_marks, 'issued_at', t.submitted_at, 'student_name', coalesce(nullif(p.full_name,''), p.email)) ORDER BY t.submitted_at DESC)
    FROM exam_attempts t JOIN exams e ON e.id = t.exam_id LEFT JOIN profiles p ON p.id = t.student_id
    WHERE t.student_id = auth.uid() AND t.status = 'graded' AND t.total_marks > 0 AND t.score*100/t.total_marks >= _pass), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pass int; r jsonb;
BEGIN
  IF length(coalesce(_code,'')) <> 12 THEN RETURN NULL; END IF;
  SELECT pass_percent INTO _pass FROM app_settings WHERE id = 1;
  SELECT jsonb_build_object('exam_title', e.title, 'subject', e.subject, 'issued_at', t.submitted_at, 'student_name', coalesce(nullif(p.full_name,''), 'ExamHub student'),
    'percent', round(t.score*100/t.total_marks)) INTO r
  FROM exam_attempts t JOIN exams e ON e.id = t.exam_id LEFT JOIN profiles p ON p.id = t.student_id
  WHERE upper(substr(replace(t.id::text,'-',''),1,12)) = upper(_code) AND t.status = 'graded' AND t.total_marks > 0 AND t.score*100/t.total_marks >= _pass LIMIT 1;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.admin_update_feedback(uuid,text,text), public.admin_update_settings(text,integer,text,boolean), public.admin_report(), public.teacher_live_attempts(), public.student_certificates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_feedback(uuid,text,text), public.admin_update_settings(text,integer,text,boolean), public.admin_report(), public.teacher_live_attempts(), public.student_certificates() TO authenticated;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;