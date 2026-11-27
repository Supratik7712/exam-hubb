CREATE OR REPLACE FUNCTION public.admin_purge_user(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete accounts'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account'; END IF;
  SELECT email INTO _email FROM public.profiles WHERE id = _user_id;
  DELETE FROM public.attempt_answers WHERE attempt_id IN (SELECT id FROM public.exam_attempts WHERE student_id = _user_id OR exam_id IN (SELECT id FROM public.exams WHERE teacher_id = _user_id));
  DELETE FROM public.exam_attempts WHERE student_id = _user_id OR exam_id IN (SELECT id FROM public.exams WHERE teacher_id = _user_id);
  DELETE FROM public.questions WHERE created_by = _user_id OR exam_id IN (SELECT id FROM public.exams WHERE teacher_id = _user_id);
  DELETE FROM public.exams WHERE teacher_id = _user_id;
  DELETE FROM public.feedback WHERE user_id = _user_id;
  DELETE FROM public.notifications WHERE user_id = _user_id;
  DELETE FROM public.study_materials WHERE teacher_id = _user_id;
  DELETE FROM public.phone_verification_challenges WHERE user_id = _user_id;
  INSERT INTO public.audit_log(actor_id, action, target_id, metadata) VALUES (auth.uid(), 'user.deleted', _user_id, jsonb_build_object('email', _email));
END $$;
REVOKE ALL ON FUNCTION public.admin_purge_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_purge_user(uuid) TO authenticated;