#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node --import tsx <<'NODE'
import { parseEnvironment } from './packages/shared/src/environment.ts';
const environment = parseEnvironment({
  APP_ENV: process.env.APP_ENV ?? 'local',
  PROVIDER_MODE: process.env.PROVIDER_MODE ?? 'mock',
  RENDER_MODE: process.env.RENDER_MODE ?? 'local',
  PUBLISHER_MODE: process.env.PUBLISHER_MODE ?? 'mock',
  PUBLISHING_KILL_SWITCH: process.env.PUBLISHING_KILL_SWITCH ?? 'true',
  ALLOW_LOCAL_EXTERNAL_PUBLISHING: process.env.ALLOW_LOCAL_EXTERNAL_PUBLISHING ?? 'false',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});
if (environment.PROVIDER_MODE !== 'mock') throw new Error('Phase 0 verification requires mock providers.');
if (environment.PUBLISHER_MODE !== 'mock') throw new Error('Phase 0 verification requires mock publishers.');
if (!environment.PUBLISHING_KILL_SWITCH) throw new Error('Publishing kill switch must remain enabled.');
console.log('Environment safety verification passed.');
NODE

ffmpeg -version >/dev/null
ffprobe -version >/dev/null
[[ -f docs/AI_MAP_VIDEO_AUTOMATION_IMPLEMENTATION_V2.md ]]
[[ -f AGENTS.md ]]
[[ -f supabase/config.toml ]]
printf 'Phase 0 local verification passed.\n'
