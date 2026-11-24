CREATE OR REPLACE FUNCTION public.grade_short_answer(_answer_id uuid, _marks numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempt uuid; _max numeric; _exam uuid; _type text; _manual boolean;
BEGIN
  SELECT a.attempt_id, q.marks, q.exam_id, q.question_type INTO _attempt, _max, _exam, _type FROM attempt_answers a JOIN questions q ON q.id = a.question_id
    WHERE a.id = _answer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer not found'; END IF;
  SELECT coalesce((settings->>'manual_review')::boolean, false) INTO _manual FROM exams WHERE id = _exam AND teacher_id = auth.uid() AND has_role(auth.uid(),'teacher');
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _type <> 'SHORT_ANSWER' AND NOT _manual THEN RAISE EXCEPTION 'Manual checking is off for this exam'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt AND status = 'cancelled') THEN RAISE EXCEPTION 'This attempt was cancelled'; END IF;
  IF EXISTS (SELECT 1 FROM exam_attempts WHERE id = _attempt AND status = 'in_progress' AND deadline >= now()) THEN RAISE EXCEPTION 'Attempt still in progress'; END IF;
  IF _marks < 0 OR _marks > _max THEN RAISE EXCEPTION 'Marks must be between 0 and %', _max; END IF;
  UPDATE attempt_answers SET marks_awarded = _marks WHERE id = _answer_id;
  PERFORM _finalize_attempt(_attempt);
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), CASE WHEN _type = 'SHORT_ANSWER' THEN 'short_answer_graded' ELSE 'answer_rechecked' END, _attempt, jsonb_build_object('answer_id', _answer_id, 'marks', _marks));
END $$;