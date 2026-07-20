import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { MockResearchAdapter } from '../src/research';
import { generateVideoPlan } from '../src/script';
import { createVoiceProvider, synthesizeNarration } from '../src/tts';
import { ensurePlanAudio, verifyAudioDuration } from '../src/render/render-orchestrator';
import { createRequire } from 'node:module';

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
