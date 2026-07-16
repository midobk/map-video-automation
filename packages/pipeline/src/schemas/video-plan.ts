import { z } from 'zod';
import { mapVideoPlanSchema } from '@mapvideo/renderer/compositions/map-video/schema';

/**
 * Pipeline video plan wraps the renderer plan with per-scene narration text.
 *
 * The renderer plan carries `voiceoverText` on each scene for captioning.
 */
export const videoPlanSchema = z.object({
  rendererPlan: mapVideoPlanSchema,
  narrationBySceneId: z.record(z.string(), z.string().min(1).max(800)),
  totalDurationSeconds: z.number().finite().positive().max(120),
});

export type VideoPlan = z.infer<typeof videoPlanSchema>;
