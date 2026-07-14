/**
 * How the renderer reacts when an asset is missing.
 *
 * Required defaults (from the Remotion adaptation plan):
 *   - Studio preview:    optional missing -> warn
 *   - Production render: optional missing -> error (any required missing fails)
 *   - Required narration: always error
 *   - Explicitly optional SFX: ignore or warn
 *   - Tests: error
 *
 * Missing required narration must fail rather than silently producing an
 * incomplete video.
 */
export type MissingAssetBehavior = 'ignore' | 'warn' | 'error';

export type RenderEnvironment = 'studio' | 'render' | 'test';

export interface AssetKind {
  readonly required: boolean;
  readonly kind: 'narration' | 'sfx' | 'image' | 'video' | 'font' | 'generic';
}

/** Resolve the behavior for a missing asset given the environment and kind. */
export function resolveMissingAssetBehavior(
  environment: RenderEnvironment,
  kind: AssetKind,
): MissingAssetBehavior {
  // Required narration always errors, everywhere.
  if (kind.kind === 'narration' && kind.required) return 'error';

  // Tests must surface every missing asset as an error.
  if (environment === 'test') return 'error';

  // Required assets in production renders must fail loudly.
  if (environment === 'render' && kind.required) return 'error';

  // Required assets in Studio should be loud too — the operator must notice.
  if (environment === 'studio' && kind.required) return 'error';

  // Explicitly optional assets: ignore in production, warn in Studio.
  if (environment === 'render') return 'ignore';
  return 'warn';
}

export interface MissingAssetEvent {
  readonly path: string;
  readonly kind: AssetKind['kind'];
  readonly required: boolean;
  readonly environment: RenderEnvironment;
}

export class MissingAssetError extends Error {
  constructor(
    message: string,
    readonly event: MissingAssetEvent,
  ) {
    super(message);
    this.name = 'MissingAssetError';
  }
}

/**
 * Enforce a missing-asset decision. Throws on 'error', warns on 'warn', and
 * no-ops on 'ignore'. Pure and side-effect-free except for a `console.warn`.
 */
export function enforceMissingAsset(
  behavior: MissingAssetBehavior,
  event: MissingAssetEvent,
): void {
  if (behavior === 'error') {
    throw new MissingAssetError(
      `Missing required asset (${event.kind}) not found at "${event.path}". Render aborted to avoid producing an incomplete video.`,
      event,
    );
  }
  if (behavior === 'warn') {
    console.warn(
      `[renderer] Missing optional asset (${event.kind}) not found at "${event.path}" — skipped.`,
    );
  }
  // 'ignore': no-op
}