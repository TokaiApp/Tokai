-- Active task + manual task ordering
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS.

-- Per-user "currently working on" selection, surfaced in the TokTodo panel.
alter table public.profiles add column if not exists active_task_id text;

-- Manual task order (drag on desktop, ▲/▼ on mobile). Lower = higher in the list.
-- double precision leaves room for fractional reordering later without renumbering.
alter table public.tasks add column if not exists position double precision;
