import { bundle } from '@remotion/bundler';
import { renderMedia, type RenderMediaOptions } from '@remotion/renderer';
import type { VideoConfig } from 'remotion/no-react';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { VideoPlan } from '../schemas/video-plan';
import {
  MAP_VIDEO_FPS,
  MAP_VIDEO_HEIGHT,
  MAP_VIDEO_WIDTH,
} from '@mapvideo/renderer/compositions/map-video/schema';
import { alignCaptionsForScene } from '../captions';

/**
 * Render a video plan to a local MP4.
 *
 * @param plan Validated video plan with renderer plan and narration.
 * @param outputDirectory Root directory for renders (e.g. apps/web/public/renders).
 * @param contentItemId Used to namespace the render directory.
 * @param revisionNumber Revision number for the output filename.
 * @returns Public URL path relative to the Next.js public directory.
 */
export async function renderVideoPreview(
  plan: VideoPlan,
  outputDirectory: string,
  contentItemId: string,
  revisionNumber: number,
): Promise<{ renderUrl: string; durationSeconds: number }> {
  const compositionId = 'map-video';
  const require = createRequire(import.meta.url);
  const entryPoint = require.resolve('@mapvideo/remotion-studio/src/index');

  const bundled = await bundle({
    entryPoint,
  });

  const outputFolder = path.join(outputDirectory, contentItemId);
  await fs.mkdir(outputFolder, { recursive: true });
  const outputFile = path.join(outputFolder, `${revisionNumber}.mp4`);
  const publicUrl = `/renders/${contentItemId}/${revisionNumber}.mp4`;

  const inputProps = prepareInputProps(plan);

  const durationInFrames = Math.max(1, Math.round(plan.totalDurationSeconds * MAP_VIDEO_FPS));

  const composition: VideoConfig = {
    id: compositionId,
    width: MAP_VIDEO_WIDTH,
    height: MAP_VIDEO_HEIGHT,
    fps: MAP_VIDEO_FPS,
    durationInFrames,
    defaultProps: {},
    props: {},
    defaultCodec: 'h264',
    defaultOutName: null,
    defaultVideoImageFormat: null,
    defaultPixelFormat: null,
    defaultProResProfile: null,
    defaultSampleRate: null,
  };

  const renderOptions: RenderMediaOptions = {
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputFile,
    inputProps,
    licenseKey: null,
  };

  await renderMedia(renderOptions);

  return { renderUrl: publicUrl, durationSeconds: plan.totalDurationSeconds };
}

/**
 * Attach per-scene caption lines to the renderer plan.
 *
 * The renderer's MapVideoComposition uses `voiceoverText` for captions; the
 * pipeline injects aligned caption lines here so the render can display them.
 */
function prepareInputProps(plan: VideoPlan): Record<string, unknown> {
  return {
    ...plan.rendererPlan,
    scenes: plan.rendererPlan.scenes.map((scene) => ({
      ...scene,
      captionLines: alignCaptionsForScene(scene, scene.durationSeconds, scene.captionLanguage ?? 'en'),
    })),
  };
}
