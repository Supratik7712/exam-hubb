CREATE OR REPLACE FUNCTION public._finalize_attempt(_attempt_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pending int; _open boolean;
BEGIN
  SELECT status = 'in_progress' INTO _open FROM exam_attempts WHERE id = _attempt_id;
  UPDATE attempt_answers a SET marks_awarded = CASE WHEN a.selected_option = q.correct_answer THEN q.marks ELSE 0 END
    FROM questions q WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type <> 'SHORT_ANSWER'
      AND (coalesce(_open, false) OR a.marks_awarded IS NULL);
  UPDATE attempt_answers a SET marks_awarded = 0 FROM questions q
    WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND btrim(a.answer_text) = '' AND a.marks_awarded IS NULL;
  SELECT count(*) INTO _pending FROM questions q JOIN exam_attempts t ON t.exam_id = q.exam_id
    LEFT JOIN attempt_answers a ON a.attempt_id = t.id AND a.question_id = q.id
    WHERE t.id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND a.marks_awarded IS NULL AND a.id IS NOT NULL;
  UPDATE exam_attempts SET submitted_at = coalesce(submitted_at, least(now(), deadline)),
    score = coalesce((SELECT sum(marks_awarded) FROM attempt_answers WHERE attempt_id = _attempt_id),0),
    status = CASE WHEN status = 'cancelled' THEN status WHEN _pending = 0 THEN 'graded' ELSE 'submitted' END
  WHERE id = _attempt_id;
END $$;
REVOKE ALL ON FUNCTION public._finalize_attempt(uuid) FROM PUBLIC, anon, authenticated;