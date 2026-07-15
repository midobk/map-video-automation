import { mapVideoPlanSchema } from '../compositions/map-video/map-video-schema';
import { neutralDarkTheme } from '../themes/examples';
import type { MapVideoPlan } from '../compositions/map-video/map-video-schema';

export const countryZoomFixtureName = 'map-video-country-zoom' as const;

/**
 * Deterministic country-zoom fixture.
 *
 * Exercises vector map rendering for Morocco, Canada, Algeria, and France.
 * Canada and France are multipart / island-rich, which verifies that the D3
 * Geo fit handles multi-polygon features. All geography is stable and
 * non-sensitive.
 */
export const countryZoomFixture: MapVideoPlan = mapVideoPlanSchema.parse({
  theme: neutralDarkTheme,
  projectId: 'country-zoom',
  transitionSeconds: 0.5,
  scenes: [
    {
      id: 'cz-intro',
      kind: 'title',
      durationSeconds: 2,
      title: 'Country Zoom',
      subtitle: 'Four neutral locations, rendered from vector data',
      eyebrow: 'Map Video Fixture',
    },
    {
      id: 'morocco',
      kind: 'map-highlight',
      durationSeconds: 2.5,
      label: 'Morocco',
      highlighted: ['Morocco'],
      projection: 'natural-earth',
      focusIsoCodes: ['MAR'],
      labels: [{ text: 'Morocco', longitude: -7, latitude: 32 }],
      caption: 'A kingdom on the northwest coast of Africa.',
    },
    {
      id: 'canada',
      kind: 'map-highlight',
      durationSeconds: 2.5,
      label: 'Canada',
      highlighted: ['Canada'],
      projection: 'natural-earth',
      focusIsoCodes: ['CAN'],
      labels: [{ text: 'Canada', longitude: -95, latitude: 60 }],
      caption: 'A multipart country spanning a continent.',
    },
    {
      id: 'algeria',
      kind: 'map-highlight',
      durationSeconds: 2.5,
      label: 'Algeria',
      highlighted: ['Algeria'],
      projection: 'natural-earth',
      focusIsoCodes: ['DZA'],
      labels: [{ text: 'Algeria', longitude: 2, latitude: 28 }],
      caption: 'The largest country in Africa by land area.',
    },
    {
      id: 'france',
      kind: 'map-highlight',
      durationSeconds: 2.5,
      label: 'France',
      highlighted: ['France'],
      projection: 'natural-earth',
      focusIsoCodes: ['FRA'],
      labels: [{ text: 'France', longitude: 2, latitude: 46 }],
      caption: 'A multipart country across several continents.',
    },
    {
      id: 'cz-outro',
      kind: 'outro',
      durationSeconds: 2,
      title: 'Explore More',
      subtitle: 'Neutral geography, rendered deterministically',
    },
  ],
});
