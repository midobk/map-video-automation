import type { CaptionLanguage } from './types';

/** Maximum number of lines supported by the bottom caption strip. */
export const MAX_CAPTION_LINES = 3;

/**
 * Default maximum line lengths for caption splitting.
 *
 * These are conservative character-count budgets for a 1080×1920 frame with the
 * default caption font size. They keep lines short enough to stay inside the
 * safe area without requiring runtime DOM measurement.
 */
export const DEFAULT_MAX_LINE_LENGTH: Record<CaptionLanguage, number> = {
  en: 40,
  fr: 40,
  ar: 34,
};

/**
 * Split caption text into lines that fit within the language-specific character
 * budget, preferring word boundaries. Arabic is split on whitespace the same
 * way; the renderer applies `direction: rtl` separately.
 */
export function splitCaptionText(
  text: string,
  language: CaptionLanguage,
  maxLength = DEFAULT_MAX_LINE_LENGTH[language],
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const words = trimmed.split(/\s+/u);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxLength) {
      // Flush current line before forcing the long word.
      if (current) {
        lines.push(current);
        current = '';
      }
      // Break the oversized word at maxLength boundaries.
      for (let i = 0; i < word.length; i += maxLength) {
        const chunk = word.slice(i, i + maxLength);
        if (i + maxLength < word.length) {
          lines.push(chunk);
        } else {
          current = chunk;
        }
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/**
 * Split a caption for defensive direct rendering.
 *
 * Valid map-video plans are rejected when they exceed `MAX_CAPTION_LINES`. This
 * helper additionally protects direct `CaptionStrip` callers by capping output
 * and adding an ellipsis instead of allowing extra lines to overlap scene
 * content.
 */
export function splitCaptionTextForRendering(
  text: string,
  language: CaptionLanguage,
  maxLines = MAX_CAPTION_LINES,
): string[] {
  const lines = splitCaptionText(text, language);
  const normalizedMaxLines = Number.isFinite(maxLines)
    ? Math.max(0, Math.floor(maxLines))
    : MAX_CAPTION_LINES;

  if (lines.length <= normalizedMaxLines) return lines;
  if (normalizedMaxLines === 0) return [];

  const visible = lines.slice(0, normalizedMaxLines);
  const lastIndex = visible.length - 1;
  const lastLine = visible[lastIndex]!;
  const maxLength = DEFAULT_MAX_LINE_LENGTH[language];
  const shortened = lastLine.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  visible[lastIndex] = `${shortened}…`;
  return visible;
}
