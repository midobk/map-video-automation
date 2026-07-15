import { describe, expect, it } from 'vitest';
import { MockAiProvider, type RuntimeDecoder } from '../src';

const titleDecoder: RuntimeDecoder<{ title: string }> = {
  parse(input) {
    if (
      typeof input !== 'object' ||
      input === null ||
      !('title' in input) ||
      typeof input.title !== 'string'
    ) {
      throw new TypeError('Expected an object with a string title.');
    }

    return { title: input.title };
  },
};

describe('MockAiProvider', () => {
  it('returns deterministic zero-cost fixture output after runtime validation', async () => {
    const provider = new MockAiProvider({ title: 'Fixture' });
    const result = await provider.generateStructured({
      task: 'test',
      input: {},
      idempotencyKey: 'abc',
      outputDecoder: titleDecoder,
    });

    expect(result).toEqual({
      output: { title: 'Fixture' },
      providerRequestId: 'mock:abc',
      estimatedCostUsd: 0,
    });
  });

  it('rejects a fixture that does not match the requested output contract', async () => {
    const provider = new MockAiProvider({ title: 42 });

    await expect(
      provider.generateStructured({
        task: 'test',
        input: {},
        idempotencyKey: 'invalid',
        outputDecoder: titleDecoder,
      }),
    ).rejects.toThrow('Expected an object with a string title.');
  });
});
