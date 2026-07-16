import OpenAI from 'openai';
import type { ResearchAdapter } from './research-adapter';
import { factPackSchema, type FactPack } from '../schemas/fact-pack';

/**
 * OpenAI Responses API research adapter.
 *
 * Produces a structured FactPack from a topic prompt. Requires an API key.
 */
export class OpenAiResearchAdapter implements ResearchAdapter {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAiResearchAdapter requires an OPENAI_API_KEY.');
    }
    this.client = new OpenAI({ apiKey });
  }

  async research(topic: string): Promise<FactPack> {
    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      input: buildResearchPrompt(topic),
      text: {
        format: {
          type: 'json_schema',
          name: 'fact_pack',
          schema: convertZodToJsonSchema(),
          strict: true,
        },
      },
    });

    const rawText = response.output_text;
    if (!rawText) {
      throw new Error('OpenAI research response was empty.');
    }

    const parsed = JSON.parse(rawText);
    return factPackSchema.parse(parsed);
  }
}

function buildResearchPrompt(topic: string): string {
  return [
    'You are a research assistant for a geography education video channel.',
    'Given the topic below, produce a short fact pack suitable for a 30-second video.',
    'Every claim must include a source name and optional URL.',
    'Avoid sensitive current events, disputes, or unsupported claims.',
    'Assess risk: LOW for stable geography, MEDIUM for rankings or statistics, HIGH for anything contested or potentially harmful.',
    '',
    `Topic: ${topic}`,
  ].join('\n');
}

function convertZodToJsonSchema(): Record<string, unknown> {
  // Minimal hand-rolled JSON schema matching factPackSchema.
  // Replace with zod-to-json-schema if this becomes unwieldy.
  return {
    type: 'object',
    properties: {
      topic: { type: 'string', maxLength: 200 },
      summary: { type: 'string', maxLength: 2000 },
      claims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', maxLength: 500 },
            source: {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 200 },
                url: { type: 'string', format: 'uri' },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
          required: ['text', 'source'],
          additionalProperties: false,
        },
        minItems: 1,
        maxItems: 20,
      },
      entities: {
        type: 'array',
        items: { type: 'string', maxLength: 120 },
        minItems: 1,
        maxItems: 10,
      },
      risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    },
    required: ['topic', 'summary', 'claims', 'entities', 'risk'],
    additionalProperties: false,
  };
}
