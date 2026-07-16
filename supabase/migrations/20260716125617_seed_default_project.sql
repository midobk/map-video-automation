-- Seed a default organization and project for local dashboard development.
-- This avoids requiring full auth/organization onboarding in PR 1E.

insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Default Organization')
on conflict (id) do update set name = excluded.name;

insert into public.projects (id, organization_id, name, slug)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Default Project',
  'default'
)
on conflict (organization_id, slug) do update set name = excluded.name;
