-- Run once in Supabase SQL Editor (existing projects)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text, gender text, date_of_birth date, phone text, avatar text,
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
