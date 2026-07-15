import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseAssetManifest,
  validateAssetManifest,
  AssetManifestError,
  AssetPathError,
} from '../src';
import { validateAssetManifestOnDisk } from '../src/assets/manifest.server';

const publicDir = resolve(import.meta.dirname ?? process.cwd(), '../../../apps/remotion-studio/public');

describe('asset manifest parsing', () => {
  it('accepts a valid manifest', () => {
    const manifest = parseAssetManifest([
      { path: 'fixtures/maps/world.svg', required: true, type: 'image' },
      { path: 'sfx/click.wav', required: false, type: 'audio' },
    ]);
    expect(manifest).toHaveLength(2);
  });

  it('rejects a declared media type that does not match the extension before disk access', () => {
    expect(() =>
      validateAssetManifest([
        { path: 'fixtures/maps/world.svg', required: true, type: 'video' },
      ]),
    ).toThrow(AssetPathError);
  });

  it('rejects duplicate paths after normalization', () => {
    expect(() =>
      validateAssetManifest([
        { path: 'fixtures/maps/./world.svg', required: true, type: 'image' },
        { path: 'fixtures/maps/world.svg', required: false, type: 'image' },
      ]),
    ).toThrow(AssetPathError);
  });

  it('rejects an extension that does not match the declared type', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [{ path: 'fixtures/maps/world.svg', required: true, type: 'video' }],
        { publicDir, projectId: 'neutral-map' },
      ),
    ).toThrow(AssetPathError);
  });
});

describe('asset manifest on-disk validation', () => {
  it('validates the fixture map asset', () => {
    const result = validateAssetManifestOnDisk(
      [{ path: 'fixtures/maps/world.svg', required: true, type: 'image' }],
      { publicDir, projectId: 'neutral-map' },
    );
    expect(result.manifest[0]!.path).toBe('fixtures/maps/world.svg');
    expect(result.missingOptional).toHaveLength(0);
  });

  it('throws when a required asset is missing', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [{ path: 'missing/file.png', required: true, type: 'image' }],
        { publicDir, projectId: 'neutral-map' },
      ),
    ).toThrow(AssetManifestError);
  });

  it('reports missing optional assets instead of throwing', () => {
    const result = validateAssetManifestOnDisk(
      [{ path: 'sfx/missing.wav', required: false, type: 'audio' }],
      { publicDir, projectId: 'neutral-map' },
    );
    expect(result.missingOptional).toHaveLength(1);
  });

  it('throws when a path escapes the allowed roots', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [{ path: 'other/project/logo.png', required: true, type: 'image' }],
        { publicDir, projectId: 'neutral-map', extraAllowedRoots: [] },
      ),
    ).toThrow(AssetManifestError);
  });

  it('throws on duplicate paths', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [
          { path: 'fixtures/maps/world.svg', required: true, type: 'image' },
          { path: 'fixtures/maps/world.svg', required: false, type: 'image' },
        ],
        { publicDir, projectId: 'neutral-map' },
      ),
    ).toThrow(AssetPathError);
  });

  it('throws on invalid duration metadata', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [{ path: 'fixtures/maps/world.svg', required: true, type: 'image', durationSeconds: -1 }],
        { publicDir, projectId: 'neutral-map' },
      ),
    ).toThrow();
  });

  it('rejects path traversal', () => {
    expect(() =>
      validateAssetManifestOnDisk(
        [{ path: '../secret.png', required: true, type: 'image' }],
        { publicDir, projectId: 'neutral-map' },
      ),
    ).toThrow(AssetPathError);
  });
});
