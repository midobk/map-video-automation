-- Dashboard content schema: minimal subset for PR 1E.
-- Preserves the blueprint invariants while avoiding unused publisher/platform tables.

create type content_status as enum (
  'IDEA',
  'RESEARCHING',
  'RESEARCH_REVIEW',
  'SCRIPTING',
  'STORYBOARD_REVIEW',
  'GENERATING_MEDIA',
  'RENDERING',
  'QUALITY_REVIEW',
  'AWAITING_APPROVAL',
  'REJECTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'PUBLISH_FAILED'
);

create type risk_level as enum ('LOW', 'MEDIUM', 'HIGH', 'BLOCKED');
create type job_status as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  default_language text not null default 'en',
  default_timezone text not null default 'America/Toronto',
  brand_config jsonb not null default '{}'::jsonb,
  content_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  topic_prompt text not null,
  status content_status not null default 'IDEA',
  risk risk_level not null default 'LOW',
  current_revision_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  revision_number integer not null,
  language text not null,
  fact_pack jsonb,
  script jsonb,
  video_plan jsonb,
  content_hash text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_item_id, revision_number)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_current_revision_fk'
    and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_current_revision_fk
      foreign key (current_revision_id) references public.content_revisions(id) on delete set null;
  end if;
end
$$;

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.content_items(id) on delete cascade,
  task_name text not null,
  provider_run_id text,
  status job_status not null default 'QUEUED',
  input_hash text,
  output_summary jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for dashboard lookups.
create index if not exists idx_content_items_project on public.content_items(project_id);
create index if not exists idx_content_revisions_item on public.content_revisions(content_item_id);
create index if not exists idx_workflow_runs_content_item on public.workflow_runs(content_item_id);
create index if not exists idx_audit_events_org on public.audit_events(organization_id);

-- RLS: deny all browser access until explicit policies are added.
alter table if exists public.organizations enable row level security;
alter table if exists public.projects enable row level security;
alter table if exists public.content_items enable row level security;
alter table if exists public.content_revisions enable row level security;
alter table if exists public.workflow_runs enable row level security;
alter table if exists public.audit_events enable row level security;

drop policy if exists deny_all on public.organizations;
create policy deny_all on public.organizations as restrictive for all to public using (false);

drop policy if exists deny_all on public.projects;
create policy deny_all on public.projects as restrictive for all to public using (false);

drop policy if exists deny_all on public.content_items;
create policy deny_all on public.content_items as restrictive for all to public using (false);

drop policy if exists deny_all on public.content_revisions;
create policy deny_all on public.content_revisions as restrictive for all to public using (false);

drop policy if exists deny_all on public.workflow_runs;
create policy deny_all on public.workflow_runs as restrictive for all to public using (false);

drop policy if exists deny_all on public.audit_events;
create policy deny_all on public.audit_events as restrictive for all to public using (false);
