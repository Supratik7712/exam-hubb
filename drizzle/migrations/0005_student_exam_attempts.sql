CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline timestamptz NOT NULL,
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  score numeric NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 0,
  UNIQUE (exam_id, student_id)
);
GRANT SELECT ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY attempt_read ON public.exam_attempts FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid() AND public.has_role(auth.uid(),'teacher')));

CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option integer,
  answer_text text NOT NULL DEFAULT '',
  marked_for_review boolean NOT NULL DEFAULT false,
  marks_awarded numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
GRANT ALL ON public.attempt_answers TO service_role;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._finalize_attempt(_attempt_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pending int;
BEGIN
  UPDATE attempt_answers a SET marks_awarded = CASE WHEN a.selected_option = q.correct_answer THEN q.marks ELSE 0 END
    FROM questions q WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type <> 'SHORT_ANSWER';
  UPDATE attempt_answers a SET marks_awarded = 0 FROM questions q
    WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND btrim(a.answer_text) = '';
  SELECT count(*) INTO _pending FROM questions q JOIN exam_attempts t ON t.exam_id = q.exam_id
    LEFT JOIN attempt_answers a ON a.attempt_id = t.id AND a.question_id = q.id
    WHERE t.id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND a.marks_awarded IS NULL AND a.id IS NOT NULL;
  UPDATE exam_attempts SET submitted_at = coalesce(submitted_at, least(now(), deadline)),
    score = coalesce((SELECT sum(marks_awarded) FROM attempt_answers WHERE attempt_id = _attempt_id),0),
    status = CASE WHEN _pending = 0 THEN 'graded' ELSE 'submitted' END
  WHERE id = _attempt_id;
END $$;
REVOKE ALL ON FUNCTION public._finalize_attempt(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._finalize_expired(_student uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM exam_attempts WHERE student_id = _student AND status = 'in_progress' AND deadline < now() LOOP
    PERFORM _finalize_attempt(r.id);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public._finalize_expired(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_exams() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'student') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM _finalize_expired(auth.uid());
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'subject', e.subject, 'description', e.description,
    'duration_minutes', e.duration_minutes, 'start_at', e.start_at, 'end_at', e.end_at, 'total_marks', e.total_marks,
    'question_count', (SELECT count(*) FROM questions q WHERE q.exam_id = e.id),
    'attempt', (SELECT jsonb_build_object('id', t.id, 'status', t.status, 'score', t.score, 'total_marks', t.total_marks, 'submitted_at', t.submitted_at)
                FROM exam_attempts t WHERE t.exam_id = e.id AND t.student_id = auth.uid())
  ) ORDER BY e.start_at NULLS LAST) FROM exams e WHERE e.status IN ('scheduled','active')
     OR EXISTS (SELECT 1 FROM exam_attempts t WHERE t.exam_id = e.id AND t.student_id = auth.uid())), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.start_attempt(_exam_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams; _id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'student') OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'active') THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT id INTO _id FROM exam_attempts WHERE exam_id = _exam_id AND student_id = auth.uid();
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  SELECT * INTO e FROM exams WHERE id = _exam_id AND status IN ('scheduled','active');
  IF NOT FOUND THEN RAISE EXCEPTION 'Exam not available'; END IF;
  IF e.start_at IS NOT NULL AND now() < e.start_at THEN RAISE EXCEPTION 'This exam has not started yet'; END IF;
  IF e.end_at IS NOT NULL AND now() >= e.end_at THEN RAISE EXCEPTION 'This exam has ended'; END IF;
  INSERT INTO exam_attempts (exam_id, student_id, deadline, total_marks)
  VALUES (_exam_id, auth.uid(), CASE WHEN e.end_at IS NULL THEN now() + make_interval(mins => e.duration_minutes)
           ELSE least(now() + make_interval(mins => e.duration_minutes), e.end_at) END, e.total_marks)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.get_attempt(_attempt_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t exam_attempts; e exams; _done boolean; _reveal boolean;
BEGIN
  SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id AND student_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF t.status = 'in_progress' AND t.deadline < now() THEN PERFORM _finalize_attempt(t.id); SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id; END IF;
  SELECT * INTO e FROM exams WHERE id = t.exam_id;
  _done := t.status <> 'in_progress';
  _reveal := _done AND coalesce((e.settings->>'release_results')::boolean, false);
  RETURN jsonb_build_object(
    'id', t.id, 'status', t.status, 'deadline', t.deadline, 'started_at', t.started_at, 'submitted_at', t.submitted_at,
    'score', CASE WHEN _done THEN t.score END, 'total_marks', t.total_marks, 'now', now(), 'review', _reveal,
    'exam', jsonb_build_object('id', e.id, 'title', e.title, 'subject', e.subject, 'description', e.description, 'duration_minutes', e.duration_minutes),
    'questions', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', q.id, 'question_text', q.question_text, 'question_type', q.question_type, 'options', q.options,
      'marks', q.marks, 'word_limit', q.word_limit,
      'selected_option', a.selected_option, 'answer_text', coalesce(a.answer_text,''), 'marked_for_review', coalesce(a.marked_for_review,false),
      'marks_awarded', CASE WHEN _done THEN a.marks_awarded END,
      'correct_answer', CASE WHEN _reveal THEN q.correct_answer END,
      'explanation', CASE WHEN _reveal THEN q.explanation END
    ) ORDER BY q.created_at, q.id) FROM questions q LEFT JOIN attempt_answers a ON a.attempt_id = t.id AND a.question_id = q.id
      WHERE q.exam_id = e.id), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.save_answer(_attempt_id uuid, _question_id uuid, _selected integer, _text text, _review boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t exam_attempts;
BEGIN
  SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id AND student_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF t.status <> 'in_progress' OR now() > t.deadline + interval '15 seconds' THEN RAISE EXCEPTION 'Time is up — answers can no longer be changed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = _question_id AND exam_id = t.exam_id) THEN RAISE EXCEPTION 'Question not in this exam'; END IF;
  IF length(coalesce(_text,'')) > 20000 THEN RAISE EXCEPTION 'Answer too long'; END IF;
  INSERT INTO attempt_answers (attempt_id, question_id, selected_option, answer_text, marked_for_review, updated_at)
  VALUES (_attempt_id, _question_id, _selected, coalesce(_text,''), coalesce(_review,false), now())
  ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_option = EXCLUDED.selected_option,
    answer_text = EXCLUDED.answer_text, marked_for_review = EXCLUDED.marked_for_review, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.submit_attempt(_attempt_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt_id AND student_id = auth.uid()) THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt_id AND status = 'in_progress') THEN PERFORM _finalize_attempt(_attempt_id); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.staff_exam_attempts(_exam_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM exams WHERE id = _exam_id AND teacher_id = auth.uid() AND has_role(auth.uid(),'teacher'))) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'status', CASE WHEN t.status='in_progress' AND t.deadline < now() THEN 'submitted' ELSE t.status END,
    'score', t.score, 'total_marks', t.total_marks, 'submitted_at', t.submitted_at, 'started_at', t.started_at,
    'student_name', coalesce(nullif(p.full_name,''), p.email, 'Student'), 'student_email', p.email) ORDER BY t.started_at DESC)
    FROM exam_attempts t LEFT JOIN profiles p ON p.id = t.student_id WHERE t.exam_id = _exam_id), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.staff_attempt_detail(_attempt_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t exam_attempts;
BEGIN
  SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id;
  IF NOT FOUND OR NOT (has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM exams WHERE id = t.exam_id AND teacher_id = auth.uid() AND has_role(auth.uid(),'teacher'))) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  IF t.status = 'in_progress' AND t.deadline < now() THEN PERFORM _finalize_attempt(t.id); SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id; END IF;
  RETURN jsonb_build_object('id', t.id, 'status', t.status, 'score', t.score, 'total_marks', t.total_marks,
    'questions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', q.id, 'answer_id', a.id, 'question_text', q.question_text, 'question_type', q.question_type,
      'options', q.options, 'correct_answer', q.correct_answer, 'marks', q.marks, 'word_limit', q.word_limit,
      'selected_option', a.selected_option, 'answer_text', coalesce(a.answer_text,''), 'marks_awarded', a.marks_awarded) ORDER BY q.created_at, q.id)
      FROM questions q LEFT JOIN attempt_answers a ON a.attempt_id = t.id AND a.question_id = q.id WHERE q.exam_id = t.exam_id), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.grade_short_answer(_answer_id uuid, _marks numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempt uuid; _max numeric; _exam uuid;
BEGIN
  SELECT a.attempt_id, q.marks, q.exam_id INTO _attempt, _max, _exam FROM attempt_answers a JOIN questions q ON q.id = a.question_id
    WHERE a.id = _answer_id AND q.question_type = 'SHORT_ANSWER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM exams WHERE id = _exam AND teacher_id = auth.uid() AND has_role(auth.uid(),'teacher')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt AND status = 'in_progress' AND deadline >= now()) THEN RAISE EXCEPTION 'Attempt still in progress'; END IF;
  IF _marks < 0 OR _marks > _max THEN RAISE EXCEPTION 'Marks must be between 0 and %', _max; END IF;
  UPDATE attempt_answers SET marks_awarded = _marks WHERE id = _answer_id;
  PERFORM _finalize_attempt(_attempt);
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), 'short_answer_graded', _attempt, jsonb_build_object('answer_id', _answer_id, 'marks', _marks));
END $$;

REVOKE ALL ON FUNCTION public.student_exams(), public.start_attempt(uuid), public.get_attempt(uuid), public.save_answer(uuid,uuid,integer,text,boolean),
  public.submit_attempt(uuid), public.staff_exam_attempts(uuid), public.staff_attempt_detail(uuid), public.grade_short_answer(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_exams(), public.start_attempt(uuid), public.get_attempt(uuid), public.save_answer(uuid,uuid,integer,text,boolean),
  public.submit_attempt(uuid), public.staff_exam_attempts(uuid), public.staff_attempt_detail(uuid), public.grade_short_answer(uuid,numeric) TO authenticated;