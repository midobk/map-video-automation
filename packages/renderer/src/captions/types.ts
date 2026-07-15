import { z } from 'zod';

/** Supported caption languages. */
export const CAPTION_LANGUAGES = ['en', 'fr', 'ar'] as const;

export const captionLanguageSchema = z.enum(CAPTION_LANGUAGES);

export type CaptionLanguage = z.infer<typeof captionLanguageSchema>;

/** Text direction derived from the caption language. */
export type CaptionDirection = 'ltr' | 'rtl';

/** Resolved direction for each supported language. */
export const captionDirection = (language: CaptionLanguage): CaptionDirection => {
  if (language === 'ar') return 'rtl';
  return 'ltr';
};

/** A single timed caption line. */
export const captionLineSchema = z.object({
  text: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
});

export type CaptionLine = z.infer<typeof captionLineSchema>;

/** Timing window for an entire caption block. */
export const captionTimingSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
});

export type CaptionTiming = z.infer<typeof captionTimingSchema>;

/**
 * Safe-area inset for captions on a 1080×1920 vertical video.
 *
 * The caption strip is pinned to the bottom inside this padding so it never
 * touches the frame edges.
 */
export const CAPTION_SAFE_AREA = {
  top: 80,
  bottom: 80,
  left: 80,
  right: 80,
} as const;
