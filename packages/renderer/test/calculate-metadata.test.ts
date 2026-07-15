import { describe, expect, it } from 'vitest';
import { calculateStartMetadata } from '../src/compositions/starter/calculate-metadata';
import { START_FPS } from '../src/compositions/starter/start-schema';
import { neutralDarkTheme } from '../src/themes';
import type { StartProps } from '../src/compositions/starter/start-schema';

type MetaArgs = Parameters<typeof calculateStartMetadata>[0];
type MetaResult = { durationInFrames: number; fps: number };

const props: StartProps = {
  theme: neutralDarkTheme,
  title: 'Map Video Renderer',
  subtitle: 'Deterministic Remotion pipeline is ready',
  durationSeconds: 6,
};

const meta = (p: StartProps): MetaResult =>
  calculateStartMetadata({ props: p } as MetaArgs) as MetaResult;

describe('metadata calculation', () => {
  it('derives durationInFrames from durationSeconds at 30fps', () => {
    const result = meta(props);
    expect(result.durationInFrames).toBe(180);
    expect(result.fps).toBe(START_FPS);
  });

  it('rounds fractional durations to whole frames', () => {
    expect(meta({ ...props, durationSeconds: 2.5 }).durationInFrames).toBe(75);
  });

  it('always returns at least one frame', () => {
    expect(meta({ ...props, durationSeconds: 0.01 }).durationInFrames).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for the same input', () => {
    expect(meta(props)).toEqual(meta(props));
  });
});