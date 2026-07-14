#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gitleaks >/dev/null 2>&1; then
  echo 'Gitleaks is required for a complete local secret scan.' >&2
  echo 'Install it from the official Gitleaks releases before running pnpm secrets:scan.' >&2
  exit 1
fi

exec gitleaks git --redact --no-banner
