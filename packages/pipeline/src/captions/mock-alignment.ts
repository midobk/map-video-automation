import { MAP_VIDEO_FPS } from '@mapvideo/renderer/compositions/map-video/schema';
import type { MapVideoScene } from '@mapvideo/renderer/compositions/map-video/schema';
import { splitCaptionText } from '@mapvideo/renderer/captions/split';
import type { CaptionLine } from '@mapvideo/renderer/captions/types';

/**
 * Deterministic caption alignment for mock/dummy audio.
 *
 * Distributes caption lines evenly across a scene's duration. This is not
 * word-accurate; real alignment should use Whisper on the final audio.
 */
export function alignCaptionsForScene(
  scene: MapVideoScene,
  sceneDurationSeconds: number,
  language: 'en' | 'fr' | 'ar' = 'en',
): CaptionLine[] {
  const text = scene.caption ?? scene.voiceoverText ?? '';
  if (!text) return [];

  const lines = splitCaptionText(text, language);
  const durationFrames = Math.max(1, Math.round(sceneDurationSeconds * MAP_VIDEO_FPS));
  const lineDurationFrames = Math.floor(durationFrames / Math.max(1, lines.length));

  return lines.map((line, index) => ({
    text: line,
    startFrame: index * lineDurationFrames,
    endFrame: Math.min(durationFrames, (index + 1) * lineDurationFrames),
  }));
}
