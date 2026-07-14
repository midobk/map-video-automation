import { describe, expect, it } from 'vitest';
import {
  resolveStaticPath,
  validateAssetType,
  assertNoDuplicateAssets,
  validateAssetManifest,
  AssetPathError,
  type AssetDeclaration,
} from '../src/assets/paths';

describe('resolveStaticPath', () => {
  it('accepts a simple relative path', () => {
    expect(resolveStaticPath('sfx/click.wav')).toBe('sfx/click.wav');
  });

  it('normalizes nested relative paths', () => {
    expect(resolveStaticPath('a/b/c.png')).toBe('a/b/c.png');
  });

  it('collapses redundant . and internal .. that stay inside', () => {
    expect(resolveStaticPath('./a/b/../c.png')).toBe('a/c.png');
  });

  it('rejects an absolute path', () => {
    expect(() => resolveStaticPath('/etc/passwd')).toThrow(AssetPathError);
  });

  it('rejects a Windows drive path', () => {
    expect(() => resolveStaticPath('C:\\Users\\x\\secret.png')).toThrow(AssetPathError);
  });

  it('rejects parent traversal', () => {
    expect(() => resolveStaticPath('../secret.png')).toThrow(AssetPathError);
    expect(() => resolveStaticPath('a/../../secret.png')).toThrow(AssetPathError);
  });

  it('rejects an empty path', () => {
    expect(() => resolveStaticPath('')).toThrow(AssetPathError);
  });
});

describe('validateAssetType', () => {
  it('accepts an allowed extension for the declared type', () => {
    expect(() => validateAssetType('sfx/click.wav', 'audio')).not.toThrow();
    expect(() => validateAssetType('img/photo.png', 'image')).not.toThrow();
  });

  it('rejects an extension that does not match the declared type', () => {
    expect(() => validateAssetType('sfx/click.wav', 'image')).toThrow(AssetPathError);
  });

  it('rejects an unknown extension', () => {
    expect(() => validateAssetType('file.xyz', 'image')).toThrow(AssetPathError);
  });
});

describe('assertNoDuplicateAssets', () => {
  it('throws on a duplicate path', () => {
    const assets: AssetDeclaration[] = [
      { path: 'sfx/click.wav', required: false, type: 'audio' },
      { path: 'sfx/click.wav', required: true, type: 'audio' },
    ];
    expect(() => assertNoDuplicateAssets(assets)).toThrow(AssetPathError);
  });

  it('accepts a unique manifest', () => {
    const assets: AssetDeclaration[] = [
      { path: 'sfx/click.wav', required: false, type: 'audio' },
      { path: 'sfx/chime.wav', required: false, type: 'audio' },
    ];
    expect(() => assertNoDuplicateAssets(assets)).not.toThrow();
  });
});

describe('validateAssetManifest', () => {
  it('validates paths, types, and duplicates together', () => {
    const assets: AssetDeclaration[] = [
      { path: 'sfx/click.wav', required: false, type: 'audio' },
      { path: 'img/logo.png', required: true, type: 'image' },
    ];
    const result = validateAssetManifest(assets);
    expect(result.map((a) => a.path)).toEqual(['sfx/click.wav', 'img/logo.png']);
  });

  it('rejects a manifest containing a traversal path', () => {
    const assets: AssetDeclaration[] = [
      { path: '../secret.png', required: true, type: 'image' },
    ];
    expect(() => validateAssetManifest(assets)).toThrow(AssetPathError);
  });
});