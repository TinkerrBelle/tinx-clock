-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table pay_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  hourly_rate numeric(10,2) not null,
  is_default boolean not null default false
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  rate_name text not null,
  hourly_rate numeric(10,2) not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  start_lat double precision, start_lng double precision,
  end_lat double precision, end_lng double precision
);

create index on shifts (user_id, start_time desc);
-- only one running shift per user
create unique index one_active_shift on shifts (user_id) where end_time is null;

alter table jobs enable row level security;
alter table pay_rates enable row level security;
alter table shifts enable row level security;

create policy "own jobs" on jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rates" on pay_rates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own shifts" on shifts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text, gender text, date_of_birth date, phone text, avatar text,
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
