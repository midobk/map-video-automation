import { z } from 'zod';

const environmentBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

export const environmentSchema = z
  .object({
    APP_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
    PROVIDER_MODE: z.enum(['mock', 'openai', 'minimax']).default('mock'),
    RENDER_MODE: z.enum(['local', 'cloud']).default('local'),
    PUBLISHER_MODE: z.enum(['mock', 'real']).default('mock'),
    PUBLISHING_KILL_SWITCH: environmentBoolean.default(true),
    ALLOW_LOCAL_EXTERNAL_PUBLISHING: environmentBoolean.default(false),
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    MINIMAX_API_KEY: z.string().min(1).optional(),
    TTS_PROVIDER: z.enum(['mock', 'elevenlabs']).default('mock'),
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    ELEVENLABS_VOICE_ID: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.APP_ENV === 'local' &&
      value.PUBLISHER_MODE === 'real' &&
      !value.ALLOW_LOCAL_EXTERNAL_PUBLISHING
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_LOCAL_EXTERNAL_PUBLISHING'],
        message: 'Real local publishing requires an explicit local opt-in.',
      });
    }
    if (value.PUBLISHER_MODE === 'real' && value.PUBLISHING_KILL_SWITCH) {
      context.addIssue({
        code: 'custom',
        path: ['PUBLISHING_KILL_SWITCH'],
        message: 'The kill switch must be disabled before real publishing can run.',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: Record<string, string | undefined>): Environment {
  return environmentSchema.parse(input);
}

/**
 * Read the server environment using the shared schema.
 *
 * Safe to call from server-only code in any package. Must not be imported by
 * client bundles.
 */
export function readServerEnvironment(
  input: Record<string, string | undefined> = process.env,
): Environment {
  return parseEnvironment(input);
}
