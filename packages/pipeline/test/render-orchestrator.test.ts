import { describe, expect, it } from 'vitest';
import { MockResearchAdapter } from '../src/research';
import { generateVideoPlan } from '../src/script';
import { createVoiceProvider, synthesizeNarration } from '../src/tts';

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
});
