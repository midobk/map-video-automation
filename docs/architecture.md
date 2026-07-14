# Architecture

## Phase 0 boundary

The repository is a TypeScript pnpm monorepo. The web application is isolated from future provider, database, renderer, and publisher packages. Phase 0 uses deterministic mock providers and has no path to an external social platform.

## Long-term ownership

- Next.js: authenticated control panel and API boundary
- Supabase: authoritative application state, auth, RLS, and canonical storage
- Trigger.dev: durable workflows
- Remotion: deterministic rendering
- OpenClaw: restricted conversational operator, never the production runtime

## Safety invariants

1. Production publishing requires a feature flag and a disabled kill switch.
2. Approval references one exact revision and render hash.
3. External writes must be idempotent.
4. Provider credentials are server-only.
5. Local and pull-request environments never connect to production data.
