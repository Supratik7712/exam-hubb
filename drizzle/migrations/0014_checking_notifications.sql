CREATE OR REPLACE FUNCTION public._finalize_attempt(_attempt_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pending int; _open boolean; _prev text; t exam_attempts; e exams; _pass int; _who text;
BEGIN
  SELECT status INTO _prev FROM exam_attempts WHERE id = _attempt_id;
  _open := _prev = 'in_progress';
  UPDATE attempt_answers a SET marks_awarded = CASE WHEN a.selected_option = q.correct_answer THEN q.marks ELSE 0 END
    FROM questions q WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type <> 'SHORT_ANSWER'
      AND (coalesce(_open, false) OR a.marks_awarded IS NULL);
  UPDATE attempt_answers a SET marks_awarded = 0 FROM questions q
    WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND btrim(a.answer_text) = '' AND a.marks_awarded IS NULL;
  SELECT count(*) INTO _pending FROM questions q JOIN exam_attempts t2 ON t2.exam_id = q.exam_id
    LEFT JOIN attempt_answers a ON a.attempt_id = t2.id AND a.question_id = q.id
    WHERE t2.id = _attempt_id AND q.question_type = 'SHORT_ANSWER' AND a.marks_awarded IS NULL AND a.id IS NOT NULL;
  UPDATE exam_attempts SET submitted_at = coalesce(submitted_at, least(now(), deadline)),
    score = coalesce((SELECT sum(marks_awarded) FROM attempt_answers WHERE attempt_id = _attempt_id),0),
    status = CASE WHEN status = 'cancelled' THEN status WHEN _pending = 0 THEN 'graded' ELSE 'submitted' END
  WHERE id = _attempt_id;

  SELECT * INTO t FROM exam_attempts WHERE id = _attempt_id;
  SELECT * INTO e FROM exams WHERE id = t.exam_id;
  IF _prev = 'in_progress' AND (t.status = 'submitted' OR (t.status = 'graded' AND coalesce((e.settings->>'manual_review')::boolean, false))) THEN
    SELECT coalesce(nullif(t.candidate_name,''), nullif(p.full_name,''), p.email, 'A student') INTO _who FROM profiles p WHERE p.id = t.student_id;
    INSERT INTO notifications (user_id, title, body) VALUES (e.teacher_id,
      CASE WHEN t.status = 'submitted' THEN 'Answer sheet waiting to be checked' ELSE 'New answer sheet to review' END,
      coalesce(_who, 'A student') || ' submitted "' || e.title || '". Open Results to ' || CASE WHEN t.status = 'submitted' THEN 'mark it.' ELSE 're-check it if needed.' END);
  END IF;
  IF _prev = 'submitted' AND t.status = 'graded' THEN
    SELECT pass_percent INTO _pass FROM app_settings WHERE id = 1;
    INSERT INTO notifications (user_id, title, body) VALUES (t.student_id, 'Your paper has been checked',
      'Result for "' || e.title || '": ' || t.score || ' / ' || t.total_marks || '. ' ||
      CASE WHEN t.total_marks > 0 AND t.score * 100 >= coalesce(_pass, 40) * t.total_marks THEN 'You passed — your certificate is ready in Certificates.' ELSE 'See Results for details.' END);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._finalize_attempt(uuid) FROM PUBLIC, anon, authenticated;