-- TokTimer focus-session history (globalizes what was in localStorage)
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,            -- YYYY-MM-DD (local day the block ended)
  time text,                     -- HH:MM the block ended
  task_id text,                  -- active task at completion (nullable)
  task_title text,               -- snapshot of the task title (nullable)
  minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_date_idx on public.focus_sessions (user_id, date);

alter table public.focus_sessions enable row level security;

-- A user can only see and add their own sessions.
drop policy if exists "focus_sessions_select_own" on public.focus_sessions;
create policy "focus_sessions_select_own" on public.focus_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "focus_sessions_insert_own" on public.focus_sessions;
create policy "focus_sessions_insert_own" on public.focus_sessions
  for insert with check (auth.uid() = user_id);
