-- Run once in Supabase SQL Editor (existing projects)
alter table jobs add column if not exists is_active boolean not null default true;
alter table jobs add column if not exists break_enabled boolean not null default false;
alter table jobs add column if not exists break_minutes integer not null default 0;
alter table shifts add column if not exists break_minutes integer not null default 0;
