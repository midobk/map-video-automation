import { describe, expect, it } from 'vitest';
import { MockResearchAdapter } from '../src/research';
import { generateVideoPlan } from '../src/script';
import { factPackSchema, type FactPack } from '../src/schemas';
import { splitCaptionText } from '@mapvideo/renderer/captions/split';
import { MAX_CAPTION_LINES } from '@mapvideo/renderer/captions/split';

describe('generateVideoPlan', () => {
  it('produces a valid renderer plan from a mock fact pack', async () => {
    const factPack = await new MockResearchAdapter().research('Continents of the world');
    const plan = generateVideoPlan(factPack, { projectId: 'test', targetDurationSeconds: 20 });

    expect(plan.rendererPlan.scenes.length).toBeGreaterThanOrEqual(2);
    expect(plan.totalDurationSeconds).toBeGreaterThan(0);
    expect(Object.keys(plan.narrationBySceneId).length).toBe(plan.rendererPlan.scenes.length);

    const kinds = plan.rendererPlan.scenes.map((s) => s.kind);
    expect(kinds).toContain('title');
    expect(kinds).toContain('outro');
  });

  it('includes a comparison scene when numeric claims exist', () => {
    const factPack: FactPack = factPackSchema.parse({
      topic: 'Oceans and land',
      summary: 'Earth is mostly water.',
      claims: [
        { text: 'Oceans cover 71% of Earth.', source: { name: 'NOAA' } },
        { text: 'Land makes up about 29% of the surface.', source: { name: 'World Atlas' } },
      ],
      entities: ['Ocean', 'Land'],
      risk: 'LOW',
    });

    const plan = generateVideoPlan(factPack);

    const kinds = plan.rendererPlan.scenes.map((s) => s.kind);
    expect(kinds).toContain('comparison');
  });

  it('clamps long captions so every scene stays within the 3-line strip limit', () => {
    // A summary that wraps to 4 lines at the 40-char/line English budget if
    // naively sliced to 120 chars (word-boundary slack). Real providers
    // (e.g. MiniMax) routinely return summaries this long.
    const longSummary =
      'The Nile is traditionally cited as the longest river in the world at ' +
      'approximately six thousand six hundred and sixty kilometres, though some ' +
      'recent studies suggest the Amazon may actually be slightly longer.';
    const factPack: FactPack = factPackSchema.parse({
      topic: 'The Nile river',
      summary: longSummary,
      claims: [
        { text: 'Oceans cover 71% of Earth.', source: { name: 'NOAA' } },
        { text: 'Land makes up about 29% of the surface.', source: { name: 'World Atlas' } },
      ],
      entities: ['Nile', 'White Nile', 'Blue Nile', 'Mediterranean', 'Lake Victoria', 'Sudan'],
      risk: 'MEDIUM',
    });

    // Must not throw — the schema rejects captions wrapping to >3 lines.
    const plan = generateVideoPlan(factPack);

    for (const scene of plan.rendererPlan.scenes) {
      if (scene.caption === undefined) continue;
      const lines = splitCaptionText(scene.caption, scene.captionLanguage ?? 'en');
      expect(lines.length).toBeLessThanOrEqual(MAX_CAPTION_LINES);
    }
  });
});
