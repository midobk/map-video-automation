# Supabase Cloud Audit

Project reference: `ycnxmqmgqgddhaeuyjcg`

## Project

- Name: `map-video-automation`
- Status: `ACTIVE_HEALTHY`
- Region: `us-east-1`
- PostgreSQL: 17
- The owner accepted the `us-east-1` region for this project.

## Applied migrations

Applied to the cloud project on 2026-07-14:

- `20260714212905_phase0_marker.sql`
- `20260714212910_harden_rls_auto_enable.sql`

The repository filenames match the cloud migration versions.

## Schema verification

`public.foundation_metadata` exists with:

- `key text` primary key
- `value jsonb not null`
- `created_at timestamptz not null default now()`
- RLS enabled
- zero RLS policies
- zero rows
- the expected Phase 0 table comment

Supabase grants API roles table privileges by default, but RLS is enabled and no policies exist. Browser and API access are therefore intentionally fail-closed until a later reviewed phase introduces explicit policies.

## RLS helper hardening

Direct execution of `public.rls_auto_enable()` is revoked from:

- `PUBLIC`
- `anon`
- `authenticated`
- `service_role`

The managed `ensure_rls` event trigger remains enabled.

## Advisor results

Security:

- The previous anonymous and authenticated `SECURITY DEFINER` execution warnings are cleared.
- One informational item remains: `rls_enabled_no_policy` for `public.foundation_metadata`. This is intentional for the Phase 0 deny-by-default marker table.
- See the [Supabase database linter reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance:

- No findings.

## Secrets

No Supabase secret or API key is stored in this repository. Cloud validation did not expose any keys.
