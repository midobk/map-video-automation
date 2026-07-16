import { z } from 'zod';

/** CSS hex color string used by deterministic renderer themes. */
export const colorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u,
    'Expected a hex color string like "#0b0e14".',
  );

const mapColorSchema = z.object({
  ocean: colorSchema,
  land: colorSchema,
  border: colorSchema,
  highlight: colorSchema,
  context: colorSchema,
  label: colorSchema,
});

/** Validated theme model for the renderer. */
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

export function parseTheme(input: unknown): VideoTheme {
  return videoThemeSchema.parse(input);
}

export function safeParseTheme(input: unknown) {
  return videoThemeSchema.safeParse(input);
}
