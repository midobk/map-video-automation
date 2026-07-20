import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Replace the OpenAI SDK with an in-memory stub before importing the adapter.
// The stub records the constructor options and calls to `chat.completions.create`.
const mockCreate = vi.fn();
const mockConstructor = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor(options: unknown) {
        mockConstructor(options);
      }
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { MiniMaxResearchAdapter } from '../src/research/minimax-research-adapter';
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

function toolCallResponse(args: string) {
  return {
    choices: [
      {
        message: {
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'record_fact_pack', arguments: args } }],
        },
      },
    ],
  };
}

describe('MiniMaxResearchAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructor.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when constructed without an API key', () => {
    expect(() => new MiniMaxResearchAdapter('')).toThrow(/MINIMAX_API_KEY/);
  });

  it('points the OpenAI client at the MiniMax base URL', () => {
    new MiniMaxResearchAdapter('test-key');
    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor.mock.calls[0]![0]).toMatchObject({
      apiKey: 'test-key',
      baseURL: 'https://api.minimax.io/v1',
    });
  });

  it('calls MiniMax-M3 with a record_fact_pack tool and parses the tool-call arguments', async () => {
    mockCreate.mockResolvedValueOnce(toolCallResponse(JSON.stringify(VALID_FACT_PACK)));

    const adapter = new MiniMaxResearchAdapter('test-key');
    const result = await adapter.research('The Nile river');

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [request] = mockCreate.mock.calls[0]!;
    expect(request.model).toBe('MiniMax-M3');
    expect(request.messages[0].content).toContain('Topic: The Nile river');
    expect(request.tools[0].function.name).toBe('record_fact_pack');
    expect(request.tools[0].function.parameters.type).toBe('object');
    expect(request.tool_choice.function.name).toBe('record_fact_pack');

    const parsed = factPackSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.topic).toBe('The Nile river');
    expect(result.claims.length).toBe(2);
    expect(result.risk).toBe('LOW');
  });

  it('throws when the response has no tool call', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const adapter = new MiniMaxResearchAdapter('test-key');
    await expect(adapter.research('No tool call topic')).rejects.toThrow(/tool call/);
  });

  it('throws when the tool-call arguments are not valid JSON', async () => {
    mockCreate.mockResolvedValueOnce(toolCallResponse('not-json{'));
    const adapter = new MiniMaxResearchAdapter('test-key');
    await expect(adapter.research('Bad JSON topic')).rejects.toThrow();
  });

  it('throws when the tool-call arguments do not match the fact pack schema', async () => {
    mockCreate.mockResolvedValueOnce(toolCallResponse(JSON.stringify({ topic: 'broken', claims: [] })));
    const adapter = new MiniMaxResearchAdapter('test-key');
    await expect(adapter.research('Malformed topic')).rejects.toThrow();
  });
});