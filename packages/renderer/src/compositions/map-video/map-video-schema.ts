import { z } from 'zod';
import { MAX_CAPTION_LINES, splitCaptionText } from '../../captions/split';
import { captionLanguageSchema } from '../../captions/types';
import { isKnownIso3 } from '../../geo/country-dictionary';
import { videoThemeSchema } from '../../themes/theme-schema';

/** Fixed geometry for all map-video compositions. */
export const MAP_VIDEO_FPS = 30;
export const MAP_VIDEO_WIDTH = 1080;
export const MAP_VIDEO_HEIGHT = 1920;

const baseSceneSchema = z.object({
  id: z.string().min(1).max(64),
  durationSeconds: z.number().finite().positive().max(120),
  caption: z.string().max(300).optional(),
  captionLanguage: captionLanguageSchema.optional(),
  voiceoverText: z.string().max(800).optional(),
});

export const titleSceneSchema = baseSceneSchema.extend({
  kind: z.literal('title'),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  eyebrow: z.string().max(80).optional(),
});

const iso3Schema = z
  .string()
  .regex(/^[A-Z]{3}$/u, 'Expected an uppercase ISO 3166-1 alpha-3 code.')
  .refine(isKnownIso3, 'Unknown ISO 3166-1 alpha-3 code.');

const iso3ListSchema = z
  .array(iso3Schema)
  .max(8)
  .superRefine((codes, context) => {
    if (new Set(codes).size !== codes.length) {
      context.addIssue({ code: 'custom', message: 'ISO3 lists may not contain duplicates.' });
    }
  })
  .default([]);

const mapLabelSchema = z.object({
  text: z.string().min(1).max(80),
  longitude: z.number().finite().min(-180).max(180),
  latitude: z.number().finite().min(-90).max(90),
});

export const mapHighlightSceneSchema = baseSceneSchema.extend({
  kind: z.literal('map-highlight'),
  label: z.string().min(1).max(120),
  highlighted: z.array(z.string().min(1).max(80)).min(1).max(8),
  projection: z.enum(['natural-earth', 'mercator', 'orthographic']).default('natural-earth'),
  focusIsoCodes: iso3ListSchema,
  contextIsoCodes: iso3ListSchema,
  labels: z.array(mapLabelSchema).max(8).default([]),
  mapAsset: z.string().min(1).max(200).optional(),
});

export const rankingSceneSchema = baseSceneSchema.extend({
  kind: z.literal('ranking'),
  title: z.string().min(1).max(120),
  direction: z.enum(['asc', 'desc']).default('desc'),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        value: z.string().min(1).max(40),
      }),
    )
    .min(2)
    .max(7),
});

export const statCardSceneSchema = baseSceneSchema.extend({
  kind: z.literal('stat-card'),
  headline: z.string().min(1).max(120),
  value: z.string().min(1).max(40),
  subtext: z.string().max(200).optional(),
});

export const comparisonSceneSchema = baseSceneSchema.extend({
  kind: z.literal('comparison'),
  title: z.string().min(1).max(120),
  left: z.object({
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(80),
  }),
  right: z.object({
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(80),
  }),
});

export const captionSceneSchema = baseSceneSchema.extend({
  kind: z.literal('caption'),
  text: z.string().min(1).max(400),
});

export const outroSceneSchema = baseSceneSchema.extend({
  kind: z.literal('outro'),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
});

const mapVideoSceneUnionSchema = z.discriminatedUnion('kind', [
  titleSceneSchema,
  mapHighlightSceneSchema,
  rankingSceneSchema,
  statCardSceneSchema,
  comparisonSceneSchema,
  captionSceneSchema,
  outroSceneSchema,
]);

export const mapVideoSceneSchema = mapVideoSceneUnionSchema.superRefine((scene, context) => {
  if (
    scene.kind === 'map-highlight' &&
    scene.mapAsset === undefined &&
    scene.focusIsoCodes.length === 0 &&
    scene.contextIsoCodes.length === 0 &&
    scene.labels.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      path: ['focusIsoCodes'],
      message: 'Map highlights require a static mapAsset or explicit vector geography.',
    });
  }

  if (scene.caption === undefined) return;

  const language = scene.captionLanguage ?? 'en';
  const lineCount = splitCaptionText(scene.caption, language).length;
  if (lineCount > MAX_CAPTION_LINES) {
    context.addIssue({
      code: 'custom',
      path: ['caption'],
      message: `Caption wraps to ${lineCount} lines; the bottom caption strip supports at most ${MAX_CAPTION_LINES}.`,
    });
  }
});

export const mapVideoPlanSchema = z.object({
  theme: videoThemeSchema,
  projectId: z.string().min(1).max(64),
  scenes: z.array(mapVideoSceneSchema).min(1).max(32),
  transitionSeconds: z.number().finite().nonnegative().max(2).default(0.5),
  /**
   * Optional path to a pre-rendered narration audio asset. Resolved by the
   * composition at runtime via the `staticFile()` helper, so values should
   * be relative to the Remotion public dir (e.g. `fixtures/narration/intro.wav`).
   * When omitted, the composition renders silent.
   */
  audioAsset: z.string().min(1).max(512).optional(),
  /**
   * Optional total duration of the narration audio in seconds. Captured at
   * audio-generation time so render code can verify the audio length matches
   * the scene schedule without re-probing the file.
   */
  audioDurationSeconds: z.number().finite().positive().max(600).optional(),
});

export type MapVideoPlan = z.infer<typeof mapVideoPlanSchema>;
export type MapVideoScene = z.infer<typeof mapVideoSceneSchema>;
export type MapVideoSceneKind = MapVideoScene['kind'];
