import OpenAI from 'openai';
import type { ResearchAdapter } from './research-adapter';
import { factPackSchema, type FactPack } from '../schemas/fact-pack';
import { buildResearchPrompt, convertZodToJsonSchema } from './research-helpers';

const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';
const MINIMAX_MODEL = 'MiniMax-M3';
const TOOL_NAME = 'record_fact_pack';

/**
 * MiniMax M3 research adapter.
 *
 * MiniMax M3 exposes an OpenAI-compatible Chat Completions API, so the standard
 * `openai` SDK works with a `baseURL` override. Unlike OpenAI's Responses API,
 * M3 has no native `response_format`/`json_schema` mode; structured output is
 * obtained through function-tool calling. We pass a `record_fact_pack` tool
 * whose `parameters` are the fact-pack JSON schema, force the tool call, and
 * parse `tool_calls[0].function.arguments` through `factPackSchema`.
 *
 * Requires an API key.
 */
export class MiniMaxResearchAdapter implements ResearchAdapter {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('MiniMaxResearchAdapter requires a MINIMAX_API_KEY.');
    }
    this.client = new OpenAI({ apiKey, baseURL: MINIMAX_BASE_URL });
  }

  async research(topic: string): Promise<FactPack> {
    const baseParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: MINIMAX_MODEL,
      messages: [{ role: 'user', content: buildResearchPrompt(topic) }],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL_NAME,
            description: 'Record the structured fact pack for the geography video topic.',
            parameters: convertZodToJsonSchema(),
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    };

    // MiniMax extension: skip reasoning for faster, more deterministic
    // structured output. Not in the OpenAI SDK types, so cast the combined
    // params.
    const response = await this.client.chat.completions.create({
      ...baseParams,
      thinking: { type: 'disabled' },
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      throw new Error('MiniMax research response did not include a tool call.');
    }

    const parsed = JSON.parse(args);
    return factPackSchema.parse(parsed);
  }
}