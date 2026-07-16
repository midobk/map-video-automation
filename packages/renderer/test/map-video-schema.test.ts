import { describe, expect, it } from 'vitest';
import {
  mapVideoPlanSchema,
  mapVideoSceneSchema,
  neutralDarkTheme,
  MAX_CAPTION_LINES,
  splitCaptionText,
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
        {
          ...baseScene,
          kind: 'map-highlight',
          label: 'Map',
          highlighted: ['Morocco'],
          focusIsoCodes: ['MAR'],
          labels: [{ text: 'Rabat', longitude: -6.84, latitude: 34.02 }],
        },
        {
          ...baseScene,
          kind: 'ranking',
          title: 'Ranking',
          items: [
            { label: 'A', value: '1' },
            { label: 'B', value: '2' },
          ],
        },
        { ...baseScene, kind: 'stat-card', headline: 'Metric', value: '42' },
        {
          ...baseScene,
          kind: 'comparison',
          title: 'Compare',
          left: { label: 'L', value: '1' },
          right: { label: 'R', value: '2' },
        },
        { ...baseScene, kind: 'caption', text: 'Caption' },
        { ...baseScene, kind: 'outro', title: 'Outro' },
      ],
    });
    expect(plan.scenes).toHaveLength(7);
  });

  it('defaults vector-map fields for a legacy static map', () => {
    const scene = mapVideoSceneSchema.parse({
      ...baseScene,
      kind: 'map-highlight',
      label: 'Legacy',
      highlighted: ['World'],
      mapAsset: 'fixtures/maps/world.svg',
    });
    expect(scene).toMatchObject({
      projection: 'natural-earth',
      focusIsoCodes: [],
      contextIsoCodes: [],
      labels: [],
    });
  });

  it('accepts a labels-only world map as explicit vector geography', () => {
    expect(() =>
      mapVideoSceneSchema.parse({
        ...baseScene,
        kind: 'map-highlight',
        label: 'Continents',
        highlighted: ['Africa'],
        labels: [{ text: 'Africa', longitude: 20, latitude: 5 }],
      }),
    ).not.toThrow();
  });

  it('rejects a map highlight without a static or vector map source', () => {
    const result = mapVideoSceneSchema.safeParse({
      ...baseScene,
      kind: 'map-highlight',
      label: 'Missing geography',
      highlighted: ['Canada'],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['focusIsoCodes']);
  });

  it.each([
    ['lowercase ISO3', { focusIsoCodes: ['mar'] }],
    ['unknown ISO3', { focusIsoCodes: ['ZZZ'] }],
    ['non-ISO placeholder', { focusIsoCodes: ['UNK'] }],
    ['duplicate ISO3', { focusIsoCodes: ['MAR', 'MAR'] }],
    ['invalid longitude', { labels: [{ text: 'Invalid', longitude: 181, latitude: 0 }] }],
    ['invalid latitude', { labels: [{ text: 'Invalid', longitude: 0, latitude: -91 }] }],
  ])('rejects %s geography input', (_label, override) => {
    expect(() =>
      mapVideoSceneSchema.parse({
        ...baseScene,
        kind: 'map-highlight',
        label: 'Invalid map',
        highlighted: ['Invalid'],
        ...override,
      }),
    ).toThrow();
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

  it('accepts a bottom caption that fits the reserved line envelope', () => {
    const caption = 'a'.repeat(100);
    expect(splitCaptionText(caption, 'en')).toHaveLength(MAX_CAPTION_LINES);
    expect(() =>
      mapVideoSceneSchema.parse({
        ...baseScene,
        caption,
        kind: 'title',
        title: 'Fits',
      }),
    ).not.toThrow();
  });

  it('rejects a bottom caption that wraps beyond the reserved line envelope', () => {
    const caption = Array.from({ length: 20 }, (_, index) => `word${index}`).join(' ');
    const result = mapVideoSceneSchema.safeParse({
      ...baseScene,
      caption,
      kind: 'title',
      title: 'Overflow',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['caption']);
  });

  it('rejects an unsupported scene kind', () => {
    expect(() =>
      mapVideoPlanSchema.parse({
        ...validPlan,
        scenes: [{ ...baseScene, kind: 'unsupported' } as unknown as MapVideoScene],
      }),
    ).toThrow();
  });

  it('rejects a negative transition', () => {
    expect(() =>
      mapVideoPlanSchema.parse({ ...validPlan, transitionSeconds: -1 }),
    ).toThrow();
  });

  it('rejects an empty scene list', () => {
    expect(() => mapVideoPlanSchema.parse({ ...validPlan, scenes: [] })).toThrow();
  });
});
