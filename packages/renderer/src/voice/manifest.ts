import { z } from 'zod';

/**
 * Validated voiceover manifest.
 *
 * Records the exact text, provider, voice, output path, and timing of a
 * generated narration clip. Supports reproducibility and auditability without
 * exposing secrets.
 */
export const voiceoverManifestSchema = z.object({
  textHash: z.string().min(1).describe('Deterministic hash of the source text'),
  provider: z.string().min(1),
  model: z.string().min(1),
  voiceId: z.string().min(1),
  audioPath: z.string().min(1).describe('Path relative to the project public/ folder'),
  durationSeconds: z.number().finite().positive(),
  generatedAt: z.string().datetime(),
  providerRequestId: z.string().optional(),
});

export type VoiceoverManifest = z.infer<typeof voiceoverManifestSchema>;

export function parseVoiceoverManifest(input: unknown): VoiceoverManifest {
  return voiceoverManifestSchema.parse(input);
}

export function safeParseVoiceoverManifest(input: unknown) {
  return voiceoverManifestSchema.safeParse(input);
}

/**
 * Simple text hash for reproducibility. Not a cryptographic hash — it is used
 * to detect manifest/text mismatches in a deterministic fixture pipeline.
 */
export function hashVoiceoverText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
