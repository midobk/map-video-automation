import type { CaptionLanguage } from './types';

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
