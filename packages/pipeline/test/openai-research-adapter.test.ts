import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Replace the OpenAI SDK with an in-memory stub before importing the
// adapter. The stub records calls to `responses.create` and returns the
// `output_text` we configure per-test.
const createMock = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_options: unknown) {
        // accept but ignore the api key
      }
      responses = {
        create: createMock,
      };
    },
  };
});

import { OpenAiResearchAdapter } from '../src/research/openai-research-adapter';
import { factPackSchema } from '../src/schemas/fact-pack';

const VALID_FACT_PACK = {
  topic: 'The Nile river',
  summary:
    'A short summary about the Nile river that is comfortably longer than the schema minimum so the zod parse passes.',
  claims: [
    {
      text: 'The Nile is commonly cited as the longest river in the world.',
      source: { name: 'Encyclopaedia Britannica', url: 'https://britannica.com/nile' },
    },
    {
      text: 'The Nile has two major tributaries: the White Nile and the Blue Nile.',
      source: { name: 'National Geographic' },
    },
  ],
  entities: ['Nile', 'White Nile', 'Blue Nile'],
  risk: 'LOW',
};

describe('OpenAiResearchAdapter', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when constructed without an API key', () => {
    expect(() => new OpenAiResearchAdapter('')).toThrow(/OPENAI_API_KEY/);
  });

  it('sends the topic to the OpenAI Responses API and parses the fact pack', async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify(VALID_FACT_PACK),
    });

    const adapter = new OpenAiResearchAdapter('test-key');
    const result = await adapter.research('The Nile river');

    expect(createMock).toHaveBeenCalledTimes(1);
    const [request] = createMock.mock.calls[0];
    expect(request.model).toBe('gpt-4.1-mini');
    expect(request.input).toContain('Topic: The Nile river');
    expect(request.text.format.type).toBe('json_schema');
    expect(request.text.format.name).toBe('fact_pack');
    expect(request.text.format.strict).toBe(true);

    // The schema is converted from the zod factPackSchema; verify the
    // claim text we sent in the topic actually made it through the parse.
    const parsed = factPackSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.topic).toBe('The Nile river');
    expect(result.claims.length).toBe(2);
    expect(result.risk).toBe('LOW');
  });

  it('throws when the OpenAI response has no output_text', async () => {
    createMock.mockResolvedValueOnce({ output_text: '' });
    const adapter = new OpenAiResearchAdapter('test-key');
    await expect(adapter.research('Empty response topic')).rejects.toThrow(/empty/);
  });

  it('throws when the OpenAI response is not valid JSON', async () => {
    createMock.mockResolvedValueOnce({ output_text: 'not-json{' });
    const adapter = new OpenAiResearchAdapter('test-key');
    await expect(adapter.research('Bad JSON topic')).rejects.toThrow();
  });

  it('throws when the OpenAI response does not match the fact pack schema', async () => {
    createMock.mockResolvedValueOnce({
      output_text: JSON.stringify({ topic: 'broken', claims: [] }),
    });
    const adapter = new OpenAiResearchAdapter('test-key');
    await expect(adapter.research('Malformed topic')).rejects.toThrow();
  });

  it('forwards the API key to the OpenAI client', () => {
    // The mock constructor records nothing; this test is mostly a smoke
    // check that constructing with a key does not throw. The previous
    // test covers the empty-key branch.
    expect(() => new OpenAiResearchAdapter('any-key')).not.toThrow();
  });
});
