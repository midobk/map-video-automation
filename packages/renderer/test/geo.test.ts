import { describe, expect, it } from 'vitest';
import {
  featureCollectionFromIsoCodes,
  findFeaturesByIsoCodes,
  fitProjectionState,
  isKnownIso3,
  resolveCountryNumericId,
  resolveMapZoomProgress,
} from '../src';

describe('vector geography', () => {
  it('resolves supported ISO3 codes to world-atlas features', () => {
    expect(isKnownIso3('MAR')).toBe(true);
    expect(resolveCountryNumericId('CAN')).toBeDefined();
    expect(findFeaturesByIsoCodes(['MAR', 'CAN'])).toHaveLength(2);
  });

  it('rotates an orthographic focus onto the visible hemisphere', () => {
    const canada = featureCollectionFromIsoCodes(['CAN']);
    const state = fitProjectionState('orthographic', [920, 960], canada, {
      padding: 96,
      centerOnFeature: true,
    });

    expect(canada.features).toHaveLength(1);
    expect(Math.abs(state.rotate[0])).toBeGreaterThan(1);
    expect(Math.abs(state.rotate[1])).toBeGreaterThan(1);
    expect(Number.isFinite(state.scale)).toBe(true);
    expect(state.scale).toBeGreaterThan(0);
  });

  it('uses scene-local frames for every map zoom', () => {
    expect(resolveMapZoomProgress(0, 75)).toBe(0);
    expect(resolveMapZoomProgress(37, 75)).toBeCloseTo(0.5, 1);
    expect(resolveMapZoomProgress(74, 75)).toBe(1);
    expect(resolveMapZoomProgress(200, 75)).toBe(1);
  });
});
