import { defineComposition } from '../registry';
import { MapVideoComposition } from './MapVideoComposition';
import { calculateMapVideoMetadata } from './calculate-metadata';
import { mapVideoPlanSchema, MAP_VIDEO_FPS, MAP_VIDEO_WIDTH, MAP_VIDEO_HEIGHT } from './map-video-schema';
import { rtlMapVideoFixture } from '../../fixtures/map-video-rtl';

/**
 * Registry entry for the Arabic/RTL map-video fixture.
 */
export const mapVideoRtlComposition = defineComposition({
  id: 'map-video-rtl',
  component: MapVideoComposition,
  schema: mapVideoPlanSchema,
  calculateMetadata: calculateMapVideoMetadata,
  fps: MAP_VIDEO_FPS,
  width: MAP_VIDEO_WIDTH,
  height: MAP_VIDEO_HEIGHT,
  durationInFrames: Math.round(
    rtlMapVideoFixture.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) * MAP_VIDEO_FPS,
  ),
  defaultProps: rtlMapVideoFixture,
});
