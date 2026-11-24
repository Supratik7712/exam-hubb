CREATE OR REPLACE FUNCTION public.manage_exam(_id uuid, _action text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE e public.exams; BEGIN
SELECT * INTO e FROM public.exams WHERE id=_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_status='active') OR NOT (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'teacher') AND e.teacher_id=auth.uid())) THEN RAISE EXCEPTION 'Not authorized'; END IF;
IF _action='remove' AND public.has_role(auth.uid(),'admin') THEN
  UPDATE public.feedback SET attempt_id=NULL WHERE attempt_id IN (SELECT id FROM public.exam_attempts WHERE exam_id=_id);
  DELETE FROM public.attempt_answers WHERE attempt_id IN (SELECT id FROM public.exam_attempts WHERE exam_id=_id);
  DELETE FROM public.exam_attempts WHERE exam_id=_id;
  DELETE FROM public.questions WHERE exam_id=_id;
  DELETE FROM public.exams WHERE id=_id;
ELSIF _action='delete' AND e.status='draft' AND e.teacher_id=auth.uid() THEN DELETE FROM public.questions WHERE exam_id=_id; DELETE FROM public.exams WHERE id=_id;
ELSIF _action='close' AND e.status IN ('scheduled','active') THEN UPDATE public.exams SET status='completed',updated_at=now() WHERE id=_id;
ELSE RAISE EXCEPTION 'Action not allowed for this exam'; END IF;
IF public.has_role(auth.uid(),'admin') THEN INSERT INTO public.audit_log(actor_id,action,target_id,metadata) VALUES(auth.uid(),'exam_'||_action,_id,jsonb_build_object('title',e.title)); END IF; END $function$;