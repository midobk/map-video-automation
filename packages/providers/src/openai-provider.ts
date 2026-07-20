import OpenAI from 'openai';
import type { AiProvider, StructuredGenerationRequest, StructuredGenerationResult } from './index';

/**
 * OpenAI Responses API provider for structured generation.
 *
 * The caller supplies the Zod/runtime decoder; this adapter only handles the
 * network call and returns the validated output.
 */
export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAiProvider requires an API key.');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: request.task },
        { role: 'user', content: JSON.stringify(request.input) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'output',
          schema: {},
          strict: true,
        },
      },
    });

    const rawText = response.output_text;
    if (!rawText) {
      throw new Error('OpenAI response was empty.');
    }

    const parsed = JSON.parse(rawText);
    const output = request.outputDecoder.parse(parsed);

    return {
      output,
      providerRequestId: response.id ?? 'openai:unknown',
      estimatedCostUsd: estimateCost(response),
    };
  }
}

function estimateCost(response: OpenAI.Responses.Response): number {
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  // Approximate gpt-4.1-mini pricing: $0.40 / 1M input, $1.60 / 1M output.
  return (inputTokens * 0.4 + outputTokens * 1.6) / 1_000_000;
}
