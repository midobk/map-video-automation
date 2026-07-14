import { parseEnvironment, type Environment } from '@mapvideo/shared';

/**
 * Server-only environment entrypoint for the Next.js app and repository checks.
 * Keep this module out of client components.
 */
export function readServerEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): Environment {
  return parseEnvironment(input);
}
