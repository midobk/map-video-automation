/**
 * Resolve map-camera progress from a scene-local Remotion frame.
 *
 * `useCurrentFrame()` resets to zero inside each `<Sequence>`, so callers must
 * never subtract an absolute composition start frame here.
 */
export function resolveMapZoomProgress(frame: number, durationInFrames: number): number {
  const finalFrame = Math.max(1, Math.floor(durationInFrames) - 1);
  return Math.max(0, Math.min(1, frame / finalFrame));
}
