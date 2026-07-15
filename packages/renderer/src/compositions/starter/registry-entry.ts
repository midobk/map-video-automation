import { defineComposition } from '../registry';
import { StartComposition } from './StartComposition';
import { calculateStartMetadata } from './calculate-metadata';
import { startSchema, START_FPS, START_WIDTH, START_HEIGHT } from './start-schema';
import { starterFixtureProps } from '../../fixtures';

/**
 * Registry entry for the PR 1A starter fixture composition.
 *
 * Kept as a registered composition so `apps/remotion-studio` can iterate the
 * registry without special-casing any composition.
 */
export const starterComposition = defineComposition({
  id: 'starter',
  component: StartComposition,
  schema: startSchema,
  calculateMetadata: calculateStartMetadata,
  fps: START_FPS,
  width: START_WIDTH,
  height: START_HEIGHT,
  durationInFrames: Math.round(starterFixtureProps.durationSeconds * START_FPS),
  defaultProps: starterFixtureProps,
});
