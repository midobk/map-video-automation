import { describe, expect, it } from 'vitest';
import {
  parseTheme,
  safeParseTheme,
  videoThemeSchema,
  neutralDarkTheme,
  neutralLightTheme,
  exampleThemes,
} from '../src/themes';

describe('theme validation', () => {
  it('accepts a well-formed theme', () => {
    expect(() => parseTheme(neutralDarkTheme)).not.toThrow();
    expect(() => parseTheme(neutralLightTheme)).not.toThrow();
  });

  it('rejects an invalid color', () => {
    const bad = { ...neutralDarkTheme, colors: { ...neutralDarkTheme.colors, accent: 'red' } };
    expect(() => parseTheme(bad)).toThrow();
  });

  it('rejects a non-hex background', () => {
    const bad = { ...neutralDarkTheme, colors: { ...neutralDarkTheme.colors, background: '#0b0e1' } };
    expect(() => parseTheme(bad)).toThrow();
  });

  it('rejects a negative border radius', () => {
    const bad = { ...neutralDarkTheme, borderRadius: -1 };
    expect(() => parseTheme(bad)).toThrow();
  });

  it('rejects a non-positive spacing scale', () => {
    const bad = { ...neutralDarkTheme, spacingScale: 0 };
    expect(() => parseTheme(bad)).toThrow();
  });

  it('rejects an empty font family', () => {
    const bad = { ...neutralDarkTheme, typography: { ...neutralDarkTheme.typography, headingFamily: '' } };
    expect(() => parseTheme(bad)).toThrow();
  });

  it('safeParse returns success/false without throwing', () => {
    expect(safeParseTheme(neutralDarkTheme).success).toBe(true);
    expect(safeParseTheme({ wrong: true }).success).toBe(false);
  });

  it('every example theme passes the schema', () => {
    for (const id of Object.keys(exampleThemes)) {
      expect(videoThemeSchema.safeParse(exampleThemes[id as keyof typeof exampleThemes]).success).toBe(true);
    }
  });
});