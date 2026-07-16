import { describe, expect, it } from 'vitest';
import {
  resolveSceneRenderer,
  UnsupportedSceneKindError,
  sceneRenderers,
  type MapVideoScene,
} from '../src';

describe('scene renderer registry', () => {
  it('has a renderer for every supported scene kind', () => {
    expect(Object.keys(sceneRenderers).sort()).toEqual([
      'caption',
      'comparison',
      'map-highlight',
      'outro',
      'ranking',
      'stat-card',
      'title',
    ]);
  });

  it('resolves a renderer for a supported kind', () => {
    expect(resolveSceneRenderer('stat-card')).toBe(sceneRenderers['stat-card']);
  });

  it('throws for an unsupported kind', () => {
    expect(() => resolveSceneRenderer('unsupported' as unknown as MapVideoScene['kind'])).toThrow(
      UnsupportedSceneKindError,
    );
  });
});
