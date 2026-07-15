import { describe, expect, it } from 'vitest';
import {
  mapVideoPlanSchema,
  mapVideoSceneSchema,
  neutralDarkTheme,
} from '../src';
import type { MapVideoScene } from '../src';

describe('map-video plan schema', () => {
  const baseScene = {
    id: 'test',
    durationSeconds: 2,
    caption: 'Test caption',
  };

  const validPlan = {
    theme: neutralDarkTheme,
    projectId: 'test-project',
    transitionSeconds: 0.5,
    scenes: [
      { ...baseScene, kind: 'title', title: 'Hello' },
      { ...baseScene, kind: 'outro', title: 'Bye' },
    ],
  };

  it('accepts a valid plan with all scene kinds', () => {
    const plan = mapVideoPlanSchema.parse({
      ...validPlan,
      scenes: [
        { ...baseScene, kind: 'title', title: 'Title' },
        { ...baseScene, kind: 'map-highlight', label: 'Map', highlighted: ['A'], mapAsset: 'fixtures/maps/world.svg' },
        { ...baseScene, kind: 'ranking', title: 'Ranking', items: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }] },
        { ...baseScene, kind: 'comparison', title: 'Compare', left: { label: 'L', value: '1' }, right: { label: 'R', value: '2' } },
        { ...baseScene, kind: 'caption', text: 'Caption' },
        { ...baseScene, kind: 'outro', title: 'Outro' },
      ],
    });
    expect(plan.scenes).toHaveLength(6);
  });

  it('accepts a supported caption language', () => {
    const scene = mapVideoSceneSchema.parse({
      ...baseScene,
      kind: 'title',
      title: 'مرحبا',
      captionLanguage: 'ar',
    });
    expect(scene.captionLanguage).toBe('ar');
  });

  it('rejects an unsupported caption language', () => {
    expect(() =>
      mapVideoSceneSchema.parse({
        ...baseScene,
        kind: 'title',
        title: 'Hola',
        captionLanguage: 'es',
      }),
    ).toThrow();
  });

  it('rejects an unsupported scene kind', () => {
    expect(() =>
      mapVideoPlanSchema.parse({
        ...validPlan,
        scenes: [{ ...baseScene, kind: 'unsupported' } as unknown as MapVideoScene],
      }),
    ).toThrow();
  });

  it('rejects a scene missing its kind-specific fields', () => {
    expect(() =>
      mapVideoPlanSchema.parse({
        ...validPlan,
        scenes: [{ ...baseScene, kind: 'title' }],
      }),
    ).toThrow();
  });

  it('rejects a negative transition', () => {
    expect(() =>
      mapVideoPlanSchema.parse({
        ...validPlan,
        transitionSeconds: -1,
      }),
    ).toThrow();
  });

  it('rejects an empty scene list', () => {
    expect(() => mapVideoPlanSchema.parse({ ...validPlan, scenes: [] })).toThrow();
  });

  it('parses a single scene through the scene schema', () => {
    const scene = mapVideoSceneSchema.parse({ ...baseScene, kind: 'title', title: 'X' });
    expect(scene.kind).toBe('title');
    expect((scene as { title: string }).title).toBe('X');
  });
});
