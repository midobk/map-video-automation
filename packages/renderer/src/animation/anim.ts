import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

/**
 * Deterministic animation helpers for the Map Video Automation renderer.
 *
 * Everything here is frame-driven: no `Date.now()`, no `Math.random()`, no
 * current-time reads. The same input frame always produces the same output, so
 * the same composition renders identically every time.
 */

/** Smooth spring with no bounce — the default for calm, trust-first motion. */
export const SMOOTH = { damping: 200 } as const;
/** Snappy with minimal bounce — for UI elements appearing. */
export const SNAPPY = { damping: 26, stiffness: 200 } as const;
/** Gentle bounce — used sparingly for confirmation reveals. */
export const GENTLE = { damping: 14, stiffness: 140 } as const;

/**
 * Standard scene enter/exit envelope. Designed to be used inside a `<Sequence>`,
 * where `useCurrentFrame()` is 0 at the scene start and `durationInFrames`
 * (from `useVideoConfig`) equals the scene length.
 *
 * Returns an opacity and a vertical offset that fades + lifts the scene in,
 * then fades it out over the final frames for a calm cross-dissolve.
 */
export const useSceneTransition = (options?: {
  enter?: number;
  exit?: number;
  lift?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = options?.enter ?? 18;
  const exit = options?.exit ?? 14;
  const lift = options?.lift ?? 28;

  const enterProgress = spring({
    frame,
    fps,
    config: SMOOTH,
    durationInFrames: enter,
  });

  const exitProgress = interpolate(
    frame,
    [durationInFrames - exit, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const opacity = enterProgress * (1 - exitProgress);
  const translateY =
    interpolate(enterProgress, [0, 1], [lift, 0]) + exitProgress * -lift * 0.6;

  return { frame, opacity, translateY, enterProgress, exitProgress };
};

/** Fade + rise for a single element that enters at `delay` frames. */
export const useReveal = (
  delay = 0,
  options?: { duration?: number; lift?: number },
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SMOOTH,
    durationInFrames: options?.duration ?? 20,
  });
  return {
    progress,
    opacity: progress,
    translateY: interpolate(progress, [0, 1], [options?.lift ?? 22, 0]),
  };
};

/** Linear-with-easing 0..1 ramp between two frames. */
export const ramp = (
  frame: number,
  from: number,
  to: number,
  easing: EasingFunction = Easing.inOut(Easing.cubic),
) =>
  interpolate(frame, [from, to], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Re-exported easing function type for the `ramp` signature. */
export type EasingFunction = (t: number) => number;