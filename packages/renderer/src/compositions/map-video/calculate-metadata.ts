import type { CalculateMetadataFunction } from 'remotion';
import { MAP_VIDEO_FPS } from './map-video-schema';
import type { MapVideoPlan } from './map-video-schema';

/**
 * Compute the total plan duration in seconds from a validated plan.
 *
 * Transitions overlap scene boundaries, so the total is the sum of scene
 * durations minus the overlap budget. The result is never negative.
 */
export function calculatePlanDurationSeconds(plan: MapVideoPlan): number {
  const sceneSum = plan.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const overlapCount = Math.max(0, plan.scenes.length - 1);
  const overlapSeconds = plan.transitionSeconds * overlapCount;
  return Math.max(0, sceneSum - overlapSeconds);
}

/**
 * Metadata-driven timing for the generic map-video composition.
 *
 * The total duration is derived from the sum of scene durations minus the
 * transition overlap budget. The static `durationInFrames` used by the Studio
 * composition registration matches this computed value.
 */
export const calculateMapVideoMetadata: CalculateMetadataFunction<MapVideoPlan> = ({
  props,
}) => {
  const durationInFrames = Math.max(
    1,
    Math.round(calculatePlanDurationSeconds(props) * MAP_VIDEO_FPS),
  );
  return {
    durationInFrames,
    fps: MAP_VIDEO_FPS,
  };
};

/**
 * Helper to compute the start frame and duration of each scene in a validated
 * plan. Used by the composition to lay out <Sequence> elements.
 *
 * Each scene after the first starts before the previous one ends by
 * `transitionSeconds`, creating an overlapping cross-dissolve.
 */
export function buildSceneSchedule(plan: MapVideoPlan): {
  id: string;
  startFrame: number;
  durationInFrames: number;
}[] {
  const transitionFrames = Math.max(0, Math.round(plan.transitionSeconds * MAP_VIDEO_FPS));
  let cursor = 0;
  return plan.scenes.map((scene, index) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * MAP_VIDEO_FPS));
    const entry = { id: scene.id, startFrame: cursor, durationInFrames };
    // Every scene except the last overlaps the following scene by the
    // transition budget.
    const overlap = index === plan.scenes.length - 1 ? 0 : transitionFrames;
    cursor += durationInFrames - overlap;
    return entry;
  });
}
