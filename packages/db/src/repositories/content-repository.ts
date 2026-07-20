import { createServerClient } from '../client';
import type { ContentItem, ContentItemInsert, ContentRevision } from '../schema';

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
