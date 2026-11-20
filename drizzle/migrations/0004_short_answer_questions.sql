ALTER TABLE public.questions ADD COLUMN word_limit integer CHECK (word_limit IS NULL OR word_limit BETWEEN 10 AND 2000);
ALTER TABLE public.questions ADD COLUMN model_answer text NOT NULL DEFAULT '';
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('MCQ','TRUE_FALSE','SHORT_ANSWER'));
CREATE OR REPLACE FUNCTION public.validate_question() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF length(trim(NEW.question_text))=0 OR jsonb_typeof(NEW.options)<>'array' THEN RAISE EXCEPTION 'Invalid question'; END IF;
IF NEW.question_type='SHORT_ANSWER' THEN
  IF NEW.word_limit IS NULL OR jsonb_array_length(NEW.options)<>0 THEN RAISE EXCEPTION 'Short answer questions need a word limit and no options'; END IF;
  NEW.correct_answer:=-1;
ELSE
  IF jsonb_array_length(NEW.options)<2 OR (NEW.question_type='TRUE_FALSE' AND NEW.options<>'["True", "False"]'::jsonb) OR NEW.correct_answer<0 OR NEW.correct_answer>=jsonb_array_length(NEW.options) THEN RAISE EXCEPTION 'Invalid question or answer options'; END IF;
  NEW.word_limit:=NULL;
END IF;
RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.save_exam(_exam jsonb, _question_ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE eid uuid; st text; n integer; BEGIN
IF NOT public.has_role(auth.uid(),'teacher') OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_status='active') THEN RAISE EXCEPTION 'Not authorized'; END IF;
eid:=NULLIF(_exam->>'id','')::uuid; st:=COALESCE(_exam->>'status','draft');
IF st NOT IN ('draft','scheduled','active') THEN RAISE EXCEPTION 'Invalid status'; END IF;
IF length(trim(COALESCE(_exam->>'title','')))=0 OR length(trim(COALESCE(_exam->>'subject','')))=0 THEN RAISE EXCEPTION 'Title and subject required'; END IF;
IF eid IS NOT NULL THEN PERFORM 1 FROM public.exams WHERE id=eid AND teacher_id=auth.uid() AND status='draft' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Only your drafts can be edited'; END IF; END IF;
SELECT count(*) INTO n FROM public.questions WHERE id=ANY(_question_ids) AND created_by=auth.uid() AND exam_id IS NULL AND approval_status='approved';
IF n<>cardinality(_question_ids) THEN RAISE EXCEPTION 'Select approved questions from your bank'; END IF;
IF st<>'draft' THEN IF n=0 OR NULLIF(_exam->>'start_at','') IS NULL OR NULLIF(_exam->>'end_at','') IS NULL THEN RAISE EXCEPTION 'Questions and schedule required before publishing'; END IF; IF (_exam->>'end_at')::timestamptz<=now() OR (_exam->>'end_at')::timestamptz<=(_exam->>'start_at')::timestamptz THEN RAISE EXCEPTION 'End time must be future and after start time'; END IF; st:=CASE WHEN (_exam->>'start_at')::timestamptz>now() THEN 'scheduled' ELSE 'active' END; END IF;
IF eid IS NULL THEN INSERT INTO public.exams(teacher_id,title,subject) VALUES(auth.uid(),_exam->>'title',_exam->>'subject') RETURNING id INTO eid; END IF;
UPDATE public.exams SET title=trim(_exam->>'title'),subject=trim(_exam->>'subject'),description=COALESCE(_exam->>'description',''),duration_minutes=(_exam->>'duration_minutes')::integer,start_at=NULLIF(_exam->>'start_at','')::timestamptz,end_at=NULLIF(_exam->>'end_at','')::timestamptz,status=st,settings=COALESCE(_exam->'settings','{}'::jsonb),updated_at=now() WHERE id=eid;
DELETE FROM public.questions WHERE exam_id=eid;
INSERT INTO public.questions(exam_id,created_by,topic,question_text,question_type,options,correct_answer,marks,difficulty,explanation,word_limit,model_answer) SELECT eid,auth.uid(),topic,question_text,question_type,options,correct_answer,marks,difficulty,explanation,word_limit,model_answer FROM public.questions WHERE id=ANY(_question_ids) AND exam_id IS NULL;
UPDATE public.exams SET total_marks=(SELECT COALESCE(sum(marks),0) FROM public.questions WHERE exam_id=eid) WHERE id=eid; RETURN eid; END $$;