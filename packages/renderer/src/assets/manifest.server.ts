import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseAssetManifest,
  AssetManifestError,
  type AssetManifest,
  type AssetManifestEntry,
} from './manifest';
import {
  resolveStaticPath,
  validateAssetType,
  assertNoDuplicateAssets,
} from './paths';

export type {
  AssetManifest,
  AssetManifestEntry,
  AssetManifestInput,
} from './manifest';
export { assetManifestSchema, parseAssetManifest, safeParseAssetManifest, AssetManifestError } from './manifest';

/** Check whether a relative path starts with one of the allowed roots. */
function isAllowedRoot(path: string, allowedRoots: readonly string[]): boolean {
  return allowedRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

export interface AssetManifestValidationOptions {
  /** Absolute path to the Remotion public directory. */
  publicDir: string;
  /** Project id used to build the project-specific allowed root. */
  projectId: string;
  /** Additional allowed roots besides sfx/ and the project folder. */
  extraAllowedRoots?: readonly string[];
}

export interface AssetManifestValidationResult {
  manifest: AssetManifest;
  missingOptional: readonly AssetManifestEntry[];
}

/**
 * Validate an asset manifest on disk.
 *
 * Checks:
 * - safe relative paths (no traversal, absolute, or drive-rooted paths)
 * - declared type matches file extension
 * - no duplicate paths
 * - path lives under an allowed root
 * - required assets exist on disk
 * - missing optional assets are reported but do not fail
 * - duration metadata, when present, is a positive finite number
 *
 * Throws `AssetManifestError` or `AssetPathError` on any invalid required state.
 */
export function validateAssetManifestOnDisk(
  input: unknown,
  options: AssetManifestValidationOptions,
): AssetManifestValidationResult {
  const entries = parseAssetManifest(input);

  // Path safety and type validation.
  const normalized = entries.map((entry) => {
    const path = resolveStaticPath(entry.path);
    validateAssetType(path, entry.type);
    if (entry.durationSeconds !== undefined) {
      if (!Number.isFinite(entry.durationSeconds) || entry.durationSeconds <= 0) {
        throw new AssetManifestError(
          `Invalid durationSeconds for asset "${path}".`,
          path,
        );
      }
    }
    return { ...entry, path };
  });

  assertNoDuplicateAssets(normalized);

  const allowedRoots = [
    'sfx',
    `fixtures`,
    options.projectId,
    ...(options.extraAllowedRoots ?? []),
  ];
  const missingOptional: AssetManifestEntry[] = [];

  for (const entry of normalized) {
    if (!isAllowedRoot(entry.path, allowedRoots)) {
      throw new AssetManifestError(
        `Asset path "${entry.path}" is not under an allowed root (${allowedRoots.join(', ')}).`,
        entry.path,
      );
    }

    const fullPath = resolve(options.publicDir, entry.path);
    const exists = existsSync(fullPath);

    if (entry.required && !exists) {
      throw new AssetManifestError(
        `Required asset missing: "${entry.path}" (type=${entry.type}).`,
        entry.path,
      );
    }

    if (!entry.required && !exists) {
      missingOptional.push(entry);
    }
  }

  return { manifest: normalized, missingOptional };
}
