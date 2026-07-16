'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createContentItem as dbCreateContentItem,
  getDefaultProject,
  listContentItems,
  getContentItem,
  getContentRevisions,
  updateContentStatus as dbUpdateContentStatus,
  recordAuditEvent,
} from '@mapvideo/db';
import type { ContentItem } from '@mapvideo/db';
import { readServerEnvironment } from '../environment.server';

const createContentSchema = z.object({
  title: z.string().min(1).max(120),
  topicPrompt: z.string().min(1).max(2000),
  language: z.enum(['en', 'fr', 'ar']).default('en'),
  targetDurationSeconds: z.coerce.number().int().min(15).max(90).default(30),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;

export type ContentListItem = Pick<
  ContentItem,
  'id' | 'title' | 'status' | 'risk' | 'updated_at'
>;

/**
 * Server action: create a new content item from the topic entry form.
 */
export async function createContentItem(
  input: CreateContentInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const parsed = createContentSchema.parse(input);
    const project = await getDefaultProject();
    if (!project) {
      return { success: false, error: 'No default project is configured.' };
    }

    const item = await dbCreateContentItem({
      project_id: project.id,
      title: parsed.title,
      topic_prompt: parsed.topicPrompt,
      status: 'IDEA',
      risk: 'LOW',
      current_revision_id: null,
      created_by: null,
    });

    await recordAuditEvent({
      organization_id: project.organization_id,
      actor_type: 'user',
      action: 'content.create',
      target_type: 'content_item',
      target_id: item.id,
      metadata: { language: parsed.language, targetDurationSeconds: parsed.targetDurationSeconds },
    });

    revalidatePath('/dashboard/content');
    return { success: true, id: item.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create content item.';
    return { success: false, error: message };
  }
}

/**
 * Server action: load all content items for the default project.
 */
export async function loadDashboardContent(): Promise<{
  items: ContentListItem[];
  error?: string;
}> {
  try {
    const project = await getDefaultProject();
    if (!project) return { items: [] };
    const items = await listContentItems(project.id);
    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        risk: item.risk,
        updated_at: item.updated_at,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load content.';
    return { items: [], error: message };
  }
}

/**
 * Server action: load a single content item plus its revisions.
 */
export async function loadContentDetail(id: string): Promise<{
  item?: ContentItem;
  revisions?: { revision_number: number; language: string; created_at: string }[];
  audit?: { action: string; created_at: string }[];
  error?: string;
}> {
  try {
    const [item, revisions] = await Promise.all([
      getContentItem(id),
      getContentRevisions(id),
    ]);
    if (!item) return { error: 'Content item not found.' };
    return {
      item,
      revisions: revisions.map((r) => ({
        revision_number: r.revision_number,
        language: r.language,
        created_at: r.created_at,
      })),
      audit: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load content detail.';
    return { error: message };
  }
}

/**
 * Server action: advance a content item to a new workflow status.
 */
export async function updateContentStatus(
  id: string,
  status: ContentItem['status'],
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await dbUpdateContentStatus(id, status);
    const project = await getDefaultProject();
    if (project) {
      await recordAuditEvent({
        organization_id: project.organization_id,
        actor_type: 'user',
        action: `content.status.${status.toLowerCase()}`,
        target_type: 'content_item',
        target_id: id,
        metadata: { newStatus: status },
      });
    }
    revalidatePath(`/dashboard/content/${id}`);
    revalidatePath('/dashboard/content');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update status.';
    return { success: false, error: message };
  }
}

/**
 * Server action: record an approval or rejection decision.
 *
 * The publishing kill switch is checked again here as a safety belt; even if the
 * UI allows the button, a real publication job cannot start while the switch is
 * enabled.
 */
export async function recordApprovalDecision(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const environment = readServerEnvironment();
    if (decision === 'APPROVED' && environment.PUBLISHING_KILL_SWITCH) {
      return {
        success: false,
        error:
          'Publishing kill switch is enabled. Approval is recorded locally only and cannot trigger publication.',
      };
    }

    const nextStatus: ContentItem['status'] = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await dbUpdateContentStatus(id, nextStatus);
    const project = await getDefaultProject();
    if (project) {
      await recordAuditEvent({
        organization_id: project.organization_id,
        actor_type: 'user',
        action: `approval.${decision.toLowerCase()}`,
        target_type: 'content_item',
        target_id: id,
        metadata: { killSwitchEnabled: environment.PUBLISHING_KILL_SWITCH },
      });
    }
    revalidatePath(`/dashboard/content/${id}`);
    revalidatePath('/dashboard/content');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record decision.';
    return { success: false, error: message };
  }
}
