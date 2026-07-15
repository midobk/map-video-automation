/**
 * Asset-path safety helpers.
 *
 * Render plans declare assets as paths relative to the Remotion `public/`
 * directory. These helpers resolve only allowed relative static paths, reject
 * path traversal, distinguish required and optional assets, and validate
 * expected media types. They never accept machine-specific absolute paths.
 *
 * This module is browser-safe: it uses only string operations (no `node:path`,
 * no filesystem) so it can be imported by compositions without breaking the
 * Remotion bundler. File-existence checks are a Node, pre-render concern and
 * live with the render scripts, not here.
 */

/** Allowed media categories and their file extensions (lowercase, no leading dot). */
const ALLOWED_EXTENSIONS_BY_TYPE = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
  audio: ['mp3', 'wav', 'aac', 'm4a', 'ogg'],
  video: ['mp4', 'webm', 'mov'],
  font: ['woff', 'woff2', 'ttf', 'otf'],
} as const;

export type AssetType = keyof typeof ALLOWED_EXTENSIONS_BY_TYPE;

/** An asset declared in a render plan. */
export interface AssetDeclaration {
  /** Path relative to public/, no leading slash, POSIX separators. */
  path: string;
  /** Required assets must exist; optional assets may be absent. */
  required: boolean;
  /** Expected media category, validated against the file extension. */
  type: AssetType;
  /** Optional human label for error messages. */
  label?: string | undefined;
}

export class AssetPathError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = 'AssetPathError';
  }
}

function isAbsoluteOrDrive(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\') || /^[a-zA-Z]:[\\/]/u.test(path);
}

/**
 * Normalize a declared asset path to POSIX form and validate it is a safe
 * relative path inside `public/`. Throws `AssetPathError` on absolute paths,
 * drive paths, backslashes, empty paths, and traversal that escapes the root.
 */
export function resolveStaticPath(rawPath: string): string {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    throw new AssetPathError('Asset path must be a non-empty string.', String(rawPath ?? ''));
  }
  if (isAbsoluteOrDrive(rawPath)) {
    throw new AssetPathError(
      'Asset path must be relative to public/, not absolute or drive-rooted.',
      rawPath,
    );
  }
  if (rawPath.includes('\\')) {
    throw new AssetPathError(
      'Asset path must use forward slashes and stay within public/.',
      rawPath,
    );
  }

  const segments = rawPath.split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length === 0) {
        throw new AssetPathError(
          'Asset path escapes the public/ directory (path traversal rejected).',
          rawPath,
        );
      }
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join('/');
}

/** Lowercase extension without the leading dot, or empty string. */
function extOf(path: string): string {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return '';
  return path.slice(dot + 1).toLowerCase();
}

/** Validate that a path's extension matches the declared asset type. */
export function validateAssetType(path: string, type: AssetType): void {
  const ext = extOf(path);
  const allowed = ALLOWED_EXTENSIONS_BY_TYPE[type];
  if (!ext || !allowed.includes(ext as never)) {
    throw new AssetPathError(
      `Asset "${path}" is declared as type "${type}" but extension ".${ext || '<none>'}" is not allowed. Allowed: ${allowed.join(', ')}.`,
      path,
    );
  }
}

/** Reject duplicate asset paths across a plan. */
export function assertNoDuplicateAssets(assets: readonly AssetDeclaration[]): void {
  const seen = new Map<string, AssetDeclaration>();
  for (const asset of assets) {
    const existing = seen.get(asset.path);
    if (existing) {
      throw new AssetPathError(
        `Duplicate asset path "${asset.path}" declared in the render plan.`,
        asset.path,
      );
    }
    seen.set(asset.path, asset);
  }
}

/**
 * Validate a full asset manifest: each path is safe, types match extensions,
 * and there are no duplicates. Returns the normalized declarations.
 */
export function validateAssetManifest(
  assets: readonly AssetDeclaration[],
): AssetDeclaration[] {
  assertNoDuplicateAssets(assets);
  return assets.map((asset) => ({ ...asset, path: resolveStaticPath(asset.path) }));
}