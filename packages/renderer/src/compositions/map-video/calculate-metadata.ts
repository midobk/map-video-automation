import type { CalculateMetadataFunction } from 'remotion';
import { MAP_VIDEO_FPS } from './map-video-schema';
import type { MapVideoPlan } from './map-video-schema';

function durationFrames(durationSeconds: number): number {
  return Math.max(1, Math.round(durationSeconds * MAP_VIDEO_FPS));
}

/**
 * Bound an overlap to both adjacent scenes while preserving at least one
 * non-overlapped frame per scene. This guarantees the schedule cursor always
 * moves forward, even when a valid scene is shorter than the requested
 * transition.
 */
function boundedOverlapFrames(
  requestedFrames: number,
  currentDurationFrames: number,
  nextDurationFrames: number,
): number {
  return Math.min(
    requestedFrames,
    Math.max(0, currentDurationFrames - 1),
    Math.max(0, nextDurationFrames - 1),
  );
}

/**
 * Helper to compute the start frame and duration of each scene in a validated
 * plan. Used by the composition to lay out <Sequence> elements.
 */
export function buildSceneSchedule(plan: MapVideoPlan): {
  id: string;
  startFrame: number;
  durationInFrames: number;
}[] {
  const requestedTransitionFrames = Math.max(
    0,
    Math.round(plan.transitionSeconds * MAP_VIDEO_FPS),
  );
  const durations = plan.scenes.map((scene) => durationFrames(scene.durationSeconds));
  let cursor = 0;

  return plan.scenes.map((scene, index) => {
    const sceneDurationFrames = durations[index]!;
    const entry = {
      id: scene.id,
      startFrame: cursor,
      durationInFrames: sceneDurationFrames,
    };

    const nextDurationFrames = durations[index + 1];
    if (nextDurationFrames !== undefined) {
      const overlapFrames = boundedOverlapFrames(
        requestedTransitionFrames,
        sceneDurationFrames,
        nextDurationFrames,
      );
      cursor += sceneDurationFrames - overlapFrames;
    }

    return entry;
  });
}

/** Compute the exact composition duration from the bounded frame schedule. */
export function calculatePlanDurationFrames(plan: MapVideoPlan): number {
  const schedule = buildSceneSchedule(plan);
  const last = schedule.at(-1);
  if (!last) return 1;
  return Math.max(1, last.startFrame + last.durationInFrames);
}

/** Compute the total plan duration in seconds from the exact frame schedule. */
export function calculatePlanDurationSeconds(plan: MapVideoPlan): number {
  return calculatePlanDurationFrames(plan) / MAP_VIDEO_FPS;
}

/** Metadata-driven timing for the generic map-video composition. */
export const calculateMapVideoMetadata: CalculateMetadataFunction<MapVideoPlan> = ({
  props,
}) => {
  return {
    durationInFrames: calculatePlanDurationFrames(props),
    fps: MAP_VIDEO_FPS,
  };
};
