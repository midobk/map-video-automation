import { z } from 'zod';

/**
 * Validated asset manifest entry. Extends the path-safety declaration with
 * optional duration metadata for audio/video assets.
 */
export const assetManifestEntrySchema = z.object({
  path: z.string().min(1),
  required: z.boolean(),
  type: z.enum(['image', 'audio', 'video', 'font']),
  label: z.string().optional(),
  durationSeconds: z.number().finite().positive().optional(),
});

export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;

export type AssetManifestInput = AssetManifestEntry[];

export const assetManifestSchema = z.array(assetManifestEntrySchema).min(1);

export type AssetManifest = z.infer<typeof assetManifestSchema>;

export class AssetManifestError extends Error {
  constructor(
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'AssetManifestError';
  }
}

/**
 * Validate an asset manifest declaration (paths, types, duplicates) without
 * checking the filesystem. Safe to run in a browser/render context.
 */
export function parseAssetManifest(input: unknown): AssetManifest {
  return assetManifestSchema.parse(input);
}

export function safeParseAssetManifest(input: unknown) {
  return assetManifestSchema.safeParse(input);
}
