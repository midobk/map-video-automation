import type { CaptionLanguage, CaptionLine } from '../captions/types';
import {
  MAP_VIDEO_FPS,
  type MapVideoScene,
} from '../compositions/map-video/map-video-schema';

export interface SceneCaptionPresentation {
  language: CaptionLanguage;
  startFrame: number;
  endFrame: number;
  /**
   * Optional timed caption lines, in the scene's local frame space.
   *
   * When present, the renderer picks the single line whose window contains
   * the current frame (see `selectActiveCaptionLine`); the per-scene
   * `startFrame`/`endFrame` still cover the whole scene. When absent, scenes
   * fall back to the original single-`caption` rendering path.
   */
  lines?: CaptionLine[];
}

/**
 * Pick the caption line whose half-open `[startFrame, endFrame)` window
 * contains the supplied frame.
 *
 * - `lines` are assumed to be sorted by `startFrame` ascending. The map-video
 *   schema's `captionLines` refinement does not enforce sort order at runtime
 *   (it only rejects overlaps), so the renderer tolerates unsorted input by
 *   returning the first match it finds.
 * - The check is inclusive on `startFrame` and exclusive on `endFrame`, which
 *   matches the schema's "non-overlapping half-open intervals" guarantee and
 *   makes the boundary frames deterministic across adjacent scenes.
 * - Returns `null` when no line is active at `currentFrame` so the caller
 *   renders nothing — the typical case between two adjacent captions and at
 *   the very start or end of the scene.
 */
export function selectActiveCaptionLine(
  lines: readonly CaptionLine[] | undefined,
  currentFrame: number,
): CaptionLine | null {
  if (!lines || lines.length === 0) return null;
  for (const line of lines) {
    if (currentFrame >= line.startFrame && currentFrame < line.endFrame) {
      return line;
    }
  }
  return null;
}

/**
 * Resolve the caption language, full scene-local timing window, and any
 * pre-aligned caption lines.
 *
 * Older plans remain compatible by defaulting omitted caption language to
 * English. The end frame is always derived from the scene duration, so captions
 * cannot disappear after a hidden fixed constant. `lines` is included only
 * when the scene declares `captionLines`; the schema-level refinement has
 * already verified non-overlap, so no further validation runs here.
 */
export function resolveSceneCaptionPresentation(
  scene: MapVideoScene,
): SceneCaptionPresentation {
  const endFrame = Math.max(1, Math.round(scene.durationSeconds * MAP_VIDEO_FPS));
  return {
    language: scene.captionLanguage ?? 'en',
    startFrame: 0,
    endFrame,
    ...(scene.captionLines !== undefined ? { lines: scene.captionLines } : {}),
  };
}
