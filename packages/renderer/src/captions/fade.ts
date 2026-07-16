export const DEFAULT_CAPTION_FADE_FRAMES = 8;

export interface CaptionFadeEnvelope {
  inputRange: [number, number, number, number];
  outputRange: [number, number, number, number];
}

/**
 * Build a strictly increasing fade envelope for a caption frame window.
 *
 * Very short scenes cannot support both a fade-in and fade-out without
 * duplicate or reversed interpolation points. In that case this returns null
 * and the caller should render the caption at full opacity for the lifetime of
 * its enclosing scene sequence.
 */
export function resolveCaptionFadeEnvelope(
  startFrame: number,
  endFrame: number,
  maxFadeFrames = DEFAULT_CAPTION_FADE_FRAMES,
): CaptionFadeEnvelope | null {
  const span = Math.max(0, endFrame - startFrame);
  const fadeFrames = Math.min(
    Math.max(0, Math.floor(maxFadeFrames)),
    Math.floor((span - 1) / 2),
  );

  if (fadeFrames < 1) return null;

  return {
    inputRange: [
      startFrame,
      startFrame + fadeFrames,
      endFrame - fadeFrames,
      endFrame,
    ],
    outputRange: [0, 1, 1, 0],
  };
}
