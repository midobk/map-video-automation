import { defineComposition } from '../registry';
import { MapVideoComposition } from './MapVideoComposition';
import { calculateMapVideoMetadata } from './calculate-metadata';
import {
  mapVideoPlanSchema,
  MAP_VIDEO_FPS,
  MAP_VIDEO_WIDTH,
  MAP_VIDEO_HEIGHT,
} from './map-video-schema';
import { countryZoomFixture } from '../../fixtures/map-video-country-zoom';

/**
 * Registry entry for the country-zoom map-video fixture.
 */
export const mapVideoCountryZoomComposition = defineComposition({
  id: 'map-video-country-zoom',
  component: MapVideoComposition,
  schema: mapVideoPlanSchema,
  calculateMetadata: calculateMapVideoMetadata,
  fps: MAP_VIDEO_FPS,
  width: MAP_VIDEO_WIDTH,
  height: MAP_VIDEO_HEIGHT,
  durationInFrames: Math.round(
    countryZoomFixture.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) *
      MAP_VIDEO_FPS,
  ),
  defaultProps: countryZoomFixture,
});
