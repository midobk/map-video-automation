#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks detect --source . --no-banner
fi

if git grep -I -n -E '(sk-[A-Za-z0-9]{20,}|SUPABASE_SERVICE_ROLE_KEY=[^[:space:]]+|AWS_SECRET_ACCESS_KEY=[^[:space:]]+)' -- ':!scripts/secret-scan.sh'; then
  echo 'Potential committed secret detected.' >&2
  exit 1
fi

echo 'Fallback secret scan passed (install gitleaks for the full scan).'
