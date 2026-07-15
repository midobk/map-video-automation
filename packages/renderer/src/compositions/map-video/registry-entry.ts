import { defineComposition } from '../registry';
import { MapVideoComposition } from './MapVideoComposition';
import { calculateMapVideoMetadata } from './calculate-metadata';
import { mapVideoPlanSchema, MAP_VIDEO_FPS, MAP_VIDEO_WIDTH, MAP_VIDEO_HEIGHT } from './map-video-schema';
import { neutralMapVideoFixture } from '../../fixtures/map-video-neutral';

/**
 * Registry entry for the generic map-video composition.
 */
export const mapVideoComposition = defineComposition({
  id: 'map-video',
  component: MapVideoComposition,
  schema: mapVideoPlanSchema,
  calculateMetadata: calculateMapVideoMetadata,
  fps: MAP_VIDEO_FPS,
  width: MAP_VIDEO_WIDTH,
  height: MAP_VIDEO_HEIGHT,
  durationInFrames: Math.round(
    neutralMapVideoFixture.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) * MAP_VIDEO_FPS,
  ),
  defaultProps: neutralMapVideoFixture,
});
