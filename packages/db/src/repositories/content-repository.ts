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
 * If a `revision.research_reviewed` event already exists for this revision,
 * returns the existing event without writing a new one. Otherwise inserts a
 * new audit event. The `metadata.claimCount` and `metadata.urlCount` fields
 * are required for the dashboard summary.
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
    .single();
  if (error || !data) {
    throw new Error(`Failed to record research review: ${error?.message ?? 'unknown'}`);
  }
  return data as AuditEvent;
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
