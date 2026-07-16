import type { ResearchAdapter } from './research-adapter';
import { factPackSchema, type FactPack } from '../schemas/fact-pack';

/**
 * Deterministic mock research adapter.
 *
 * Returns a neutral, source-backed fact pack so the pipeline can render a real
 * video without calling an external AI API. Useful for local dev, tests, and
 * preview deployments without API keys.
 */
export class MockResearchAdapter implements ResearchAdapter {
  async research(topic: string): Promise<FactPack> {
    const safeTopic = topic.slice(0, 120);

    return factPackSchema.parse({
      topic: safeTopic || 'Our World',
      summary:
        'A brief overview of major world regions, emphasizing geography over politics.',
      claims: [
        {
          text: 'Earth has seven continents and five major oceans.',
          source: { name: 'National Geographic Atlas' },
        },
        {
          text: 'Oceans cover about 71% of the planet\'s surface.',
          source: { name: 'NOAA Ocean Facts' },
        },
        {
          text: 'Asia is the largest continent by both area and population.',
          source: { name: 'World Atlas' },
        },
      ],
      entities: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'],
      risk: 'LOW',
    });
  }
}
