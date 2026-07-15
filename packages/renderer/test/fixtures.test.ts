import { describe, expect, it } from 'vitest';
import {
  starterFixtureProps,
  neutralMapVideoFixture,
  rtlMapVideoFixture,
  mapVideoPlanSchema,
  startSchema,
} from '../src';

describe('deterministic fixtures', () => {
  it('starter fixture parses identically on every call', () => {
    expect(startSchema.parse(starterFixtureProps)).toEqual(starterFixtureProps);
  });

  it('neutral map-video fixture parses identically on every call', () => {
    expect(mapVideoPlanSchema.parse(neutralMapVideoFixture)).toEqual(neutralMapVideoFixture);
  });

  it('RTL map-video fixture parses identically on every call', () => {
    expect(mapVideoPlanSchema.parse(rtlMapVideoFixture)).toEqual(rtlMapVideoFixture);
  });

  it('fixtures contain no client-specific material', () => {
    const serialized = JSON.stringify({
      starter: starterFixtureProps,
      neutral: neutralMapVideoFixture,
      rtl: rtlMapVideoFixture,
    });
    expect(serialized).not.toContain('Europ');
    expect(serialized).not.toContain('Equipement');
    expect(serialized).not.toContain('EELogo');
    expect(serialized).not.toContain('e30613');
  });

  it('RTL fixture uses Arabic text', () => {
    expect(rtlMapVideoFixture.scenes[0]?.kind).toBe('title');
    expect((rtlMapVideoFixture.scenes[0] as { title: string }).title).toContain('خريطة');
  });
});
