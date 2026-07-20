import { describe, expect, it, vi } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { MockResearchAdapter } from '../src/research';
import { generateVideoPlan } from '../src/script';
import { createVoiceProvider, synthesizeNarration } from '../src/tts';
import { ensurePlanAudio, verifyAudioDuration } from '../src/render/render-orchestrator';
import { createRequire } from 'node:module';
import type { VoiceProvider } from '@mapvideo/renderer';

describe('render orchestrator helpers', () => {
  it('synthesizes narration deterministically with mock voice provider', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const segments = plan.rendererPlan.scenes.map((scene) => ({
      sceneId: scene.id,
      text: scene.voiceoverText ?? '',
    }));

    const provider = createVoiceProvider();
    const result = await synthesizeNarration(segments, provider);

    expect(result.audioBuffer.byteLength).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.segments.length).toBe(segments.length);
  });

  it('writes a single concatenated WAV and tags the plan with audioAsset + audioDurationSeconds', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);

    const before = plan.rendererPlan.audioAsset;
    expect(before).toBeUndefined();

    const resolved = await ensurePlanAudio(plan, 'test-item-e2e');

    expect(resolved.rendererPlan.audioAsset).toBe('renders/test-item-e2e/narration.wav');
    expect(resolved.rendererPlan.audioDurationSeconds).toBeGreaterThan(0);
    expect(resolved.rendererPlan.audioDurationSeconds).toBeCloseTo(
      plan.totalDurationSeconds,
      -1,
    );

    const require = createRequire(import.meta.url);
    const studioPackageJson = require.resolve('@mapvideo/remotion-studio/package.json');
    const audioFile = path.join(
      path.dirname(studioPackageJson),
      'public',
      'renders',
      'test-item-e2e',
      'narration.wav',
    );
    expect(existsSync(audioFile)).toBe(true);
    expect(statSync(audioFile).size).toBeGreaterThan(44);
  });

  it('is a no-op when the plan already has an audioAsset', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const planWithAudio = {
      ...plan,
      rendererPlan: {
        ...plan.rendererPlan,
        audioAsset: 'prebuilt/intro.wav',
        audioDurationSeconds: plan.totalDurationSeconds,
      },
    };

    const resolved = await ensurePlanAudio(planWithAudio, 'test-item-noop');
    expect(resolved.rendererPlan.audioAsset).toBe('prebuilt/intro.wav');
  });

  it('verifyAudioDuration throws when the drift exceeds the tolerance', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const bad = {
      ...plan,
      rendererPlan: {
        ...plan.rendererPlan,
        audioDurationSeconds: plan.totalDurationSeconds + 5,
      },
    };
    expect(() => verifyAudioDuration(bad)).toThrow(/Audio duration mismatch/);
  });

  it('verifyAudioDuration is silent when within tolerance', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const good = {
      ...plan,
      rendererPlan: {
        ...plan.rendererPlan,
        audioDurationSeconds: plan.totalDurationSeconds + 0.5,
      },
    };
    expect(() => verifyAudioDuration(good)).not.toThrow();
  });
});

describe('ensurePlanAudio real-provider branch', () => {
  it('re-times scenes to measured narration and concatenates an mp3 asset', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const sceneCount = plan.rendererPlan.scenes.length;

    const probe = vi.fn(async () => 3.5);
    const concat = vi.fn(async () => {});
    const silent = vi.fn(async () => {});
    const synth = vi.fn(async () => ({
      audioBuffer: new ArrayBuffer(8),
      format: 'mp3' as const,
      durationSeconds: 0,
    }));
    const provider: VoiceProvider = { synthesize: synth };

    const resolved = await ensurePlanAudio(plan, 'test-item-real', {
      provider,
      probe,
      concat,
      silent,
    });

    // Every scene had voiceoverText, so each was synthesized + probed.
    expect(synth).toHaveBeenCalledTimes(sceneCount);
    expect(probe).toHaveBeenCalledTimes(sceneCount);
    expect(silent).not.toHaveBeenCalled();

    // Scene durations are overwritten to the measured value.
    for (const scene of resolved.rendererPlan.scenes) {
      expect(scene.durationSeconds).toBe(3.5);
    }
    const expectedTotal = 3.5 * sceneCount;
    expect(resolved.totalDurationSeconds).toBeCloseTo(expectedTotal, 6);
    expect(resolved.rendererPlan.audioAsset).toBe('renders/test-item-real/narration.mp3');
    expect(resolved.rendererPlan.audioDurationSeconds).toBeCloseTo(expectedTotal, 6);

    // concat received one clip per scene.
    expect(concat).toHaveBeenCalledTimes(1);
    expect(concat.mock.calls[0]![0]).toHaveLength(sceneCount);

    // The mutated plan passes the duration guard.
    expect(() => verifyAudioDuration(resolved)).not.toThrow();
  });

  it('fills silent clips for scenes without voiceoverText and leaves their duration untouched', async () => {
    const factPack = await new MockResearchAdapter().research('Continents');
    const plan = generateVideoPlan(factPack);
    const firstSceneOriginalDuration = plan.rendererPlan.scenes[0]!.durationSeconds;
    // Strip voiceover from the first scene to exercise the silent branch.
    plan.rendererPlan.scenes[0]!.voiceoverText = undefined;

    const probe = vi.fn(async () => 3.5);
    const silent = vi.fn(async () => {});
    const concat = vi.fn(async () => {});
    const synth = vi.fn(async () => ({
      audioBuffer: new ArrayBuffer(8),
      format: 'mp3' as const,
      durationSeconds: 0,
    }));
    const provider: VoiceProvider = { synthesize: synth };

    const sceneCount = plan.rendererPlan.scenes.length;
    const resolved = await ensurePlanAudio(plan, 'test-item-real-silent', {
      provider,
      probe,
      concat,
      silent,
    });

    expect(synth).toHaveBeenCalledTimes(sceneCount - 1);
    expect(silent).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledTimes(sceneCount - 1);
    // The first scene kept its planned duration (not re-timed to 3.5).
    expect(resolved.rendererPlan.scenes[0]!.durationSeconds).toBe(firstSceneOriginalDuration);
    // concat still received one clip per scene (silent filler included).
    expect(concat.mock.calls[0]![0]).toHaveLength(sceneCount);
  });
});
