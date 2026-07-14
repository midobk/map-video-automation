# Supabase Cloud Audit

Project reference: `ycnxmqmgqgddhaeuyjcg`

## Read-only audit result

- Project name: `map-video-automation`
- Status: `ACTIVE_HEALTHY`
- Region: `us-east-1`
- Postgres: 17
- Public schema tables: none
- Applied migrations: none
- Active publishable key: present
- Legacy anon key: present
- Performance advisor: no findings

## Security advisor finding

Supabase reports that `public.rls_auto_enable()` is a `SECURITY DEFINER` function executable by `anon` and `authenticated`. The function is used by the enabled `ensure_rls` event trigger to automatically enable RLS on new public tables.

Before production use, revoke direct API-role execution without disabling the event trigger:

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

This must be applied through a reviewed migration, followed by a fresh security-advisor check.

## Phase 0 migration review

The existing Phase 0 migration creates only `public.foundation_metadata`, explicitly enables RLS, and creates no browser-access policy. It is safe in principle, but no cloud migration should be applied until the owner confirms that the `us-east-1` project region is intentional.

No secret or API key is stored in this repository.
