import { MAP_VIDEO_FPS } from '../compositions/map-video/map-video-schema';
import type { MapVideoPlan, MapVideoScene } from '../compositions/map-video/map-video-schema';
import { buildSceneSchedule } from '../compositions/map-video/calculate-metadata';
import { captionLineSchema } from './types';
import type { CaptionLanguage, CaptionLine, CaptionTrack } from './types';

/**
 * Default caption page size used when distributing a scene's voiceover text
 * across its frame window. Two to six words per page matches the blueprint's
 * recommendation for fast vertical content.
 */
const DEFAULT_WORDS_PER_PAGE = 4;

/**
 * Minimum page duration in frames. Keeps a caption visible long enough to read
 * even when a scene is very short or has few words.
 */
const MIN_PAGE_FRAMES = 15;

/**
 * Group an array into chunks of at most `size` items.
 */
function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/**
 * Build a timed caption track for a map-video plan by distributing each scene's
 * `voiceoverText` across that scene's frame window.
 *
 * This is a deterministic text-to-frames aligner. It is intentionally simple:
 * it does not need external tools like Whisper, so fixture generation stays
 * offline and reproducible. A future PR can replace or extend this with audio-
 * derived word timings while keeping the same `CaptionTrack` output shape.
 *
 * `language` defaults to English and is taken from the first scene's
 * `captionLanguage` if set, otherwise from the explicit override.
 */
export function alignCaptionsFromPlan(
  plan: MapVideoPlan,
  languageOverride?: CaptionLanguage,
): CaptionTrack {
  const language =
    languageOverride ?? (plan.scenes[0]?.captionLanguage as CaptionLanguage | undefined) ?? 'en';
  const schedule = buildSceneSchedule(plan);
  const lines: CaptionLine[] = [];

  for (let index = 0; index < plan.scenes.length; index++) {
    const scene = plan.scenes[index]!;
    const { startFrame, durationInFrames } = schedule[index]!;
    const sceneLines = alignSceneVoiceover(scene, language, startFrame, durationInFrames);
    lines.push(...sceneLines);
  }

  return {
    language,
    lines: lines.map((line) => captionLineSchema.parse(line)),
  };
}

/**
 * Align a single scene's voiceover text to its frame window.
 *
 * - Splits the text into words.
 * - Groups words into pages of `wordsPerPage`.
 * - Distributes pages evenly across the scene duration.
 * - Enforces a minimum page duration so very short pages remain readable.
 */
export function alignSceneVoiceover(
  scene: MapVideoScene,
  language: CaptionLanguage,
  startFrame: number,
  durationInFrames: number,
  wordsPerPage = DEFAULT_WORDS_PER_PAGE,
): CaptionLine[] {
  const text = scene.voiceoverText?.trim();
  if (!text || durationInFrames <= 0) return [];

  const words = text.split(/\s+/u);
  const pages = chunk(words, wordsPerPage);
  if (pages.length === 0) return [];

  // Each page gets at least MIN_PAGE_FRAMES, but we never exceed the scene.
  const rawChunk = Math.floor(durationInFrames / pages.length);
  const pageDuration = Math.max(MIN_PAGE_FRAMES, rawChunk);

  return pages.map((pageWords, index) => {
    const lineStart = startFrame + index * pageDuration;
    const isLast = index === pages.length - 1;
    const lineEnd = isLast
      ? startFrame + durationInFrames
      : Math.min(lineStart + pageDuration, startFrame + durationInFrames);
    return {
      text: pageWords.join(' '),
      startFrame: lineStart,
      endFrame: Math.max(lineStart + 1, lineEnd),
    };
  });
}

/**
 * Convert a duration in seconds to frames at the map-video FPS.
 */
export function secondsToFrames(seconds: number): number {
  return Math.max(1, Math.round(seconds * MAP_VIDEO_FPS));
}

/**
 * Convert a frame count to seconds at the map-video FPS.
 */
export function framesToSeconds(frames: number): number {
  return frames / MAP_VIDEO_FPS;
}
