import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Vitest setup file — runs before every test file in this package.
 *
 * Two jobs:
 *   1. Register jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`,
 *      etc.) so component tests can use them.
 *   2. Mock the Next.js runtime bits the components touch, so the
 *      component-under-test does not crash when it tries to invalidate a
 *      cache path or read the current URL.
 *
 * The mocks are intentionally minimal — no logic, just the shape the
 * components destructure. If a future component imports a new symbol
 * from `next/cache` or `next/navigation`, add it here.
 */

// `next/cache` re-exports `revalidatePath`, which throws when called outside
// the Next.js runtime (the test environment has no static-generation store).
// Mock it as a no-op so the action's cache-invalidation calls and any
// component code that triggers a revalidation do not blow up. The action-
// level tests in this package also use this same trick in-file; the
// setup-file mock is the safety net for component tests.
vi.mock('next/cache', () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
}));

// `next/navigation` exposes `useRouter`, `usePathname`, and `useSearchParams`
// in the client runtime. They are referenced by the dashboard's
// ResearchEvidencePanel (calls `router.refresh()` after marking research
// reviewed). Without these mocks, calling `useRouter()` from a component
// rendered outside a Next.js app tree would throw.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    replace: () => undefined,
    prefetch: () => undefined,
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));
