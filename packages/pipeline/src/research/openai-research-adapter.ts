import OpenAI from 'openai';
import type { ResearchAdapter } from './research-adapter';
import { factPackSchema, type FactPack } from '../schemas/fact-pack';
import { buildResearchPrompt, convertZodToJsonSchema } from './research-helpers';

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
