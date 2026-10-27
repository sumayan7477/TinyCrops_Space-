create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  heat_threshold_c numeric not null default 32,
  notify_in_app boolean not null default true,
  notify_email boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null default 'auto',
  created_at timestamptz not null default now()
);
create index on public.farms(user_id);

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  crop_type text,
  growth_stage text,
  irrigated boolean,
  boundary jsonb,
  area_ha numeric,
  status text not null default 'insufficient_data' check (status in ('normal','monitor','needs_inspection','high_priority','insufficient_data')),
  created_at timestamptz not null default now()
);
create index on public.parcels(farm_id);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  parcel_id uuid not null references public.parcels(id) on delete cascade,
  observed_at date not null,
  source text not null,
  indicator text not null default 'NDVI',
  mean_value numeric,
  cloud_cover_pct numeric,
  resolution_m numeric,
  quality text,
  created_at timestamptz not null default now()
);
create index on public.observations(parcel_id, observed_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  farm_id uuid references public.farms(id) on delete set null,
  parcel_id uuid references public.parcels(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  source_alert text,
  assignee text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','dismissed')),
  intensity text check (intensity in ('light','moderate','heavy')),
  due_date date,
  follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks(user_id, status);

create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  event text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  parcel_id uuid references public.parcels(id) on delete set null,
  title text not null,
  body text not null,
  priority text not null default 'medium',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['farms','parcels','observations','tasks','task_history','notifications'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

create or replace function public.log_task_change() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.task_history(user_id, task_id, event) values (new.user_id, new.id, 'Status changed: ' || old.status || ' → ' || new.status);
  end if;
  return new;
end $$;
create trigger tasks_change before update on public.tasks for each row execute function public.log_task_change();