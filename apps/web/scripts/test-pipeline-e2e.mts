#!/usr/bin/env tsx
/**
 * End-to-end pipeline integration test.
 *
 * Mirrors the `generatePreview` server action in apps/web/lib/actions/content.ts
 * but executes outside the Next.js runtime so it can be run from the CLI
 * during local development and CI.
 *
 * Usage:
 *   pnpm --filter @mapvideo/web exec tsx scripts/test-pipeline-e2e.mts \
 *     [--item <id>] [--topic "..."]
 *
 * Loads env from apps/web/.env.local before any imports that read process.env.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Load apps/web/.env.local into process.env (no external dep).
const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '..', '.env.local');
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

// Dynamic imports after env loading
const pipeline = await import('@mapvideo/pipeline');
const renderModule = await import('@mapvideo/pipeline/render');
const db = await import('@mapvideo/db');
const { readServerEnvironment } = await import('@mapvideo/shared');

function parseArgs() {
  const args = process.argv.slice(2);
  let itemId: string | undefined;
  let topic: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--item' && args[i + 1]) {
      itemId = args[i + 1];
      i += 1;
    } else if (arg === '--topic' && args[i + 1]) {
      topic = args[i + 1];
      i += 1;
    }
  }
  return { itemId, topic };
}

async function main() {
  const { itemId, topic } = parseArgs();
  const environment = readServerEnvironment();

  if (!db.hasDatabaseConfig()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL + SERVICE_ROLE_KEY in .env.local');
  }

  const project = await db.getDefaultProject();
  if (!project) {
    throw new Error('No default project is configured in the database.');
  }

  let item = itemId ? await db.getContentItem(itemId) : null;
  if (!item) {
    if (topic) {
      console.log(`[e2e] No item provided, creating one with topic: "${topic}"`);
      item = await db.createContentItem({
        project_id: project.id,
        title: topic.slice(0, 60),
        topic_prompt: topic,
        status: 'IDEA',
        risk: 'LOW',
        current_revision_id: null,
        created_by: null,
      });
      console.log(`[e2e] Created content item ${item.id}`);
    } else {
      throw new Error('Pass --item <uuid> or --topic "..."');
    }
  }

  console.log(`[e2e] Using item ${item.id} (topic: ${item.topic_prompt})`);
  console.log(`[e2e] Env: PROVIDER_MODE=${environment.PROVIDER_MODE} RENDER_MODE=${environment.RENDER_MODE} TTS_PROVIDER=${environment.TTS_PROVIDER}`);

  await db.updateContentStatus(item.id, 'RENDERING');

  const ResearchAdapter =
    environment.PROVIDER_MODE === 'openai' && environment.OPENAI_API_KEY
      ? new pipeline.OpenAiResearchAdapter(environment.OPENAI_API_KEY)
      : new pipeline.MockResearchAdapter();

  const factPack = await ResearchAdapter.research(item.topic_prompt);
  console.log(`[e2e] Research complete (${factPack.claims.length} claims, risk=${factPack.riskLevel})`);

  const videoPlan = pipeline.generateVideoPlan(factPack, {
    projectId: project.id,
    targetDurationSeconds: 30,
  });
  console.log(`[e2e] Video plan: ${videoPlan.rendererPlan.scenes.length} scenes, ${videoPlan.totalDurationSeconds.toFixed(1)}s`);

  const narrationSegments = videoPlan.rendererPlan.scenes.map((scene) => ({
    sceneId: scene.id,
    text: scene.voiceoverText ?? '',
  }));

  const voiceProvider = pipeline.createVoiceProvider();
  const ttsResult = await pipeline.synthesizeNarration(narrationSegments, voiceProvider);
  console.log(`[e2e] TTS: ${ttsResult.durationSeconds.toFixed(1)}s synthesized across ${ttsResult.segments.length} segments`);

  const existingRevisions = await db.getContentRevisions(item.id);
  const nextRevisionNumber = (existingRevisions.at(-1)?.revision_number ?? 0) + 1;

  let renderUrl: string | null = null;
  let renderError: string | null = null;
  if (environment.RENDER_MODE === 'local') {
    try {
      const renderDirectory = path.join(process.cwd(), 'public', 'renders');
      const result = await renderModule.renderVideoPreview(
        videoPlan,
        renderDirectory,
        item.id,
        nextRevisionNumber,
      );
      renderUrl = result.renderUrl;
      console.log(`[e2e] Local render produced ${result.renderUrl} (${result.durationSeconds.toFixed(1)}s)`);
    } catch (error) {
      renderError = error instanceof Error ? error.message : String(error);
      console.error(`[e2e] Local render failed: ${renderError}`);
    }
  } else {
    console.log('[e2e] RENDER_MODE != local, skipping local render');
  }

  const revision = await db.createContentRevision({
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

  await db.setCurrentRevision(item.id, revision.id, 'AWAITING_APPROVAL');

  await db.recordAuditEvent({
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
      source: 'cli-e2e-harness',
    },
  });

  const summary = {
    itemId: item.id,
    revisionId: revision.id,
    revisionNumber: revision.revision_number,
    renderUrl,
    renderError,
    scenes: videoPlan.rendererPlan.scenes.length,
    durationSeconds: videoPlan.totalDurationSeconds,
    ttsDurationSeconds: ttsResult.durationSeconds,
    factPackRisk: factPack.risk,
  };
  console.log('[e2e] DONE', JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[e2e] FAILED', error);
  process.exitCode = 1;
});
