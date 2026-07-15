import { describe, expect, it } from 'vitest';
import { startSchema } from '../src/compositions/starter/start-schema';
import { starterFixtureProps } from '../src/fixtures';
import { START_FPS, START_WIDTH, START_HEIGHT } from '../src/compositions/starter/start-schema';

describe('stable fixture configuration', () => {
  it('parses identically on every call (deterministic defaults)', () => {
    const a = startSchema.parse(starterFixtureProps);
    const b = startSchema.parse(starterFixtureProps);
    expect(a).toEqual(b);
  });

  it('targets the required 9:16 @30fps geometry', () => {
    expect(START_WIDTH).toBe(1080);
    expect(START_HEIGHT).toBe(1920);
    expect(START_FPS).toBe(30);
    expect(START_HEIGHT).toBeGreaterThan(START_WIDTH);
  });

  it('contains no client-specific Europ’Équipement material', () => {
    const serialized = JSON.stringify(starterFixtureProps);
    expect(serialized).not.toContain('Europ');
    expect(serialized).not.toContain('Equipement');
    expect(serialized).not.toContain('e30613');
    expect(serialized).not.toContain('EELogo');
  });

  it('uses a neutral, brand-free theme', () => {
    expect(starterFixtureProps.theme.colors.accent).not.toBe('#e30613');
    expect(starterFixtureProps.theme.typography.headingFamily).toBe('Inter');
  });
});