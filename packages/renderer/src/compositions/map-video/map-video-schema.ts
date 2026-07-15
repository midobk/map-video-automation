import { z } from 'zod';
import { videoThemeSchema } from '../../themes/theme-schema';

/** Fixed geometry for all map-video compositions. */
export const MAP_VIDEO_FPS = 30;
export const MAP_VIDEO_WIDTH = 1080;
export const MAP_VIDEO_HEIGHT = 1920;

/** A single scene in a map-video plan. */
const baseSceneSchema = z.object({
  id: z.string().min(1).max(64),
  durationSeconds: z.number().finite().positive().max(120),
  caption: z.string().max(300).optional(),
  voiceoverText: z.string().max(800).optional(),
});

export const titleSceneSchema = baseSceneSchema.extend({
  kind: z.literal('title'),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  eyebrow: z.string().max(80).optional(),
});

export const mapHighlightSceneSchema = baseSceneSchema.extend({
  kind: z.literal('map-highlight'),
  label: z.string().min(1).max(120),
  highlighted: z.array(z.string().min(1).max(80)).min(1).max(8),
  mapAsset: z.string().min(1).max(200),
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

export const mapVideoSceneSchema = z.discriminatedUnion('kind', [
  titleSceneSchema,
  mapHighlightSceneSchema,
  rankingSceneSchema,
  comparisonSceneSchema,
  captionSceneSchema,
  outroSceneSchema,
]);

export const mapVideoPlanSchema = z.object({
  theme: videoThemeSchema,
  projectId: z.string().min(1).max(64),
  scenes: z.array(mapVideoSceneSchema).min(1).max(32),
  transitionSeconds: z.number().finite().nonnegative().max(2).default(0.5),
});

export type MapVideoPlan = z.infer<typeof mapVideoPlanSchema>;
export type MapVideoScene = z.infer<typeof mapVideoSceneSchema>;
export type MapVideoSceneKind = MapVideoScene['kind'];
