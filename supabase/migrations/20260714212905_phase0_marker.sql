create table if not exists public.foundation_metadata (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.foundation_metadata enable row level security;

comment on table public.foundation_metadata is
  'Phase 0 marker only. Browser access is denied until explicit RLS policies are introduced.';
