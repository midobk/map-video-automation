import type { CaptionLanguage } from '../captions/types';
import {
  MAP_VIDEO_FPS,
  type MapVideoScene,
} from '../compositions/map-video/map-video-schema';

export interface SceneCaptionPresentation {
  language: CaptionLanguage;
  startFrame: number;
  endFrame: number;
}

/**
 * Resolve the caption language and full scene-local timing window.
 *
 * Older plans remain compatible by defaulting omitted caption language to
 * English. The end frame is always derived from the scene duration, so captions
 * cannot disappear after a hidden fixed constant.
 */
export function resolveSceneCaptionPresentation(
  scene: MapVideoScene,
): SceneCaptionPresentation {
  return {
    language: scene.captionLanguage ?? 'en',
    startFrame: 0,
    endFrame: Math.max(1, Math.round(scene.durationSeconds * MAP_VIDEO_FPS)),
  };
}
