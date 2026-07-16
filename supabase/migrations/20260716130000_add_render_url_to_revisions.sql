-- Add render output URL to revisions for the AI research-to-render pipeline.

alter table if exists public.content_revisions
  add column if not exists render_url text;
