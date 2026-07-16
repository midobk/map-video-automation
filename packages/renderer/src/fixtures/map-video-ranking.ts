import { mapVideoPlanSchema } from '../compositions/map-video/map-video-schema';
import { neutralDarkTheme } from '../themes/examples';
import type { MapVideoPlan } from '../compositions/map-video/map-video-schema';
import { generatedNarration } from './generated/map-video-ranking-narration';

export const rankingFixtureName = 'map-video-ranking' as const;

/**
 * Deterministic ranking fixture.
 *
 * Uses stable, non-sensitive geography: the seven continents ranked by land
 * area. No dynamic facts, disputes, or comparisons of people.
 */
export const rankingFixture: MapVideoPlan = mapVideoPlanSchema.parse({
  theme: neutralDarkTheme,
  projectId: 'ranking',
  transitionSeconds: 0.5,
  narration: generatedNarration,
  scenes: [
    {
      id: 'rank-intro',
      kind: 'title',
      durationSeconds: 2,
      title: 'Largest Continents',
      subtitle: 'By land area, in millions of square kilometres',
      eyebrow: 'Ranking Fixture',
      voiceoverText: 'Largest continents by land area, in millions of square kilometres.',
    },
    {
      id: 'continents-ranking',
      kind: 'ranking',
      durationSeconds: 4,
      title: 'Continents by Land Area',
      direction: 'desc',
      items: [
        { label: 'Asia', value: '44.6' },
        { label: 'Africa', value: '30.4' },
        { label: 'North America', value: '24.7' },
        { label: 'South America', value: '17.8' },
        { label: 'Antarctica', value: '14.0' },
        { label: 'Europe', value: '10.2' },
        { label: 'Oceania', value: '8.5' },
      ],
      voiceoverText:
        'Asia leads, followed by Africa, North America, South America, Antarctica, Europe, and Oceania.',
    },
    {
      id: 'rank-outro',
      kind: 'outro',
      durationSeconds: 2,
      title: 'Explore More',
      subtitle: 'Neutral geography, rendered deterministically',
      voiceoverText: 'Explore more neutral geography, rendered deterministically.',
    },
  ],
});
