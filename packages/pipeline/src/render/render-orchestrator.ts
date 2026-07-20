import { bundle } from '@remotion/bundler';
import { renderMedia, type RenderMediaOptions } from '@remotion/renderer';
import type { VideoConfig } from 'remotion/no-react';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { VideoPlan } from '../schemas/video-plan.js';
import {
  buildSceneSchedule,
  concatenateWavBuffers,
  encodeWav,
  MAP_VIDEO_FPS,
  MAP_VIDEO_HEIGHT,
  MAP_VIDEO_WIDTH,
  MockVoiceProvider,
  type MapVideoPlan,
} from '@mapvideo/renderer';
import { alignCaptionsForScene } from '../captions/index.js';

/** Maximum allowed drift between the synthesized audio and the plan total. */
const AUDIO_DURATION_TOLERANCE_SECONDS = 1.0;

/** Sample rate (Hz) the MockVoiceProvider and the silent fallback both target. */
const AUDIO_SAMPLE_RATE = 44100;

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
  // Remotion's bundler handles .ts entries via Webpack/esbuild, so resolve to
  // the workspace studio's source entry point explicitly.
  const studioPackageJson = require.resolve('@mapvideo/remotion-studio/package.json');
  const entryPoint = path.join(path.dirname(studioPackageJson), 'src', 'index.ts');

  const resolvedPlan = await ensurePlanAudio(plan, contentItemId);
  verifyAudioDuration(resolvedPlan);

  const bundled = await bundle({
    entryPoint,
  });

  const outputFolder = path.join(outputDirectory, contentItemId);
  await fs.mkdir(outputFolder, { recursive: true });
  const outputFile = path.join(outputFolder, `${revisionNumber}.mp4`);
  const publicUrl = `/renders/${contentItemId}/${revisionNumber}.mp4`;

  const inputProps = prepareInputProps(resolvedPlan);

  const durationInFrames = Math.max(1, Math.round(resolvedPlan.totalDurationSeconds * MAP_VIDEO_FPS));

  const composition: VideoConfig = {
    id: compositionId,
    width: MAP_VIDEO_WIDTH,
    height: MAP_VIDEO_HEIGHT,
    fps: MAP_VIDEO_FPS,
    durationInFrames,
    defaultProps: {},
    props: inputProps,
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

  return { renderUrl: publicUrl, durationSeconds: resolvedPlan.totalDurationSeconds };
}

/**
 * Ensure the plan has a synthesized `audioAsset` and matching `audioDurationSeconds`.
 *
 * If the plan already has an `audioAsset`, returns it unchanged. Otherwise
 * synthesizes per-scene voiceovers via `MockVoiceProvider` (silent fallback for
 * scenes without `voiceoverText`), concatenates them into a single WAV, and
 * writes the result to the remotion-studio's public dir so Remotion's
 * `staticFile()` can resolve it at bundle time.
 *
 * @returns The plan with `audioAsset` and `audioDurationSeconds` populated.
 */
export async function ensurePlanAudio(
  plan: VideoPlan,
  contentItemId: string,
): Promise<VideoPlan> {
  if (plan.rendererPlan.audioAsset) {
    return plan;
  }

  const schedule = buildSceneSchedule(plan.rendererPlan as MapVideoPlan);
  const provider = new MockVoiceProvider();
  const wavBuffers: ArrayBuffer[] = [];
  let totalDurationSeconds = 0;

  for (let index = 0; index < plan.rendererPlan.scenes.length; index += 1) {
    const scene = plan.rendererPlan.scenes[index]!;
    const { durationInFrames } = schedule[index]!;
    const sceneDurationSeconds = durationInFrames / MAP_VIDEO_FPS;
    const targetSamples = Math.max(1, Math.round(sceneDurationSeconds * AUDIO_SAMPLE_RATE));

    let perSceneBuffer: ArrayBuffer;
    if (scene.voiceoverText && scene.voiceoverText.trim().length > 0) {
      const result = await provider.synthesize({ text: scene.voiceoverText });
      perSceneBuffer = padOrTruncateWav(result.audioBuffer, targetSamples);
      totalDurationSeconds += sceneDurationSeconds;
    } else {
      perSceneBuffer = encodeWav(new Float32Array(targetSamples));
      totalDurationSeconds += sceneDurationSeconds;
    }
    wavBuffers.push(perSceneBuffer);
  }

  const concatenated = concatenateWavBuffers(wavBuffers);

  // The remotion-studio package has no exports map; its `public/` directory is
  // resolved by Remotion's `staticFile()` at bundle time. Writing there keeps
  // the audio co-located with the studio so any re-render can reuse it.
  const require = createRequire(import.meta.url);
  const studioPackageJson = require.resolve('@mapvideo/remotion-studio/package.json');
  const studioPublicDir = path.join(path.dirname(studioPackageJson), 'public');
  const renderDir = path.join(studioPublicDir, 'renders', contentItemId);
  await fs.mkdir(renderDir, { recursive: true });
  const audioFileName = 'narration.wav';
  const audioFilePath = path.join(renderDir, audioFileName);
  await fs.writeFile(audioFilePath, Buffer.from(concatenated));

  const audioAsset = `renders/${contentItemId}/${audioFileName}`;

  return {
    ...plan,
    rendererPlan: {
      ...plan.rendererPlan,
      audioAsset,
      audioDurationSeconds: totalDurationSeconds,
    },
  };
}

/**
 * Verify the synthesized audio length matches the plan's expected total.
 *
 * Throws when the drift exceeds `AUDIO_DURATION_TOLERANCE_SECONDS`. This
 * catches upstream bugs (a missing or extra scene in the provider loop, a
 * scene whose voiceover length drifted past its frame budget) before the
 * expensive `renderMedia` call.
 */
export function verifyAudioDuration(plan: VideoPlan): void {
  if (plan.rendererPlan.audioDurationSeconds === undefined) {
    return;
  }
  const drift = Math.abs(
    plan.rendererPlan.audioDurationSeconds - plan.totalDurationSeconds,
  );
  if (drift > AUDIO_DURATION_TOLERANCE_SECONDS) {
    throw new Error(
      `Audio duration mismatch for content item: expected ${plan.totalDurationSeconds.toFixed(2)}s, ` +
        `got ${plan.rendererPlan.audioDurationSeconds.toFixed(2)}s ` +
        `(drift ${drift.toFixed(2)}s exceeds ${AUDIO_DURATION_TOLERANCE_SECONDS}s tolerance).`,
    );
  }
}

/**
 * Pad a 16-bit PCM mono WAV with silence (or truncate its tail) so the
 * resulting buffer holds exactly `targetSamples` samples.
 *
 * Assumes the source WAV is 16-bit PCM mono at `AUDIO_SAMPLE_RATE` Hz. The
 * `concatenateWavBuffers` helper used downstream requires all input buffers
 * to share format, so the per-scene buffers must already match the sample
 * rate and channel count produced by `encodeWav`.
 */
function padOrTruncateWav(buffer: ArrayBuffer, targetSamples: number): ArrayBuffer {
  if (buffer.byteLength < 44) {
    throw new Error('WAV buffer is too short to contain a header');
  }
  const headerBytes = 44;
  const sourceSamples = (buffer.byteLength - headerBytes) / 2;
  if (sourceSamples === targetSamples) {
    return buffer;
  }
  if (sourceSamples > targetSamples) {
    // Truncate the tail.
    return buffer.slice(0, headerBytes + targetSamples * 2);
  }
  // Pad with zeros (silence). Build a fresh header so the data size matches.
  const target = encodeWav(new Float32Array(targetSamples));
  const sourceSamplesBytes = new Uint8Array(buffer, 44, sourceSamples * 2);
  const targetView = new Uint8Array(target);
  targetView.set(sourceSamplesBytes, 44);
  return target;
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
