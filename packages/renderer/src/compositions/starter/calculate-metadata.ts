import type { CalculateMetadataFunction } from 'remotion';
import { START_FPS } from './start-schema';
import type { StartProps } from './start-schema';

/**
 * Metadata-driven timing: derive the composition duration from validated
 * props rather than hardcoding a frame count. Keeps the duration consistent
 * with the declared `durationSeconds` and the fixed 30 FPS fixture rate.
 */
export const calculateStartMetadata: CalculateMetadataFunction<StartProps> = ({
  props,
}) => ({
  durationInFrames: Math.max(
    1,
    Math.round(props.durationSeconds * START_FPS),
  ),
  fps: START_FPS,
});