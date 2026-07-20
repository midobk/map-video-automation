/**
 * Shared target-duration bounds for the video length input.
 *
 * Mirrors the zod schema in `createContentSchema` (apps/web/lib/actions/content.ts)
 * so client-side validation matches the server-side action. Kept here so the
 * dashboard's `PreviewPanel` and the MVP `/make` page share one source of truth.
 */
export const MIN_DURATION_SECONDS = 15;
export const MAX_DURATION_SECONDS = 90;
export const DEFAULT_DURATION_SECONDS = 30;

export function isDurationValid(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_DURATION_SECONDS &&
    value <= MAX_DURATION_SECONDS
  );
}