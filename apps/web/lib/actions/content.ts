'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  createContentItem as dbCreateContentItem,
  createContentRevision,
  getDefaultProject,
  hasDatabaseConfig,
  listContentItems,
  getContentItem,
  getContentRevisions,
  updateContentStatus as dbUpdateContentStatus,
  setCurrentRevision,
  recordAuditEvent,
} from '@mapvideo/db';
import type { ContentItem, ContentRevision } from '@mapvideo/db';
import { readServerEnvironment } from '../environment.server';

const missingDatabaseError =
  'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
  'to your environment (e.g. root .env.local or Vercel preview env vars).';

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

export type PreviewRevision = Pick<
  ContentRevision,
  'id' | 'revision_number' | 'language' | 'render_url' | 'video_plan' | 'created_at'
>;

/**
 * Server action: create a new content item from the topic entry form.
 */
export async function createContentItem(
  input: CreateContentInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const parsed = createContentSchema.parse(input);

    if (!hasDatabaseConfig()) {
      return { success: false, error: missingDatabaseError };
    }
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
  if (!hasDatabaseConfig()) {
    return { items: [], error: missingDatabaseError };
  }

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
  revisions?: PreviewRevision[];
  audit?: { action: string; created_at: string }[];
  error?: string;
}> {
  if (!hasDatabaseConfig()) {
    return { error: missingDatabaseError };
  }

  try {
    const [item, revisions] = await Promise.all([
      getContentItem(id),
      getContentRevisions(id),
    ]);
    if (!item) return { error: 'Content item not found.' };
    return {
      item,
      revisions: revisions.map((r) => ({
        id: r.id,
        revision_number: r.revision_number,
        language: r.language,
        render_url: r.render_url,
        video_plan: r.video_plan,
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
  if (!hasDatabaseConfig()) {
    return { success: false, error: missingDatabaseError };
  }

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

    if (!hasDatabaseConfig()) {
      return { success: false, error: missingDatabaseError };
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

/**
 * Server action: run the AI research-to-render pipeline for a content item.
 *
 * - Uses the configured research provider (OpenAI when available, otherwise mock).
 * - Generates a script, synthesizes placeholder audio, and renders an MP4
 *   preview to apps/web/public/renders when running in local mode.
 * - Stores the resulting revision and points the content item to it.
 *
 * On Vercel preview the local render step may not have a Chrome/Node render
 * environment; the plan is still saved so the dashboard can display a
 * composition preview from the stored data.
 */
export async function generatePreview(
  id: string,
  options: { targetDurationSeconds?: number } = {},
): Promise<
  | {
      success: true;
      revision: PreviewRevision;
      renderUrl: string | null;
      durationSeconds: number;
      message: string;
    }
  | { success: false; error: string }
> {
  if (!hasDatabaseConfig()) {
    return { success: false, error: missingDatabaseError };
  }

  try {
    const environment = readServerEnvironment();
    const project = await getDefaultProject();
    if (!project) {
      return { success: false, error: 'No default project is configured.' };
    }

    const item = await getContentItem(id);
    if (!item) {
      return { success: false, error: 'Content item not found.' };
    }

    await dbUpdateContentStatus(id, 'RENDERING');

    const pipeline = await import('@mapvideo/pipeline');
    const ResearchAdapter =
      environment.PROVIDER_MODE === 'openai' && environment.OPENAI_API_KEY
        ? new pipeline.OpenAiResearchAdapter(environment.OPENAI_API_KEY)
        : new pipeline.MockResearchAdapter();

    const factPack = await ResearchAdapter.research(item.topic_prompt);

    const targetDurationSeconds = Math.min(
      90,
      Math.max(15, options.targetDurationSeconds ?? 30),
    );

    const videoPlan = pipeline.generateVideoPlan(factPack, {
      projectId: project.id,
      targetDurationSeconds,
    });

    const narrationSegments = videoPlan.rendererPlan.scenes.map((scene) => ({
      sceneId: scene.id,
      text: scene.voiceoverText ?? '',
    }));

    const voiceProvider = pipeline.createVoiceProvider();
    const ttsResult = await pipeline.synthesizeNarration(narrationSegments, voiceProvider);

    const existingRevisions = await getContentRevisions(id);
    const nextRevisionNumber = (existingRevisions.at(-1)?.revision_number ?? 0) + 1;

    let renderUrl: string | null = null;
    let renderError: string | null = null;
    if (environment.RENDER_MODE === 'local') {
      try {
        const renderModule = await import(/* webpackIgnore: true */ '@mapvideo/pipeline/render');
        const renderDirectory = path.join(process.cwd(), 'public', 'renders');
        const { renderUrl: publicUrl } = await renderModule.renderVideoPreview(
          videoPlan,
          renderDirectory,
          item.id,
          nextRevisionNumber,
        );
        renderUrl = publicUrl;
      } catch (error) {
        renderError = error instanceof Error ? error.message : String(error);
      }
    }

    const revision = await createContentRevision({
      content_item_id: item.id,
      revision_number: nextRevisionNumber,
      language: 'en',
      fact_pack: factPack as Record<string, unknown>,
      script: {
        narrationBySceneId: videoPlan.narrationBySceneId,
        totalDurationSeconds: videoPlan.totalDurationSeconds,
        audioDurationSeconds: ttsResult.durationSeconds,
      } as Record<string, unknown>,
      video_plan: videoPlan.rendererPlan as Record<string, unknown>,
      content_hash: createHash('sha256').update(item.topic_prompt).digest('hex'),
      render_url: renderUrl,
      created_by: null,
    });

    await setCurrentRevision(id, revision.id, 'AWAITING_APPROVAL');

    await recordAuditEvent({
      organization_id: project.organization_id,
      actor_type: 'user',
      action: 'content.preview.generated',
      target_type: 'content_item',
      target_id: item.id,
      metadata: {
        revisionId: revision.id,
        revisionNumber: revision.revision_number,
        renderUrl,
        renderError,
        providerMode: environment.PROVIDER_MODE,
        renderMode: environment.RENDER_MODE,
      },
    });

    revalidatePath(`/dashboard/content/${id}`);
    revalidatePath('/dashboard/content');

    const message = renderUrl
      ? 'Preview rendered and saved.'
      : renderError
        ? `Plan generated, but local render failed: ${renderError}`
        : 'Plan generated. Local rendering is skipped in cloud render mode.';

    return {
      success: true,
      revision: {
        id: revision.id,
        revision_number: revision.revision_number,
        language: revision.language,
        render_url: revision.render_url,
        video_plan: revision.video_plan,
        created_at: revision.created_at,
      },
      renderUrl,
      durationSeconds: videoPlan.totalDurationSeconds,
      message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate preview.';
    return { success: false, error: message };
  }
}
