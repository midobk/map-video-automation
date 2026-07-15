import { describe, expect, it } from 'vitest';
import { startSchema, START_FPS, START_WIDTH, START_HEIGHT } from '../src/compositions/starter/start-schema';
import { neutralDarkTheme } from '../src/themes';
import { starterFixtureProps } from '../src/fixtures';

const validProps = {
  theme: neutralDarkTheme,
  title: 'Map Video Renderer',
  subtitle: 'Deterministic Remotion pipeline is ready',
  durationSeconds: 6,
};

describe('starter composition-prop validation', () => {
  it('accepts valid props and fills the duration default', () => {
    const parsed = startSchema.parse(validProps);
    expect(parsed.durationSeconds).toBe(6);
    expect(parsed.title).toBe('Map Video Renderer');
  });

  it('applies the default duration when omitted', () => {
    const { theme, title, subtitle } = validProps;
    const parsed = startSchema.parse({ theme, title, subtitle });
    expect(parsed.durationSeconds).toBe(6);
  });

  it('rejects an empty title', () => {
    expect(() => startSchema.parse({ ...validProps, title: '' })).toThrow();
  });

  it('rejects an over-long title', () => {
    expect(() => startSchema.parse({ ...validProps, title: 'x'.repeat(121) })).toThrow();
  });

  it('rejects a non-positive duration', () => {
    expect(() => startSchema.parse({ ...validProps, durationSeconds: 0 })).toThrow();
    expect(() => startSchema.parse({ ...validProps, durationSeconds: -1 })).toThrow();
  });

  it('rejects an over-long duration', () => {
    expect(() => startSchema.parse({ ...validProps, durationSeconds: 61 })).toThrow();
  });

  it('rejects an invalid theme', () => {
    expect(() => startSchema.parse({ ...validProps, theme: { wrong: true } })).toThrow();
  });

  it('the committed fixture is valid and targets 9:16 @30fps', () => {
    const parsed = startSchema.parse(starterFixtureProps);
    expect(parsed.theme).toBeDefined();
    expect(START_WIDTH).toBe(1080);
    expect(START_HEIGHT).toBe(1920);
    expect(START_FPS).toBe(30);
  });
});