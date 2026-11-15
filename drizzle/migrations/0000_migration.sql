create type public.app_role as enum ('student','teacher','admin');
create type public.account_status as enum ('active','pending','inactive');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  email text,
  contact_number text,
  requested_role public.app_role not null default 'student',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'teacher'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "admin audit read" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- prevent users from changing protected profile columns themselves
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.account_status := old.account_status;
    new.requested_role := old.requested_role;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req text := coalesce(new.raw_user_meta_data->>'requested_role','student');
  r public.app_role;
begin
  r := case when req = 'teacher' then 'teacher'::public.app_role else 'student'::public.app_role end;
  insert into public.profiles (id, full_name, username, email, contact_number, requested_role, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    nullif(lower(new.raw_user_meta_data->>'username'),''),
    new.email,
    nullif(new.raw_user_meta_data->>'contact_number',''),
    r,
    case when r = 'teacher' then 'pending'::public.account_status else 'active'::public.account_status end
  );
  if r = 'student' then
    insert into public.user_roles (user_id, role) values (new.id, 'student');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- admin actions
create or replace function public.admin_approve_teacher(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  insert into public.user_roles(user_id, role) values (_user_id,'teacher') on conflict do nothing;
  update public.profiles set account_status = 'active' where id = _user_id;
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(),'teacher_approved',_user_id);
end $$;

create or replace function public.admin_set_account_status(_user_id uuid, _status public.account_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot change your own status'; end if;
  update public.profiles set account_status = _status where id = _user_id;
  insert into public.audit_log(actor_id, action, target_id, metadata)
    values (auth.uid(),'status_changed',_user_id, jsonb_build_object('status',_status));
end $$;

revoke execute on function public.admin_approve_teacher(uuid) from anon, public;
revoke execute on function public.admin_set_account_status(uuid, public.account_status) from anon, public;
grant execute on function public.admin_approve_teacher(uuid) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status) to authenticated;