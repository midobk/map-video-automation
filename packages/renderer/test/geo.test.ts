import { describe, expect, it } from 'vitest';
import {
  countryDictionary,
  featureCollectionFromIsoCodes,
  findFeaturesByIsoCodes,
  fitProjectionState,
  isKnownIso3,
  isPointVisibleOnProjection,
  resolveCountryName,
  resolveMapZoomProgress,
} from '../src';

describe('vector geography', () => {
  it('resolves valid ISO3 codes to pinned features', () => {
    expect(isKnownIso3('MAR')).toBe(true);
    expect(resolveCountryName('CAN')).toBeDefined();
    expect(findFeaturesByIsoCodes(['MAR', 'CAN'])).toHaveLength(2);
  });

  it('does not expose package placeholder codes as ISO geography', () => {
    expect(isKnownIso3('UNK')).toBe(false);
    expect(resolveCountryName('UNK')).toBeUndefined();
  });

  it('keeps the generated dictionary in locale-independent code-unit order', () => {
    const names = countryDictionary.map((record) => record.canonicalName);
    const sorted = [...names].sort((left, right) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
    expect(names).toEqual(sorted);
  });

  it('centers an orthographic focus on the visible hemisphere', () => {
    const focus = featureCollectionFromIsoCodes(['CAN']);
    const state = fitProjectionState('orthographic', [920, 960], focus, {
      padding: 96,
      centerOnFeature: true,
    });

    expect(focus.features).toHaveLength(1);
    expect(Math.abs(state.rotate[0])).toBeGreaterThan(1);
    expect(Math.abs(state.rotate[1])).toBeGreaterThan(1);
    expect(Number.isFinite(state.scale)).toBe(true);
    expect(state.scale).toBeGreaterThan(0);
  });

  it('culls labels on the hidden side of an orthographic globe', () => {
    expect(isPointVisibleOnProjection('orthographic', [0, 0], [0, 0])).toBe(true);
    expect(isPointVisibleOnProjection('orthographic', [0, 0], [180, 0])).toBe(false);
    expect(isPointVisibleOnProjection('orthographic', [-75, -45], [75, 45])).toBe(true);
    expect(isPointVisibleOnProjection('orthographic', [-75, -45], [-105, -45])).toBe(false);
    expect(isPointVisibleOnProjection('natural-earth', [0, 0], [180, 0])).toBe(true);
  });

  it('uses scene-local frames for every map zoom', () => {
    expect(resolveMapZoomProgress(0, 75)).toBe(0);
    expect(resolveMapZoomProgress(37, 75)).toBeCloseTo(0.5, 1);
    expect(resolveMapZoomProgress(74, 75)).toBe(1);
    expect(resolveMapZoomProgress(200, 75)).toBe(1);
  });
});
