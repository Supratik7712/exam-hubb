create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin')
     and coalesce(current_setting('examhub.teacher_request', true), '') <> 'on' then
    new.account_status := old.account_status;
    new.requested_role := old.requested_role;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.request_teacher_access()
returns void language plpgsql security definer set search_path = public as $$
declare _status public.account_status;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select account_status into _status from public.profiles where id = auth.uid();
  if _status is distinct from 'active' then raise exception 'Your account is not active'; end if;
  if public.has_role(auth.uid(),'teacher') then return; end if;
  perform set_config('examhub.teacher_request', 'on', true);
  update public.profiles set requested_role = 'teacher' where id = auth.uid() and requested_role <> 'teacher';
  perform set_config('examhub.teacher_request', '', true);
  if found then
    insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'teacher_access_requested', auth.uid());
  end if;
end $$;

revoke execute on function public.request_teacher_access() from anon, public;
grant execute on function public.request_teacher_access() to authenticated;