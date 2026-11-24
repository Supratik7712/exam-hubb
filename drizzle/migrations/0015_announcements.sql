CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','student','teacher','admin')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_admin_read ON public.announcements FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY announcements_live_read ON public.announcements FOR SELECT TO authenticated USING (
  starts_at <= now() AND (expires_at IS NULL OR expires_at > now())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status = 'active'::public.account_status)
  AND (audience = 'all' OR public.has_role(auth.uid(), audience::public.app_role)));

CREATE OR REPLACE FUNCTION public.admin_save_announcement(_id uuid, _title text, _body text, _audience text, _starts timestamptz, _expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(_title,''))) < 1 OR length(_title) > 120 THEN RAISE EXCEPTION 'Title must be 1-120 characters'; END IF;
  IF length(coalesce(_body,'')) > 1000 THEN RAISE EXCEPTION 'Message is too long'; END IF;
  IF _audience NOT IN ('all','student','teacher','admin') THEN RAISE EXCEPTION 'Invalid audience'; END IF;
  IF _expires IS NOT NULL AND _expires <= coalesce(_starts, now()) THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF _id IS NULL THEN
    INSERT INTO announcements (title, body, audience, starts_at, expires_at, created_by) VALUES (btrim(_title), coalesce(_body,''), _audience, coalesce(_starts, now()), _expires, auth.uid()) RETURNING id INTO rid;
  ELSE
    UPDATE announcements SET title = btrim(_title), body = coalesce(_body,''), audience = _audience, starts_at = coalesce(_starts, starts_at), expires_at = _expires, updated_at = now() WHERE id = _id RETURNING id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Announcement not found'; END IF;
  END IF;
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), CASE WHEN _id IS NULL THEN 'announcement_created' ELSE 'announcement_updated' END, rid, jsonb_build_object('title', btrim(_title), 'audience', _audience));
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_announcement(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM announcements WHERE id = _id RETURNING title INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'Announcement not found'; END IF;
  INSERT INTO audit_log (actor_id, action, target_id, metadata) VALUES (auth.uid(), 'announcement_deleted', _id, jsonb_build_object('title', t));
END $$;

REVOKE ALL ON FUNCTION public.admin_save_announcement(uuid,text,text,text,timestamptz,timestamptz), public.admin_delete_announcement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_announcement(uuid,text,text,text,timestamptz,timestamptz), public.admin_delete_announcement(uuid) TO authenticated;

INSERT INTO public.announcements (title, body, audience)
  SELECT 'Announcement', announcement, 'all' FROM public.app_settings WHERE id = 1 AND btrim(coalesce(announcement,'')) <> '';
COMMENT ON COLUMN public.app_settings.announcement IS 'DEPRECATED: replaced by public.announcements';