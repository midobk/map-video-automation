#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node_args=(--import tsx)
if [[ -f .env.local ]]; then
  node_args=(--env-file=.env.local "${node_args[@]}")
fi
node "${node_args[@]}" scripts/verify-environment.ts

ffmpeg -version >/dev/null
ffprobe -version >/dev/null
[[ -f docs/AI_MAP_VIDEO_AUTOMATION_IMPLEMENTATION_V2.md ]]
[[ -f AGENTS.md ]]
[[ -f supabase/config.toml ]]
printf 'Phase 0 local verification passed.\n'
