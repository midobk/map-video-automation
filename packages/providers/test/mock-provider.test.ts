import { describe, expect, it } from 'vitest';
import { MockAiProvider } from '../src';

describe('MockAiProvider', () => {
  it('returns deterministic zero-cost fixture output', async () => {
    const provider = new MockAiProvider({ title: 'Fixture' });
    const result = await provider.generateStructured<{ title: string }>({
      task: 'test',
      input: {},
      idempotencyKey: 'abc',
    });
    expect(result).toEqual({
      output: { title: 'Fixture' },
      providerRequestId: 'mock:abc',
      estimatedCostUsd: 0,
    });
  });
});
