# Vercel deployment configuration

The Vercel project must use the following settings for this monorepo:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Node.js Version: `22.x`
- Install Command: Automatic
- Build Command: Automatic (`turbo run build` is inferred)
- Output Directory: unset
- Include source files outside of the Root Directory: enabled

The outside-root setting is required because `apps/web` imports workspace packages from `packages/*`.

## Environment safety

Preview deployments must remain on the Phase 0 safe defaults unless a later reviewed phase explicitly changes them:

```dotenv
APP_ENV=staging
PROVIDER_MODE=mock
RENDER_MODE=local
PUBLISHER_MODE=mock
PUBLISHING_KILL_SWITCH=true
ALLOW_LOCAL_EXTERNAL_PUBLISHING=false
```

Do not add a Supabase service-role key, provider secret, OAuth refresh token, or publishing credential to Preview environments. Public Supabase publishable credentials may be added only after the corresponding client integration and RLS policies are reviewed.

Production currently deploys from `main`; pull requests create protected preview deployments. Any change to the Root Directory, framework preset, Node version, build command, or output directory must be documented in this file and verified in the pull request preview.
