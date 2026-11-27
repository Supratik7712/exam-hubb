alter table public.profiles
  add column phone_verified boolean not null default false,
  add column phone_verified_at timestamptz;

-- Existing accounts predate SMS verification and must not be interrupted.
update public.profiles
set phone_verified = true,
    phone_verified_at = coalesce(phone_verified_at, created_at)
where phone_verified = false;

create table public.phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.phone_verification_challenges to service_role;
alter table public.phone_verification_challenges enable row level security;
create index phone_verification_user_created on public.phone_verification_challenges(user_id, created_at desc);

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    if coalesce(current_setting('examhub.teacher_request', true), '') <> 'on' then
      new.account_status := old.account_status;
      new.requested_role := old.requested_role;
      new.email := old.email;
    end if;
    if coalesce(current_setting('examhub.phone_verification', true), '') <> 'on' then
      new.phone_verified := old.phone_verified;
      new.phone_verified_at := old.phone_verified_at;
      if new.contact_number is distinct from old.contact_number then
        new.phone_verified := false;
        new.phone_verified_at := null;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.create_phone_challenge(_phone text, _code_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_latest record;
  v_id uuid;
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Enter a valid phone number with country code'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and phone_verified) then
    raise exception 'Phone number is already verified';
  end if;
  if exists (select 1 from public.profiles where contact_number = _phone and phone_verified and id <> auth.uid()) then
    raise exception 'This phone number is already verified on another account';
  end if;
  select id, created_at into v_latest from public.phone_verification_challenges
    where user_id = auth.uid() order by created_at desc limit 1 for update;
  if v_latest.created_at is not null and v_latest.created_at > now() - interval '60 seconds' then
    raise exception 'Please wait 60 seconds before requesting another code';
  end if;
  if (select count(*) from public.phone_verification_challenges
      where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many codes requested. Please try again in an hour';
  end if;
  update public.phone_verification_challenges set consumed_at = now()
    where user_id = auth.uid() and consumed_at is null;
  insert into public.phone_verification_challenges(user_id, code_hash, expires_at)
    values (auth.uid(), _code_hash, v_expires) returning id into v_id;
  update public.profiles set contact_number = _phone where id = auth.uid();
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'phone_code_requested', auth.uid());
  return jsonb_build_object('id', v_id, 'resend_at', now() + interval '60 seconds', 'expires_at', v_expires);
end $$;

create or replace function public.discard_phone_challenge(_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.phone_verification_challenges
    where id = _challenge_id and user_id = auth.uid() and consumed_at is null;
end $$;

create or replace function public.verify_phone_code(_code_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_challenge record;
  v_attempts integer;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and phone_verified) then return; end if;
  select * into v_challenge from public.phone_verification_challenges
    where user_id = auth.uid() and consumed_at is null order by created_at desc limit 1 for update;
  if v_challenge.id is null then raise exception 'Request a verification code first'; end if;
  if v_challenge.expires_at <= now() then
    update public.phone_verification_challenges set consumed_at = now() where id = v_challenge.id;
    raise exception 'This code has expired. Request a new one';
  end if;
  if v_challenge.attempts >= 5 then raise exception 'Too many incorrect attempts. Request a new code'; end if;
  update public.phone_verification_challenges set attempts = attempts + 1
    where id = v_challenge.id returning attempts into v_attempts;
  if v_challenge.code_hash <> _code_hash then
    if v_attempts >= 5 then
      update public.phone_verification_challenges set consumed_at = now() where id = v_challenge.id;
    end if;
    raise exception 'Incorrect code. % attempt(s) remaining', greatest(0, 5 - v_attempts);
  end if;
  update public.phone_verification_challenges set consumed_at = now() where id = v_challenge.id;
  perform set_config('examhub.phone_verification', 'on', true);
  update public.profiles set phone_verified = true, phone_verified_at = now() where id = auth.uid();
  perform set_config('examhub.phone_verification', '', true);
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'phone_verified', auth.uid());
end $$;

revoke execute on function public.create_phone_challenge(text, text) from anon, public;
revoke execute on function public.discard_phone_challenge(uuid) from anon, public;
revoke execute on function public.verify_phone_code(text) from anon, public;
grant execute on function public.create_phone_challenge(text, text) to authenticated;
grant execute on function public.discard_phone_challenge(uuid) to authenticated;
grant execute on function public.verify_phone_code(text) to authenticated;