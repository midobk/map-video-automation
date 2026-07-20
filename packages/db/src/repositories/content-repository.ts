import { createServerClient } from '../client';
import type { AuditEvent, ContentItem, ContentItemInsert, ContentRevision } from '../schema';

/**
 * Server-side repository for content items and revisions.
 *
 * All functions throw if the Supabase server environment is not configured.
 * Callers (server actions) are responsible for catching and surfacing errors.
 */

export async function getDefaultProject(): Promise<{ id: string; organization_id: string } | null> {
  const client = createServerClient();
  const { data, error } = await client
    .from('projects')
    .select('id, organization_id')
    .eq('slug', 'default')
    .single();
  if (error) return null;
  return data;
}

export async function listContentItems(projectId: string): Promise<ContentItem[]> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_items')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to list content items: ${error.message}`);
  return (data ?? []) as ContentItem[];
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const client = createServerClient();
  const { data, error } = await client.from('content_items').select('*').eq('id', id).single();
  if (error) return null;
  return data as ContentItem;
}

export async function getContentRevisions(contentItemId: string): Promise<ContentRevision[]> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_revisions')
    .select('*')
    .eq('content_item_id', contentItemId)
    .order('revision_number', { ascending: true });
  if (error) throw new Error(`Failed to load revisions: ${error.message}`);
  return (data ?? []) as ContentRevision[];
}

/**
 * Return the most recent research-review audit event for a given revision, or
 * `null` when none exists. Used by the approval gate to verify a human has
 * acknowledged the research before allowing the revision to be approved.
 *
 * The `target_id` column is the revision id and the `action` column is
 * `revision.research_reviewed`. A revision is considered "reviewed" if any
 * such event exists; later events are idempotent (re-marking reviewed just
 * appends another row, the approval gate only checks for existence).
 */
export async function getRevisionResearchReview(
  revisionId: string,
): Promise<AuditEvent | null> {
  const client = createServerClient();
  const { data, error } = await client
    .from('audit_events')
    .select('*')
    .eq('action', 'revision.research_reviewed')
    .eq('target_type', 'content_revision')
    .eq('target_id', revisionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load research review: ${error.message}`);
  }
  return (data as AuditEvent | null) ?? null;
}

/**
 * Idempotently record a research review for a given revision.
 *
 * Two layers of safety:
 *
 * 1. **Application-level read-before-write** (fast path): a quick read of
 *    `audit_events` for an existing event of this revision. If present,
 *    return it without writing. Avoids a needless insert in the common
 *    case and keeps the function correct in databases where the
 *    application-level constraint below is not (yet) present.
 *
 * 2. **Database-level partial unique index** (race-safe): the migration
 *    `20260720130000_unique_research_review_audit.sql` creates a partial
 *    unique index on `audit_events(target_id) WHERE action =
 *    'revision.research_reviewed' AND target_type = 'content_revision'`.
 *    This closes the race between the pre-read above and the insert
 *    below: if a concurrent request commits in the gap, our insert fails
 *    with a 23505 unique violation and we re-read the existing row.
 *
 * `claimCount` and `urlCount` on subsequent calls are ignored — the first
 * review's metadata is the source of truth. (The application layer
 * (`markResearchReviewed`) parses the fact pack itself, so the count is
 * always derivable; this is just a dashboard convenience.)
 */
export async function recordResearchReviewIfAbsent(input: {
  organization_id: string;
  actor_user_id?: string | null;
  revisionId: string;
  claimCount: number;
  urlCount: number;
}): Promise<AuditEvent> {
  const existing = await getRevisionResearchReview(input.revisionId);
  if (existing) return existing;
  const client = createServerClient();
  const { data, error } = await client
    .from('audit_events')
    .insert({
      organization_id: input.organization_id,
      actor_user_id: input.actor_user_id ?? null,
      actor_type: 'user',
      action: 'revision.research_reviewed',
      target_type: 'content_revision',
      target_id: input.revisionId,
      metadata: { claimCount: input.claimCount, urlCount: input.urlCount },
    })
    .select()
    .maybeSingle();
  if (data) {
    return data as AuditEvent;
  }
  // No row returned. Either Postgres rejected the insert with a unique
  // violation (existing row inserted by a concurrent request between our
  // pre-read and our write), or something else went wrong. Distinguish by
  // the error code; for 23505 (unique_violation) we re-read and return
  // the existing event. Any other error is fatal.
  if (error && error.code !== '23505') {
    throw new Error(`Failed to record research review: ${error.message}`);
  }
  const reExisting = await getRevisionResearchReview(input.revisionId);
  if (!reExisting) {
    // Defensive: the partial index reported a conflict but no row exists.
    // Indicates an index/schema mismatch. Surface as an error rather than
    // silently returning a fabricated event.
    throw new Error(
      'Research review conflict reported but no existing audit event found.',
    );
  }
  return reExisting;
}

export async function createContentItem(
  insert: ContentItemInsert,
): Promise<ContentItem> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_items')
    .insert({
      ...insert,
      status: insert.status ?? 'IDEA',
      risk: insert.risk ?? 'LOW',
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create content item: ${error?.message ?? 'unknown'}`);
  return data as ContentItem;
}

export async function updateContentStatus(
  id: string,
  status: ContentItem['status'],
): Promise<ContentItem> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to update status: ${error?.message ?? 'unknown'}`);
  return data as ContentItem;
}

/**
 * Conditionally update a content item's status. The update only applies when
 * the item's `current_revision_id` and `status` still match the expected
 * values, returning the updated row on success and `null` when the
 * conditions are not met (e.g. another transaction installed a new
 * revision or moved the status off `AWAITING_APPROVAL` between the caller's
 * read and write).
 *
 * Used by the approval gate to make sure the user is approving the
 * revision they actually reviewed, not a revision that was installed
 * concurrently by `generatePreview`.
 */
export async function updateContentStatusIf(input: {
  id: string;
  expectedRevisionId: string;
  expectedStatus: ContentItem['status'];
  newStatus: ContentItem['status'];
}): Promise<ContentItem | null> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_items')
    .update({ status: input.newStatus, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('current_revision_id', input.expectedRevisionId)
    .eq('status', input.expectedStatus)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to update content status: ${error.message}`);
  return (data as ContentItem | null) ?? null;
}

export type ContentRevisionInsert = Omit<
  ContentRevision,
  'id' | 'created_at' | 'render_url'
> & {
  render_url?: string | null;
};

export async function createContentRevision(
  insert: ContentRevisionInsert,
): Promise<ContentRevision> {
  const client = createServerClient();
  const { data, error } = await client
    .from('content_revisions')
    .insert({
      ...insert,
      render_url: insert.render_url ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create revision: ${error?.message ?? 'unknown'}`);
  return data as ContentRevision;
}

export async function setCurrentRevision(
  contentItemId: string,
  revisionId: string,
  status?: ContentItem['status'],
): Promise<ContentItem> {
  const client = createServerClient();
  const update: Record<string, unknown> = {
    current_revision_id: revisionId,
    updated_at: new Date().toISOString(),
  };
  if (status) update.status = status;
  const { data, error } = await client
    .from('content_items')
    .update(update)
    .eq('id', contentItemId)
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to set current revision: ${error?.message ?? 'unknown'}`);
  }
  return data as ContentItem;
}

export async function recordAuditEvent(input: {
  organization_id: string;
  actor_user_id?: string | null;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const client = createServerClient();
  const { error } = await client.from('audit_events').insert({
    organization_id: input.organization_id,
    actor_user_id: input.actor_user_id ?? null,
    actor_type: input.actor_type,
    action: input.action,
    target_type: input.target_type,
    target_id: input.target_id,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(`Failed to record audit event: ${error.message}`);
}
