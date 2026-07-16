export { readServerEnvironment, type Environment } from '@mapvideo/shared';

/**
 * Server-only environment entrypoint for the Next.js app and repository checks.
 * Keep this module out of client components.
 *
 * The implementation lives in @mapvideo/shared so other workspace packages can
 * read the same validated environment without depending on Next.js internals.
 */
