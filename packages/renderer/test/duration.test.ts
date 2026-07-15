import { describe, expect, it } from 'vitest';
import {
  calculateMapVideoMetadata,
  calculatePlanDurationSeconds,
  buildSceneSchedule,
  MAP_VIDEO_FPS,
  neutralDarkTheme,
} from '../src';
import type { MapVideoPlan } from '../src';

describe('metadata-driven timing', () => {
  const plan: MapVideoPlan = {
    theme: neutralDarkTheme,
    projectId: 'timing-test',
    transitionSeconds: 0.5,
    scenes: [
      { id: 'a', kind: 'title', durationSeconds: 2, title: 'A' },
      { id: 'b', kind: 'caption', durationSeconds: 3, text: 'B' },
      { id: 'c', kind: 'outro', durationSeconds: 2, title: 'C' },
    ],
  };

  it('calculates total duration as sum minus transition overlap', () => {
    // 2 + 3 + 2 = 7; overlap = 0.5 * 2 = 1; total = 6
    expect(calculatePlanDurationSeconds(plan)).toBe(6);
  });

  it('derives durationInFrames from the plan duration', async () => {
    const meta = await calculateMapVideoMetadata({ props: plan } as never);
    expect(meta.durationInFrames).toBe(180); // 6 s * 30 fps
    expect(meta.fps).toBe(MAP_VIDEO_FPS);
  });

  it('builds a scene schedule with overlapping starts', () => {
    const schedule = buildSceneSchedule(plan);
    expect(schedule[0]!.startFrame).toBe(0);
    expect(schedule[0]!.durationInFrames).toBe(60);
    expect(schedule[1]!.startFrame).toBe(45); // 60 - 15 overlap
    expect(schedule[1]!.durationInFrames).toBe(90);
    expect(schedule[2]!.startFrame).toBe(120); // 45 + 90 - 15 overlap
  });

  it('is deterministic for the same plan', () => {
    expect(calculatePlanDurationSeconds(plan)).toBe(calculatePlanDurationSeconds(plan));
    expect(buildSceneSchedule(plan)).toEqual(buildSceneSchedule(plan));
  });
});
