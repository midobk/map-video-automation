#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/check-prerequisites.sh
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.13.1 --activate
pnpm install --frozen-lockfile

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  printf 'Created .env.local from safe mock defaults.\n'
fi

pnpm verify
printf '\nFoundation ready. Run `pnpm dev` and open http://localhost:3000.\n'
