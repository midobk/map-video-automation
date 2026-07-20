import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// `next/cache` re-exports `revalidatePath`, which throws when called outside
// the Next.js runtime (the test environment has no static-generation store).
// Mock it as a no-op so the action's cache-invalidation calls don't blow up.
vi.mock('next/cache', () => ({
  revalidatePath: () => undefined,
}));

import {
  createContentItem,
  createContentRevision,
  createServerClient,
  getDefaultProject,
  getRevisionResearchReview,
  listContentItems,
  recordResearchReviewIfAbsent,
  setCurrentRevision,
} from '@mapvideo/db';
import {
  loadContentDetail,
  markResearchReviewed,
  recordApprovalDecision,
} from '../lib/actions/content';

/**
 * Tests for the research-review server-side gate.
 *
 * These tests exercise the live Supabase test project (configured via
 * apps/web/.env.local). Each test creates disposable content items and
 * revisions, then cleans them up in afterAll. Audit events are cleaned up
 * explicitly because they are bound to the organization, not to the content
 * item, and would otherwise accumulate across test runs.
 *
 * Tests are skipped silently when Supabase is not configured (e.g. CI without
 * a project) — the action's own `hasDatabaseConfig()` guard means the
 * un-configured code path is also covered by `dashboard-actions.test.ts`.
 */

const REVIEW_ACTION = 'revision.research_reviewed';

// Test fixtures ----------------------------------------------------------------

const validFactPack = {
  topic: 'A research topic for testing',
  summary: 'A summary that meets the schema minimum length requirement.',
  claims: [
    {
      text: 'A sourced claim with a URL.',
      source: { name: 'Example Source A', url: 'https://example.com/a' },
    },
    {
      text: 'A sourced claim without a URL.',
      source: { name: 'Example Source B' },
    },
    {
      text: 'Another claim, this one also has a URL.',
      source: { name: 'Example Source C', url: 'https://example.com/c' },
    },
  ],
  entities: ['Entity 1', 'Entity 2'],
  risk: 'LOW' as const,
};

// Malformed: claims is empty (fails `min(1)` on the array). Also, topic and
// summary are missing — but Zod's safeParse will report the first failure
// which is sufficient for the test.
const malformedFactPack = {
  topic: 'broken',
  claims: [],
};

const uuid = (): string => {
  // Not cryptographic; only needs to be unique within a single test run.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Shared test scaffolding -------------------------------------------------------

const created: string[] = [];
const createdRevisionIds = new Set<string>();

async function makeContentItem(
  factPack: unknown | null,
  options: { titleSuffix?: string; setCurrent?: boolean; revisionNumber?: number } = {},
): Promise<{ item: { id: string }; revision: { id: string } }> {
  const project = await getDefaultProject();
  if (!project) throw new Error('Test requires a default project to be seeded.');

  const title = `research-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${
    options.titleSuffix ? `-${options.titleSuffix}` : ''
  }`;
  const item = await createContentItem({
    project_id: project.id,
    title,
    topic_prompt: 'Test topic',
    status: 'AWAITING_APPROVAL',
    risk: 'LOW',
    current_revision_id: null,
    created_by: null,
  });
  created.push(item.id);

  const revision = await createContentRevision({
    content_item_id: item.id,
    revision_number: options.revisionNumber ?? 1,
    language: 'en',
    fact_pack: factPack as Record<string, unknown> | null,
    script: null,
    video_plan: null,
    content_hash: `hash-${title}`,
    created_by: null,
  });
  createdRevisionIds.add(revision.id);

  if (options.setCurrent !== false) {
    await setCurrentRevision(item.id, revision.id, 'AWAITING_APPROVAL');
  }

  return { item, revision };
}

async function cleanup(): Promise<void> {
  if (created.length === 0 && createdRevisionIds.size === 0) return;
  const client = createServerClient();
  // Delete content items first; the FK from content_revisions cascades.
  if (created.length > 0) {
    await client.from('content_items').delete().in('id', created);
  }
  // Audit events are bound to the organization, not the content item, so they
  // must be removed explicitly. Scoped to the test's revision ids and the
  // research-review action so we never touch unrelated audit rows.
  if (createdRevisionIds.size > 0) {
    await client
      .from('audit_events')
      .delete()
      .eq('action', REVIEW_ACTION)
      .in('target_id', [...createdRevisionIds]);
  }
  created.length = 0;
  createdRevisionIds.clear();
}

// Pre-flight: confirm the test environment is actually configured. If it
// isn't, the entire suite degrades to a single passing "skipped" assertion so
// CI doesn't fail in environments without Supabase credentials.
let hasSupabase = false;
beforeAll(async () => {
  // We need the raw env check rather than calling hasDatabaseConfig (which
  // lives in @mapvideo/db) at module-init time, because the action-level
  // import chain already depends on that module.
  hasSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!hasSupabase) return;

  const project = await getDefaultProject();
  if (!project) {
    hasSupabase = false;
    return;
  }
  // Confirm we can list — guards against a misconfigured client.
  await listContentItems(project.id);
});

afterAll(async () => {
  await cleanup();
});

// afterEach is intentionally not used: the cleanup() helper in afterAll
// collects everything from every test. Individual tests are independent
// because each gets its own content item, so cross-test pollution is not
// possible.

describe('research review actions', () => {
  it('skips the suite when Supabase is not configured', () => {
    if (!hasSupabase) {
      // No assertion — the suite is a no-op in this environment.
      return;
    }
    expect(hasSupabase).toBe(true);
  });
});

// 1. Valid + malformed + missing fact pack handling
// -----------------------------------------------------------
describe('markResearchReviewed - fact pack handling', () => {
  it('succeeds with a valid fact pack and writes audit metadata with correct counts', async () => {
    if (!hasSupabase) return;
    const { item, revision } = await makeContentItem(validFactPack);

    const result = await markResearchReviewed(item.id);
    if (!result.success) {
      throw new Error(`markResearchReviewed failed unexpectedly: ${result.error}`);
    }
    expect(result.success).toBe(true);

    // 3 claims, 2 of which have a URL.
    expect(result.review.claimCount).toBe(3);
    expect(result.review.urlCount).toBe(2);
    expect(result.review.revisionId).toBe(revision.id);

    const stored = await getRevisionResearchReview(revision.id);
    expect(stored).not.toBeNull();
    expect(stored?.action).toBe(REVIEW_ACTION);
    expect(stored?.target_type).toBe('content_revision');
    expect(stored?.target_id).toBe(revision.id);
    const meta = stored?.metadata as { claimCount?: number; urlCount?: number };
    expect(meta.claimCount).toBe(3);
    expect(meta.urlCount).toBe(2);
  });

  it('returns the malformed error and writes no audit event for a bad fact pack', async () => {
    if (!hasSupabase) return;
    const { item, revision } = await makeContentItem(malformedFactPack);

    const result = await markResearchReviewed(item.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/malformed/i);

    // No audit event should have been recorded.
    const stored = await getRevisionResearchReview(revision.id);
    expect(stored).toBeNull();
  });

  it('returns the "no research data" error when fact_pack is null', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(null);

    const result = await markResearchReviewed(item.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/no research data/i);
  });
});

// 1c. loadContentDetail data shape
// -----------------------------------------------------------
describe('loadContentDetail - data shape', () => {
  it('parses a valid fact pack and preserves the raw blob', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(validFactPack);

    const detail = await loadContentDetail(item.id);
    expect(detail.error).toBeUndefined();
    expect(detail.revisions).toBeDefined();
    const rev = detail.revisions?.[0];
    expect(rev).toBeDefined();
    // The current revision's fact pack should be parsed.
    expect(rev!.factPack).not.toBeNull();
    expect(rev!.factPack?.claims.length).toBe(3);
    // The raw blob should round-trip the original payload.
    expect(rev!.factPackRaw).toEqual(validFactPack);
  });

  it('returns factPack=null and the raw blob when the stored data is malformed', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(malformedFactPack);

    const detail = await loadContentDetail(item.id);
    expect(detail.error).toBeUndefined();
    const rev = detail.revisions?.[0];
    expect(rev).toBeDefined();
    // Fail-closed: parsed shape is null so the UI shows the malformed state.
    expect(rev!.factPack).toBeNull();
    // Raw blob is preserved so the UI can render a diagnostic.
    expect(rev!.factPackRaw).toEqual(malformedFactPack);
  });

  it('returns factPack=null and factPackRaw=null when the revision has no fact pack', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(null);

    const detail = await loadContentDetail(item.id);
    expect(detail.error).toBeUndefined();
    const rev = detail.revisions?.[0];
    expect(rev).toBeDefined();
    expect(rev!.factPack).toBeNull();
    expect(rev!.factPackRaw).toBeNull();
  });
});

// 3. Idempotent review
// -----------------------------------------------------------
describe('markResearchReviewed - idempotency', () => {
  it('creates only one audit event when called twice for the same revision', async () => {
    if (!hasSupabase) return;
    const { item, revision } = await makeContentItem(validFactPack);

    const first = await markResearchReviewed(item.id);
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = await markResearchReviewed(item.id);
    expect(second.success).toBe(true);
    if (!second.success) return;

    // Same revision id, same audit-event timestamp = same underlying row.
    expect(second.review.revisionId).toBe(revision.id);
    expect(second.review.createdAt).toBe(first.review.createdAt);

    // Cross-check via the repository: only one matching event exists.
    const project = await getDefaultProject();
    expect(project).not.toBeNull();
    const client = createServerClient();
    const { count, error } = await client
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .eq('action', REVIEW_ACTION)
      .eq('target_type', 'content_revision')
      .eq('target_id', revision.id);
    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it('recordResearchReviewIfAbsent returns the existing event on repeat calls', async () => {
    if (!hasSupabase) return;
    const { revision } = await makeContentItem(validFactPack);
    const project = await getDefaultProject();
    expect(project).not.toBeNull();

    const first = await recordResearchReviewIfAbsent({
      organization_id: project!.organization_id,
      revisionId: revision.id,
      claimCount: 3,
      urlCount: 2,
    });
    const second = await recordResearchReviewIfAbsent({
      organization_id: project!.organization_id,
      revisionId: revision.id,
      // Different counts on purpose — should be ignored, not overwritten.
      claimCount: 99,
      urlCount: 99,
    });
    expect(second.id).toBe(first.id);
    const firstMeta = first.metadata as { claimCount?: number; urlCount?: number };
    const secondMeta = second.metadata as { claimCount?: number; urlCount?: number };
    expect(firstMeta.claimCount).toBe(3);
    expect(secondMeta.claimCount).toBe(3);
  });
});

// 4 & 5. Approval blocked before review, allowed after
// -----------------------------------------------------------
describe('recordApprovalDecision - research review gate', () => {
  // The publishing kill switch is checked before the research-review gate
  // inside the action. Disable it for the whole describe block so the only
  // thing under test is the gate logic.
  const originalKillSwitch = process.env.PUBLISHING_KILL_SWITCH;
  beforeAll(() => {
    process.env.PUBLISHING_KILL_SWITCH = 'false';
  });
  afterAll(() => {
    if (originalKillSwitch === undefined) {
      delete process.env.PUBLISHING_KILL_SWITCH;
    } else {
      process.env.PUBLISHING_KILL_SWITCH = originalKillSwitch;
    }
  });

  it('blocks APPROVED before research is reviewed', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(validFactPack);

    const result = await recordApprovalDecision(item.id, 'APPROVED');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not been reviewed/i);
  });

  it('allows APPROVED after research is reviewed (kill switch disabled)', async () => {
    if (!hasSupabase) return;
    const { item } = await makeContentItem(validFactPack);

    const reviewed = await markResearchReviewed(item.id);
    if (!reviewed.success) {
      throw new Error(`markResearchReviewed failed unexpectedly: ${reviewed.error}`);
    }
    expect(reviewed.success).toBe(true);

    const result = await recordApprovalDecision(item.id, 'APPROVED');
    expect(result.success).toBe(true);
    if (!result.success) return;
  });
});

// 6. Old revision review does not satisfy the new current revision
// -----------------------------------------------------------
describe('research review - revision binding', () => {
  it('does not let an old revision review satisfy the new current revision', async () => {
    if (!hasSupabase) return;
    // Build the item with revision 1 only, mark it reviewed.
    const { item } = await makeContentItem(validFactPack, {
      titleSuffix: 'old-rev',
      revisionNumber: 1,
    });
    const reviewed = await markResearchReviewed(item.id);
    expect(reviewed.success).toBe(true);
    if (!reviewed.success) return;

    // Now add a new revision (2) and switch the current pointer to it.
    const rev2 = await createContentRevision({
      content_item_id: item.id,
      revision_number: 2,
      language: 'en',
      fact_pack: validFactPack as Record<string, unknown>,
      script: null,
      video_plan: null,
      content_hash: `hash-rev2-${uuid()}`,
      created_by: null,
    });
    createdRevisionIds.add(rev2.id);
    await setCurrentRevision(item.id, rev2.id, 'AWAITING_APPROVAL');

    // The kill switch is left at its default (true) for this test: the
    // research-review gate is the one we are isolating, but if it fires
    // before the kill-switch check we want to see the gate error, not the
    // kill-switch error. Disable the kill switch just for this assertion.
    const originalKillSwitch = process.env.PUBLISHING_KILL_SWITCH;
    process.env.PUBLISHING_KILL_SWITCH = 'false';
    try {
      // Approving must fail — the audit event is bound to rev1, not rev2.
      const result = await recordApprovalDecision(item.id, 'APPROVED');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/not been reviewed/i);
    } finally {
      if (originalKillSwitch === undefined) {
        delete process.env.PUBLISHING_KILL_SWITCH;
      } else {
        process.env.PUBLISHING_KILL_SWITCH = originalKillSwitch;
      }
    }
  });
});

// 7. Revision change between page load and action
// -----------------------------------------------------------
describe('markResearchReviewed - revision change race', () => {
  it('rejects the call when expectedRevisionId does not match the current revision', async () => {
    if (!hasSupabase) return;
    // Build with one revision, then add a second and switch the current to it.
    const { item, revision: rev1 } = await makeContentItem(validFactPack, {
      titleSuffix: 'race',
      revisionNumber: 1,
    });
    const rev2 = await createContentRevision({
      content_item_id: item.id,
      revision_number: 2,
      language: 'en',
      fact_pack: validFactPack as Record<string, unknown>,
      script: null,
      video_plan: null,
      content_hash: `hash-rev2-${uuid()}`,
      created_by: null,
    });
    createdRevisionIds.add(rev2.id);
    await setCurrentRevision(item.id, rev2.id, 'AWAITING_APPROVAL');

    // The caller saw rev1 (e.g. an old page load) but the live current is rev2.
    // The action should refuse rather than silently write to the new revision.
    const result = await markResearchReviewed(item.id, rev1.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/revision changed/i);
  });

  it('still succeeds when expectedRevisionId is omitted (uses the live current)', async () => {
    if (!hasSupabase) return;
    // Same setup: rev1 + rev2, current = rev2.
    const { item, revision: rev1 } = await makeContentItem(validFactPack, {
      titleSuffix: 'race-omitted',
      revisionNumber: 1,
    });
    const rev2 = await createContentRevision({
      content_item_id: item.id,
      revision_number: 2,
      language: 'en',
      fact_pack: validFactPack as Record<string, unknown>,
      script: null,
      video_plan: null,
      content_hash: `hash-rev2-${uuid()}`,
      created_by: null,
    });
    createdRevisionIds.add(rev2.id);
    await setCurrentRevision(item.id, rev2.id, 'AWAITING_APPROVAL');

    const result = await markResearchReviewed(item.id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    // The audit event must be bound to the live current (rev2), not the
    // older rev1 the caller never asserted.
    expect(result.review.revisionId).toBe(rev2.id);
    expect(result.review.revisionId).not.toBe(rev1.id);
  });
});
