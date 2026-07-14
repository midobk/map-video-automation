import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resolveMissingAssetBehavior,
  enforceMissingAsset,
  MissingAssetError,
  type RenderEnvironment,
} from '../src/audio/missing-asset';

describe('missing-asset behavior resolution', () => {
  it('required narration always errors, in every environment', () => {
    for (const env of ['studio', 'render', 'test'] as RenderEnvironment[]) {
      expect(resolveMissingAssetBehavior(env, { required: true, kind: 'narration' })).toBe('error');
    }
  });

  it('tests surface every missing asset as an error', () => {
    expect(resolveMissingAssetBehavior('test', { required: false, kind: 'sfx' })).toBe('error');
    expect(resolveMissingAssetBehavior('test', { required: true, kind: 'image' })).toBe('error');
  });

  it('required assets error in production render and studio', () => {
    expect(resolveMissingAssetBehavior('render', { required: true, kind: 'image' })).toBe('error');
    expect(resolveMissingAssetBehavior('studio', { required: true, kind: 'image' })).toBe('error');
  });

  it('optional SFX is ignored in production and warned in studio', () => {
    expect(resolveMissingAssetBehavior('render', { required: false, kind: 'sfx' })).toBe('ignore');
    expect(resolveMissingAssetBehavior('studio', { required: false, kind: 'sfx' })).toBe('warn');
  });
});

describe('enforceMissingAsset', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  it('throws MissingAssetError for required narration (never silently incomplete)', () => {
    expect(() =>
      enforceMissingAsset('error', {
        path: 'voiceover/01-intro.mp3',
        kind: 'narration',
        required: true,
        environment: 'render',
      }),
    ).toThrow(MissingAssetError);
  });

  it('warns and does not throw for a missing optional SFX in studio', () => {
    expect(() =>
      enforceMissingAsset('warn', {
        path: 'sfx/click.wav',
        kind: 'sfx',
        required: false,
        environment: 'studio',
      }),
    ).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });

  it('ignores silently for behavior=ignore', () => {
    expect(() =>
      enforceMissingAsset('ignore', {
        path: 'sfx/whoosh.wav',
        kind: 'sfx',
        required: false,
        environment: 'render',
      }),
    ).not.toThrow();
    expect(console.warn).not.toHaveBeenCalled();
  });
});