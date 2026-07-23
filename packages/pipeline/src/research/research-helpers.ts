/**
 * Shared research-prompt and schema helpers used by every real research
 * adapter (OpenAI, MiniMax, …). Kept here so the prompt wording and the
 * fact-pack JSON schema stay in one place across providers.
 */

/**
 * Build the user prompt that asks the model for a fact pack for a topic.
 */
export function buildResearchPrompt(topic: string): string {
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

/**
 * Minimal hand-rolled JSON schema matching `factPackSchema`.
 *
 * Used as the `parameters` of a function tool for providers that don't support
 * OpenAI's native `response_format`/`json_schema` (e.g. MiniMax M3), and as the
 * `text.format.schema` for the OpenAI Responses API. Replace with
 * zod-to-json-schema if this becomes unwieldy.
 */
export function convertZodToJsonSchema(): Record<string, unknown> {
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