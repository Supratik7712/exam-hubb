ALTER TABLE public.exam_attempts ADD COLUMN tab_switches integer NOT NULL DEFAULT 0;
ALTER TABLE public.exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_status_check;
ALTER TABLE public.exam_attempts ADD CONSTRAINT exam_attempts_status_check CHECK (status IN ('in_progress','submitted','graded','cancelled'));
ALTER TABLE public.feedback ADD COLUMN attempt_id uuid;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own_read ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_notifications_read() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.report_tab_switch(_attempt_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t exam_attempts; e exams; _name text; _n int;
BEGIN
  SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id AND student_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF t.status <> 'in_progress' THEN RETURN jsonb_build_object('count', t.tab_switches, 'cancelled', t.status = 'cancelled'); END IF;
  _n := t.tab_switches + 1;
  SELECT * INTO e FROM exams WHERE id = t.exam_id;
  SELECT coalesce(nullif(full_name,''), email, 'A student') INTO _name FROM profiles WHERE id = auth.uid();
  IF _n > 3 THEN
    UPDATE exam_attempts SET tab_switches = _n, status = 'cancelled', score = 0, submitted_at = now() WHERE id = _attempt_id;
    INSERT INTO notifications (user_id, title, body)
      SELECT x.uid, 'Exam cancelled for tab switching', _name || '''s attempt at "' || e.title || '" was cancelled after ' || _n || ' tab switches.'
      FROM (SELECT e.teacher_id AS uid UNION SELECT user_id FROM user_roles WHERE role = 'admin') x;
    INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), 'attempt_cancelled_tab_switch', _attempt_id, jsonb_build_object('switches', _n));
    RETURN jsonb_build_object('count', _n, 'cancelled', true);
  END IF;
  UPDATE exam_attempts SET tab_switches = _n WHERE id = _attempt_id;
  INSERT INTO notifications (user_id, title, body)
    SELECT x.uid, 'Tab switch warning ' || _n || ' of 3', _name || ' left the exam window during "' || e.title || '".'
    FROM (SELECT e.teacher_id AS uid UNION SELECT user_id FROM user_roles WHERE role = 'admin') x;
  RETURN jsonb_build_object('count', _n, 'cancelled', false);
END $$;

CREATE OR REPLACE FUNCTION public.grade_short_answer(_answer_id uuid, _marks numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempt uuid; _max numeric; _exam uuid;
BEGIN
  SELECT a.attempt_id, q.marks, q.exam_id INTO _attempt, _max, _exam FROM attempt_answers a JOIN questions q ON q.id = a.question_id
    WHERE a.id = _answer_id AND q.question_type = 'SHORT_ANSWER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM exams WHERE id = _exam AND teacher_id = auth.uid() AND has_role(auth.uid(),'teacher')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt AND status = 'cancelled') THEN RAISE EXCEPTION 'This attempt was cancelled'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt AND status = 'in_progress' AND deadline >= now()) THEN RAISE EXCEPTION 'Attempt still in progress'; END IF;
  IF _marks < 0 OR _marks > _max THEN RAISE EXCEPTION 'Marks must be between 0 and %', _max; END IF;
  UPDATE attempt_answers SET marks_awarded = _marks WHERE id = _answer_id;
  PERFORM _finalize_attempt(_attempt);
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), 'short_answer_graded', _attempt, jsonb_build_object('answer_id', _answer_id, 'marks', _marks));
END $$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(), public.report_tab_switch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(), public.report_tab_switch(uuid) TO authenticated;

CREATE TABLE public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY materials_read ON public.study_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.account_status = 'active'));
CREATE POLICY materials_insert ON public.study_materials FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(),'teacher') AND file_path LIKE auth.uid()::text || '/%');
CREATE POLICY materials_delete ON public.study_materials FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() AND public.has_role(auth.uid(),'teacher'));

CREATE POLICY study_files_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study-materials' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status = 'active'));
CREATE POLICY study_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study-materials' AND public.has_role(auth.uid(),'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY study_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-materials' AND public.has_role(auth.uid(),'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);