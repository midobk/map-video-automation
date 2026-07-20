import { bundle } from '@remotion/bundler';
import { renderMedia, type RenderMediaOptions } from '@remotion/renderer';
import type { VideoConfig } from 'remotion/no-react';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { videoPlanSchema, type VideoPlan } from '../schemas/video-plan.js';
import {
  buildSceneSchedule,
  concatenateWavBuffers,
  encodeWav,
  MAP_VIDEO_FPS,
  MAP_VIDEO_HEIGHT,
  MAP_VIDEO_WIDTH,
  MockVoiceProvider,
  type MapVideoPlan,
  type VoiceProvider,
} from '@mapvideo/renderer';
// Server-only helpers (ffprobe/ffmpeg via node:child_process). Kept out of the
// browser-facing main index so Remotion's webpack can bundle the composition.
import {
  concatAudioFiles,
  generateSilentAudioFile,
  probeAudioDurationSeconds,
} from '@mapvideo/renderer/voice/server';
import { createVoiceProvider } from '../tts/tts-adapter-factory.js';
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
export interface EnsurePlanAudioDeps {
  /** Voice provider; defaults to the env-driven `createVoiceProvider()`. */
  provider?: VoiceProvider;
  /** ffprobe-based duration probe; defaults to `probeAudioDurationSeconds`. */
  probe?: (filePath: string) => Promise<number>;
  /** Audio concatenation; defaults to `concatAudioFiles` (ffmpeg). */
  concat?: (inputs: string[], outputPath: string) => Promise<void>;
  /** Silent-clip generation; defaults to `generateSilentAudioFile` (ffmpeg). */
  silent?: (durationSeconds: number, outputPath: string) => Promise<void>;
}

export async function ensurePlanAudio(
  plan: VideoPlan,
  contentItemId: string,
  deps: EnsurePlanAudioDeps = {},
): Promise<VideoPlan> {
  if (plan.rendererPlan.audioAsset) {
    return plan;
  }

  const provider = deps.provider ?? createVoiceProvider();
  if (provider instanceof MockVoiceProvider) {
    return ensureMockPlanAudio(plan, contentItemId, provider);
  }
  return ensureRealProviderAudio(plan, contentItemId, provider, deps);
}

/**
 * Resolve the remotion-studio `public/renders/<contentItemId>` directory.
 *
 * The studio package has no exports map; its `public/` directory is resolved
 * by Remotion's `staticFile()` at bundle time. Writing audio there keeps it
 * co-located with the studio so any re-render can reuse it.
 */
async function resolveStudioRenderDir(contentItemId: string): Promise<string> {
  const require = createRequire(import.meta.url);
  const studioPackageJson = require.resolve('@mapvideo/remotion-studio/package.json');
  const studioPublicDir = path.join(path.dirname(studioPackageJson), 'public');
  const renderDir = path.join(studioPublicDir, 'renders', contentItemId);
  await fs.mkdir(renderDir, { recursive: true });
  return renderDir;
}

/**
 * Mock-provider audio path: synthesize a placeholder tone per scene and
 * **force** each clip to the scene's planned duration via `padOrTruncateWav`
 * (truncate long, silence-pad short). Concatenates WAVs into `narration.wav`.
 *
 * This path is deterministic and unchanged from the pre-real-provider
 * implementation — it keeps the `render-fixtures` CI job and the
 * `render-orchestrator` tests byte-stable.
 */
async function ensureMockPlanAudio(
  plan: VideoPlan,
  contentItemId: string,
  provider: MockVoiceProvider,
): Promise<VideoPlan> {
  const schedule = buildSceneSchedule(plan.rendererPlan as MapVideoPlan);
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
  const renderDir = await resolveStudioRenderDir(contentItemId);
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
 * Real-provider audio path (ElevenLabs etc.): synthesize each scene's
 * `voiceoverText` to its own clip, **measure** the clip's real duration with
 * ffprobe, and overwrite the scene's `durationSeconds` to match — the inverse
 * of the mock path (scene is timed to audio, not audio forced to scene). This
 * keeps spoken narration aligned with scene cuts without time-compression.
 *
 * Per-scene clips (plus silent fillers for scenes without voiceover) are
 * concatenated into `narration.mp3` via ffmpeg. `audioDurationSeconds` is set
 * to the sum of scene durations so `verifyAudioDuration` passes by
 * construction. The mutated plan is re-validated against `videoPlanSchema`.
 */
async function ensureRealProviderAudio(
  plan: VideoPlan,
  contentItemId: string,
  provider: VoiceProvider,
  deps: EnsurePlanAudioDeps,
): Promise<VideoPlan> {
  const probe = deps.probe ?? probeAudioDurationSeconds;
  const concat = deps.concat ?? concatAudioFiles;
  const silent = deps.silent ?? generateSilentAudioFile;
  const renderDir = await resolveStudioRenderDir(contentItemId);
  const clipPaths: string[] = [];

  try {
    for (let index = 0; index < plan.rendererPlan.scenes.length; index += 1) {
      const scene = plan.rendererPlan.scenes[index]!;
      const text = scene.voiceoverText?.trim();

      if (!text) {
        // No narration for this scene: keep its planned duration and fill with
        // silence so the concatenated track stays aligned with the timeline.
        const silentPath = path.join(renderDir, `scene-${index}.mp3`);
        await silent(scene.durationSeconds, silentPath);
        clipPaths.push(silentPath);
        continue;
      }

      const result = await provider.synthesize({ text });
      const clipPath = path.join(renderDir, `scene-${index}.${result.format}`);
      await fs.writeFile(clipPath, Buffer.from(result.audioBuffer));
      clipPaths.push(clipPath);

      const measured = await probe(clipPath);
      // The schema requires durationSeconds in (0, 120]; clamp to a safe band.
      scene.durationSeconds = Math.min(120, Math.max(0.5, measured));
    }

    const totalDurationSeconds = plan.rendererPlan.scenes.reduce(
      (sum, scene) => sum + scene.durationSeconds,
      0,
    );
    plan.totalDurationSeconds = totalDurationSeconds;

    if (clipPaths.length > 0) {
      const audioFileName = 'narration.mp3';
      const audioFilePath = path.join(renderDir, audioFileName);
      await concat(clipPaths, audioFilePath);
      plan.rendererPlan.audioAsset = `renders/${contentItemId}/${audioFileName}`;
      plan.rendererPlan.audioDurationSeconds = totalDurationSeconds;
    }

    // Re-validate the mutated plan against the schema before rendering.
    videoPlanSchema.parse(plan);
    return plan;
  } finally {
    // Clean up per-scene clips; the concatenated narration asset stays.
    await Promise.all(clipPaths.map((clipPath) => fs.rm(clipPath, { force: true })));
  }
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
