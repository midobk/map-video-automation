import { describe, expect, it } from 'vitest';
import { MockResearchAdapter } from '../src/research';

describe('MockResearchAdapter', () => {
  it('returns a deterministic LOW-risk fact pack for any topic', async () => {
    const adapter = new MockResearchAdapter();
    const result = await adapter.research('Why is the sky blue?');

    expect(result.risk).toBe('LOW');
    expect(result.claims.length).toBeGreaterThanOrEqual(1);
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.topic).toBe('Why is the sky blue?');
  });

  it('truncates very long topics safely', async () => {
    const adapter = new MockResearchAdapter();
    const longTopic = 'a'.repeat(500);
    const result = await adapter.research(longTopic);

    expect(result.topic.length).toBeLessThanOrEqual(120);
  });
});
