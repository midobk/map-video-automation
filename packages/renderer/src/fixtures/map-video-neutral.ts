import { mapVideoPlanSchema } from '../compositions/map-video/map-video-schema';
import { neutralDarkTheme } from '../themes/examples';
import type { MapVideoPlan } from '../compositions/map-video/map-video-schema';

export const neutralMapVideoFixtureName = 'map-video-neutral' as const;

export const neutralMapVideoFixture: MapVideoPlan = mapVideoPlanSchema.parse({
  theme: neutralDarkTheme,
  projectId: 'neutral-map',
  transitionSeconds: 0.5,
  scenes: [
    {
      id: 'intro',
      kind: 'title',
      durationSeconds: 2.5,
      title: 'Our World',
      subtitle: 'Five continents and one shared ocean',
      eyebrow: 'Map Video Fixture',
    },
    {
      id: 'continents',
      kind: 'map-highlight',
      durationSeconds: 3,
      label: 'Continents',
      highlighted: ['Africa', 'Asia', 'North America', 'South America', 'Antarctica', 'Oceania'],
      projection: 'natural-earth',
      labels: [
        { text: 'Africa', longitude: 20, latitude: 5 },
        { text: 'Asia', longitude: 90, latitude: 45 },
        { text: 'North America', longitude: -100, latitude: 50 },
        { text: 'South America', longitude: -60, latitude: -15 },
        { text: 'Antarctica', longitude: 0, latitude: -80 },
        { text: 'Oceania', longitude: 135, latitude: -25 },
      ],
      caption: 'The continents cover about 29% of the surface.',
    },
    {
      id: 'comparison',
      kind: 'comparison',
      durationSeconds: 2.5,
      title: 'Land and Water',
      left: { label: 'Land', value: '29%' },
      right: { label: 'Ocean', value: '71%' },
      caption: 'Oceans dominate the planet.',
    },
    {
      id: 'outro',
      kind: 'outro',
      durationSeconds: 2,
      title: 'Explore More',
      subtitle: 'Neutral geography, rendered deterministically',
    },
  ],
});
