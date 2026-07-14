# Map Video Automation

A source-backed, AI-assisted map-video production platform with deterministic rendering and mandatory human approval.

## Current phase

Phase 0 establishes a safe local foundation. AI providers, cloud rendering, OpenClaw runtime control, and social publishing are deliberately out of scope and disabled.

## Prerequisites

- Node.js 22.16.x
- Corepack/pnpm 10.13.x
- FFmpeg and ffprobe
- Docker and Supabase CLI are optional during Phase 0 and become required for full local database development.

## Start

```bash
corepack enable
pnpm bootstrap
pnpm run ci
```

Run the web app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Safety defaults

- `PROVIDER_MODE=mock`
- `PUBLISHER_MODE=mock`
- `PUBLISHING_KILL_SWITCH=true`
- `ALLOW_LOCAL_EXTERNAL_PUBLISHING=false`

See the complete specification in `docs/AI_MAP_VIDEO_AUTOMATION_IMPLEMENTATION_V2.md`.
