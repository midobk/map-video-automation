import { z } from 'zod';
import { videoThemeSchema } from '../../themes/theme-schema';

/**
 * Props for the generic starter fixture composition.
 *
 * The fixture is fully props-driven and Zod-validated. It carries a validated
 * theme (never unvalidated JSON), neutral text, and a duration. It contains no
 * client-specific content and needs no database, API, provider, or network.
 */
export const startSchema = z.object({
  theme: videoThemeSchema,
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200),
  /** Fixture length in seconds. The metadata helper converts this to frames. */
  durationSeconds: z.number().finite().positive().max(60).default(6),
});

export type StartProps = z.infer<typeof startSchema>;

/** Fixed fixture timing and dimensions. */
export const START_FPS = 30;
export const START_WIDTH = 1080;
export const START_HEIGHT = 1920;