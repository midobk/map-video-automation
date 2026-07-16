import { MAP_VIDEO_WIDTH } from '../compositions/map-video/map-video-schema';
import { MAX_CAPTION_LINES, splitCaptionText } from './split';
import type { CaptionLanguage, CaptionLine } from './types';

/**
 * Caption layout constants for a 1080×1920 vertical video.
 *
 * - Strip sits at the bottom of the safe area.
 * - Effective width excludes left/right safe-area insets.
 * - Font size and line height are tuned for readability on a phone screen.
 */
export const CAPTION_LAYOUT = {
  fontSize: 40,
  lineHeight: 56,
  paddingHorizontal: 32,
  paddingVertical: 20,
  stripBottom: 80,
  safeLeft: 80,
  safeRight: 80,
  maxLines: MAX_CAPTION_LINES,
} as const;

/**
 * Effective horizontal space available for caption text.
 */
export function captionAvailableWidth(): number {
  return MAP_VIDEO_WIDTH - CAPTION_LAYOUT.safeLeft - CAPTION_LAYOUT.safeRight - CAPTION_LAYOUT.paddingHorizontal * 2;
}

/**
 * Approximate rendered width of a line in pixels.
 *
 * This is a character-count heuristic: Latin characters are estimated at
 * 22 px each, Arabic at 26 px each. It is good enough to detect overflow in
 * unit tests; real overflow prevention relies on the conservative max-line
 * length used by `splitCaptionText`.
 */
export function estimateLineWidth(text: string, language: CaptionLanguage): number {
  const charWidth = language === 'ar' ? 26 : 22;
  return text.length * charWidth;
}

/**
 * Measure caption lines after splitting and report whether they fit inside the
 * safe area. Returns the split lines plus a `fits` boolean.
 */
export function measureCaptionLines(
  text: string,
  language: CaptionLanguage,
): { lines: string[]; fits: boolean } {
  const lines = splitCaptionText(text, language);
  const availableWidth = captionAvailableWidth();
  const availableHeight = CAPTION_LAYOUT.maxLines * CAPTION_LAYOUT.lineHeight + CAPTION_LAYOUT.paddingVertical * 2;

  const fits =
    lines.length <= CAPTION_LAYOUT.maxLines &&
    lines.every((line) => estimateLineWidth(line, language) <= availableWidth) &&
    lines.length * CAPTION_LAYOUT.lineHeight + CAPTION_LAYOUT.paddingVertical * 2 <= availableHeight;

  return { lines, fits };
}

/**
 * Build timed caption lines for a scene by distributing a caption text across
 * a frame window. Used when a scene provides a single caption but no explicit
 * per-line timing.
 */
export function distributeCaptionLines(
  text: string,
  language: CaptionLanguage,
  startFrame: number,
  endFrame: number,
): CaptionLine[] {
  const lines = splitCaptionText(text, language);
  if (lines.length === 0) return [];

  const span = Math.max(1, endFrame - startFrame);
  const chunk = Math.floor(span / lines.length);

  return lines.map((text, index) => {
    const lineStart = startFrame + index * chunk;
    const lineEnd = index === lines.length - 1 ? endFrame : lineStart + chunk;
    return { text, startFrame: lineStart, endFrame: lineEnd };
  });
}
