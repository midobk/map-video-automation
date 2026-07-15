import { z } from 'zod';

/**
 * CSS hex color string: `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` (case
 * insensitive). The fixture themes use `#rrggbb`. This replaces
 * `@remotion/zod-types`' `zColor` so the renderer depends on the single
 * workspace `zod` version (no duplicate zod) while still validating colors.
 */
export const colorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u,
    'Expected a hex color string like "#0b0e14".',
  );

/**
 * Validated theme model for the renderer.
 *
 * Brand-specific tokens are explicit example themes (see `examples.ts`), never
 * hidden global constants. Every composition receives its theme through props
 * and the theme is validated by Zod before rendering.
 */
const mapColorSchema = z.object({
  ocean: colorSchema,
  land: colorSchema,
  border: colorSchema,
  highlight: colorSchema,
  label: colorSchema,
});

export const videoThemeSchema = z.object({
  colors: z.object({
    background: colorSchema,
    surface: colorSchema,
    primary: colorSchema,
    accent: colorSchema,
    text: colorSchema,
    mutedText: colorSchema,
  }),
  map: mapColorSchema.optional(),
  typography: z.object({
    headingFamily: z.string().min(1),
    bodyFamily: z.string().min(1),
  }),
  borderRadius: z.number().finite().nonnegative(),
  spacingScale: z.number().finite().positive(),
});

export type VideoTheme = z.infer<typeof videoThemeSchema>;

/**
 * Resolve and validate a theme. Throws on invalid input — never accept
 * unvalidated JSON as a render theme.
 */
export function parseTheme(input: unknown): VideoTheme {
  return videoThemeSchema.parse(input);
}

/** Safe-parse helper that returns a typed result without throwing. */
export function safeParseTheme(input: unknown) {
  return videoThemeSchema.safeParse(input);
}
