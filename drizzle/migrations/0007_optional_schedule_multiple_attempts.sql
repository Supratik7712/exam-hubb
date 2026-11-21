ALTER TABLE public.exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_exam_id_student_id_key;
CREATE INDEX IF NOT EXISTS exam_attempts_exam_student_idx ON public.exam_attempts(exam_id, student_id, started_at DESC);

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
                FROM exam_attempts t WHERE t.exam_id = e.id AND t.student_id = auth.uid() ORDER BY t.started_at DESC LIMIT 1)
  ) ORDER BY e.start_at NULLS LAST) FROM exams e WHERE e.status IN ('scheduled','active')
     OR EXISTS (SELECT 1 FROM exam_attempts t WHERE t.exam_id = e.id AND t.student_id = auth.uid())), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.start_attempt(_exam_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams; _id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'student') OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'active') THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM _finalize_expired(auth.uid());
  SELECT id INTO _id FROM exam_attempts WHERE exam_id = _exam_id AND student_id = auth.uid() AND status = 'in_progress' LIMIT 1;
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

CREATE OR REPLACE FUNCTION public.save_exam(_exam jsonb, _question_ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE eid uuid; st text; n integer; sa timestamptz; ea timestamptz; BEGIN
IF NOT public.has_role(auth.uid(),'teacher') OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_status='active') THEN RAISE EXCEPTION 'Not authorized'; END IF;
eid:=NULLIF(_exam->>'id','')::uuid; st:=COALESCE(_exam->>'status','draft');
IF st NOT IN ('draft','scheduled','active') THEN RAISE EXCEPTION 'Invalid status'; END IF;
IF length(trim(COALESCE(_exam->>'title','')))=0 OR length(trim(COALESCE(_exam->>'subject','')))=0 THEN RAISE EXCEPTION 'Title and subject required'; END IF;
IF COALESCE((_exam->>'duration_minutes')::integer,0) < 1 OR (_exam->>'duration_minutes')::integer > 1440 THEN RAISE EXCEPTION 'Timer must be between 1 and 1440 minutes'; END IF;
sa:=NULLIF(_exam->>'start_at','')::timestamptz; ea:=NULLIF(_exam->>'end_at','')::timestamptz;
IF sa IS NOT NULL AND ea IS NOT NULL AND ea<=sa THEN RAISE EXCEPTION 'End time must follow start time'; END IF;
IF eid IS NOT NULL THEN PERFORM 1 FROM public.exams WHERE id=eid AND teacher_id=auth.uid() AND status='draft' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Only your drafts can be edited'; END IF; END IF;
SELECT count(*) INTO n FROM public.questions WHERE id=ANY(_question_ids) AND created_by=auth.uid() AND exam_id IS NULL AND approval_status='approved';
IF n<>cardinality(_question_ids) THEN RAISE EXCEPTION 'Select approved questions from your bank'; END IF;
IF st<>'draft' THEN IF n=0 THEN RAISE EXCEPTION 'Add questions before publishing'; END IF; IF ea IS NOT NULL AND ea<=now() THEN RAISE EXCEPTION 'End time must be in the future'; END IF; st:=CASE WHEN sa IS NOT NULL AND sa>now() THEN 'scheduled' ELSE 'active' END; END IF;
IF eid IS NULL THEN INSERT INTO public.exams(teacher_id,title,subject) VALUES(auth.uid(),_exam->>'title',_exam->>'subject') RETURNING id INTO eid; END IF;
UPDATE public.exams SET title=trim(_exam->>'title'),subject=trim(_exam->>'subject'),description=COALESCE(_exam->>'description',''),duration_minutes=(_exam->>'duration_minutes')::integer,start_at=sa,end_at=ea,status=st,settings=COALESCE(_exam->'settings','{}'::jsonb),updated_at=now() WHERE id=eid;
DELETE FROM public.questions WHERE exam_id=eid;
INSERT INTO public.questions(exam_id,created_by,topic,question_text,question_type,options,correct_answer,marks,difficulty,explanation,word_limit,model_answer) SELECT eid,auth.uid(),topic,question_text,question_type,options,correct_answer,marks,difficulty,explanation,word_limit,model_answer FROM public.questions WHERE id=ANY(_question_ids) AND exam_id IS NULL;
UPDATE public.exams SET total_marks=(SELECT COALESCE(sum(marks),0) FROM public.questions WHERE exam_id=eid) WHERE id=eid; RETURN eid; END $$;