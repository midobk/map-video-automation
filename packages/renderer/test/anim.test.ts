import { describe, expect, it } from 'vitest';
import { ramp, SMOOTH, SNAPPY, GENTLE } from '../src/animation/anim';

describe('animation helpers', () => {
  describe('spring presets', () => {
    it('exposes the documented preset objects', () => {
      expect(SMOOTH).toEqual({ damping: 200 });
      expect(SNAPPY).toEqual({ damping: 26, stiffness: 200 });
      expect(GENTLE).toEqual({ damping: 14, stiffness: 140 });
    });
  });

  describe('ramp', () => {
    it('interpolates 0..1 across the window with clamping', () => {
      expect(ramp(0, 0, 10)).toBe(0);
      expect(ramp(10, 0, 10)).toBe(1);
      // before the window clamps to 0, after clamps to 1
      expect(ramp(-5, 0, 10)).toBe(0);
      expect(ramp(20, 0, 10)).toBe(1);
      // midpoint is strictly between 0 and 1 (eased)
      const mid = ramp(5, 0, 10);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(1);
    });

    it('is deterministic: same frame -> same value', () => {
      const a = ramp(7, 0, 20);
      const b = ramp(7, 0, 20);
      expect(a).toBe(b);
    });

    it('accepts a custom easing function', () => {
      const linear = (t: number) => t;
      expect(ramp(5, 0, 10, linear)).toBeCloseTo(0.5, 5);
    });
  });
});