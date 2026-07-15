import { z } from 'zod';

/**
 * Shared Zod schemas for voice-provider configuration. These are used by the
 * voiceover CLI to validate provider selection without hardcoding credentials.
 */

export const voiceProviderSchema = z.enum(['mock', 'elevenlabs']);

export const voiceRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(128).optional(),
  model: z.string().min(1).max(128).optional(),
  provider: z.string().min(1).max(64).optional(),
});

export const voiceResultSchema = z.object({
  audioBuffer: z.instanceof(ArrayBuffer),
  format: z.enum(['wav', 'mp3']),
  durationSeconds: z.number().finite().positive(),
  providerRequestId: z.string().optional(),
});
