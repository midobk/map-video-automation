import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Vitest configuration for the @mapvideo/web package.
//
// Loads env vars from apps/web/.env.local so tests that exercise server actions
// (which read SUPABASE_URL, PUBLISHING_KILL_SWITCH, etc. via @mapvideo/shared)
// have a fully-configured environment. Without this, vitest would not see
// .env.local by default and the DB-dependent tests would short-circuit on
// hasDatabaseConfig returning false.
//
// The loader is intentionally dependency-free (mirrors the pattern in
// apps/web/scripts/test-pipeline-e2e.mts) so the test runner does not pull
// in dotenv for a single config file.
//
// The default test environment is node (fastest for action-level tests that
// do not render any React components). Component tests opt in to jsdom via
// the test.tsx glob below. The setup file mocks next/cache and
// next/navigation so the components do not need a real Next.js runtime.
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
  // apps/web/tsconfig.json sets jsx: preserve (required by the Next.js
  // build). For test files we need oxc to actually transform JSX
  // (automatic runtime) — without this, vite's import-analysis plugin
  // sees the raw <Component /> syntax and fails to parse. Vitest 4.x
  // uses oxc (not esbuild) for transform; setting both produces a
  // warning and silently drops the esbuild option, so we set oxc.jsx
  // directly. The top-level string form is restricted to "preserve",
  // so we use the object form with runtime: "automatic" (which is the
  // default in oxc, but we set it explicitly to make the intent clear).
  // The production Next.js build is unaffected.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    // Default to the Node runtime — fastest for action-level tests that
    // do not render any React components. Component tests opt in to the
    // jsdom environment via a per-file pragma (`// @vitest-environment jsdom`
    // at the top of the .test.tsx file). The pragma is vitest's supported
    // way to set the environment per-file; the older environmentMatchGlobs
    // was removed in vitest 4.
    environment: 'node',
    // setupFiles runs once per test file, before any test imports.
    // We register jest-dom matchers (toBeInTheDocument, etc.) and
    // mock the Next.js runtime bits the components import.
    setupFiles: ['./vitest.setup.ts'],
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
