import { describe, expect, it } from 'vitest';
import { MockResearchAdapter } from '../src/research';
import { generateVideoPlan } from '../src/script';
import { factPackSchema, type FactPack } from '../src/schemas';

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
});
