#!/usr/bin/env bash
set -euo pipefail

required=(node corepack ffmpeg ffprobe)
missing=0
for command_name in "${required[@]}"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$node_major" != "22" ]]; then
  printf 'Node.js 22 is required; found %s\n' "$(node --version)" >&2
  exit 1
fi

for optional in docker supabase; do
  if ! command -v "$optional" >/dev/null 2>&1; then
    printf 'Optional Phase 0 dependency not found: %s\n' "$optional"
  fi
done
