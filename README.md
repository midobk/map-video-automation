# Map Video Automation

A source-backed, AI-assisted map-video production platform with deterministic rendering, mandatory human approval at every workflow gate, and **zero system-binary dependencies** (no FFmpeg, no native modules) on the render path.

## What this is

The app runs the full **research → narration → storyboard → approval** loop for short map videos:

- **`/make`** — one-screen topic → MP4 flow. Drop in a topic, get a narrated preview.
- **`/dashboard`** — full workflow with two human-review gates (research + storyboard) before approval can be recorded. Status transitions are auditable.
- **`/dashboard/content/[id]`** — per-item detail with the research evidence panel, storyboard panel, preview/regenerate button, and approval controls.

Provider paths:

- **Research**: OpenAI (`gpt-4.1-mini` via Responses API with strict `json_schema`) **or** MiniMax M3 (tool-calling, free-tier).
- **TTS**: MiniMax TTS (free-tier), ElevenLabs (paid-tier), or Mock (deterministic sine-tone, byte-identical for CI).
- **Render**: Remotion + headless Chrome, fully local (`RENDER_MODE=local`). The pipeline re-times each scene to the real TTS audio so spoken narration drives the cuts.

## Prerequisites

- **Node.js 22.16.x** (`.node-version` is committed)
- **pnpm 10.13.x** via Corepack
- A Supabase project (free tier is fine) — local stack is wired but production uses your hosted project

That's it. **No FFmpeg, no Docker, no system packages** required for the render path. CI installs ffmpeg for the `render-fixtures` job's audio probe only, but your local dev box and Vercel preview do not need it.

## Quick start

```bash
# 1. Install
corepack enable
pnpm install

# 2. Configure
cp .env.example apps/web/.env.local  # then fill in your keys (see "Provider setup" below)

# 3. Apply database migrations
# See docs/REMOTE_MIGRATIONS.md — copy the two CREATE INDEX statements
# into the Supabase SQL editor and run them once. CI applies them
# automatically to the local stack.

# 4. Start the dev server
pnpm dev
# open http://localhost:3000
```

For a real narrated video in <2 minutes:

1. Set `PROVIDER_MODE=minimax` and `MINIMAX_API_KEY=sk-...` in `apps/web/.env.local`.
2. Visit `http://localhost:3000/make`.
3. Type a topic ("The Nile river"), pick a duration, click **Generate**.
4. The MP4 plays inline. Click **Download MP4** to save it locally.

For the rigorous approval flow:

1. Create a content item at `/dashboard/content/new`.
2. Click **Generate preview** on the item page. The pipeline runs research → script → narration → render.
3. Review the **Research** panel; click **Mark research reviewed**.
4. Review the **Storyboard** panel; click **Mark storyboard reviewed**.
5. Click **Approve**. Both gates must be satisfied server-side; the conditional update binds the approval to the reviewed revision so a concurrent regenerate can't slip a new revision past you.

## Provider setup

The full env-var surface is in `.env.example`. The fast path for `/make` to produce real narrated videos:

```ini
PROVIDER_MODE=minimax         # or "openai"
MINIMAX_API_KEY=sk-...        # required for MiniMax research AND/OR TTS
TTS_PROVIDER=minimax          # uses the same MINIMAX_API_KEY; free tier works
MINIMAX_TTS_VOICE_ID=English_CaptivatingStoryteller  # optional, this is the default
```

Alternative: OpenAI for research + ElevenLabs for TTS (both require paid plans):

```ini
PROVIDER_MODE=openai
OPENAI_API_KEY=sk-...
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # optional, this is the default
```

If both are unset, every provider falls back to its Mock implementation — useful for tests, useless for production. The Mock research adapter and Mock voice provider are byte-identical across runs so the `render-fixtures` CI job is stable.

## The approval workflow

The state machine is the canonical spec in `docs/AI_MAP_VIDEO_AUTOMATION_IMPLEMENTATION_V2.md`. Two gates gate APPROVED:

1. **Research review** — a human clicks "Mark research reviewed" on the Research panel. Writes an audit event `revision.research_reviewed` with the claim/URL counts.
2. **Storyboard review** — a human clicks "Mark storyboard reviewed" on the Storyboard panel. Writes `revision.storyboard_reviewed` with the scene/plan summary.

Both events are bound to the **specific revision id** at the time of review. The approval action refuses to mark `APPROVED` if the current revision's pointer has moved on (a `generatePreview` ran in the meantime and pointed the item at a new revision). Reject is unconditional — bad research should be REJECTED, not blocked.

Both audit events are protected by a partial unique index in Postgres so the same revision can only have one review event of each kind, even under concurrent traffic. **The migration is local-only by default** — see `docs/REMOTE_MIGRATIONS.md` to apply it to your hosted Supabase project.

## Migrations for remote Supabase

The CI `database` job runs `supabase db reset` which applies all migrations to a fresh local stack. Your **hosted** Supabase project only gets the initial schema unless you manually apply the two partial unique indexes that PRs #13 and #20 added. Without them, the DB-level atomicity isn't enforced in production.

Copy the two `CREATE INDEX` statements from [`docs/REMOTE_MIGRATIONS.md`](./docs/REMOTE_MIGRATIONS.md) and run them once in the Supabase SQL editor. This is a one-time setup — the indexes are idempotent.

## Project layout

```
apps/
  web/                 Next.js dashboard + /make page
  remotion-studio/     Remotion compositions (browser-side, used at render time)
packages/
  renderer/            Reusable React compositions, voice helpers (ffmpeg-free)
  pipeline/            Research adapter, script generator, render orchestrator
  db/                  Supabase client + content-revision repositories
  shared/              Environment schema + cross-cutting helpers
supabase/
  migrations/          Versioned schema migrations
docs/                  Spec, ADRs, REMOTE_MIGRATIONS, content policy
```

The two-tier split (apps + packages) is a pnpm/turbo monorepo. `pnpm exec turbo run test` runs every package's tests in dependency order; the renderer's `dist/` is built before anything that imports it (see `turbo.json`'s `test.dependsOn: ["^test", "^build"]`).

## Safety defaults

The shipped `.env.example` and the runtime defaults are the safest configuration:

- `PROVIDER_MODE=mock` (no real network calls until you opt in)
- `PUBLISHER_MODE=mock` (the publishing hooks are no-ops; the state machine reaches `PUBLISHED` but no external service is contacted)
- `PUBLISHING_KILL_SWITCH=true` (the approval action refuses to record APPROVED if you flip it to `true`; flip to `false` to enable real publication)
- `ALLOW_LOCAL_EXTERNAL_PUBLISHING=false` (you must explicitly opt in to external publishing from local dev)

Deployment-specific docs are at `docs/deployment/vercel.md`.

## What's intentionally out of scope

- **Cloud rendering** — Remotion cannot run on Vercel serverless. The deployed app produces plans, not MP4s. The path forward is Remotion Lambda or a background worker.
- **Publishing** — `PUBLISHER_MODE=mock` is a no-op flag. YouTube, social, etc. are stubbed.
- **Storyboard approval on `/make`** — the MVP path bypasses the research and storyboard review ceremonies by design. Use `/dashboard` for the rigorous flow.

## License

Internal.
