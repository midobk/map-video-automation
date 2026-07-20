import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Vitest configuration for the @mapvideo/web package.
 *
 * Loads env vars from apps/web/.env.local so tests that exercise server actions
 * (which read SUPABASE_URL, PUBLISHING_KILL_SWITCH, etc. via @mapvideo/shared)
 * have a fully-configured environment. Without this, vitest would not see
 * .env.local by default and the DB-dependent tests would short-circuit on
 * `hasDatabaseConfig()` returning false.
 *
 * The loader is intentionally dependency-free (mirrors the pattern in
 * apps/web/scripts/test-pipeline-e2e.mts) so the test runner does not pull
 * in `dotenv` for a single config file.
 */
function loadEnvLocal() {
  const envFile = path.resolve(__dirname, '.env.local');
  try {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env.local — fall back to whatever the caller exported. Tests that
    // don't need Supabase (e.g. validation-only assertions) will still run.
  }
}

loadEnvLocal();

export default defineConfig({
  test: {
    // Tests target the Node runtime (server actions, DB repo functions).
    environment: 'node',
    // Each test file gets its own isolated module graph so mocked modules
    // do not leak across files. Critical for the repository mocks in
    // unit-level tests.
    isolate: true,
    // Tests touching Supabase run in <10s; the default 5s per test is too
    // tight when CI is slow.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
