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
 * whose `parameters` are the fact-pack JSON schema and force the tool call.
 *
 * In practice M3 frequently ignores forced `tool_choice` and returns the fact
 * pack as `message.content` (a ```json-fenced string) with finish_reason
 * 'stop'. We therefore accept either shape — `tool_calls[0].function.arguments`
 * or a JSON object extracted from `content` — and parse it through
 * `factPackSchema`.
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

    const message = response.choices[0]?.message;
    // MiniMax M3 is inconsistent about honoring forced tool_choice: it often
    // returns the fact pack as `content` (a ```json-fenced string) with
    // finish_reason 'stop' and no `tool_calls`. Accept either shape.
    const args = message?.tool_calls?.[0]?.function?.arguments;
    const raw = args ? extractJsonObject(args) : extractJsonObject(message?.content ?? '');
    if (!raw) {
      throw new Error(
        'MiniMax research response did not include a tool call or parseable JSON ' +
          `in content. content=${JSON.stringify(message?.content ?? '').slice(0, 200)}`,
      );
    }

    const parsed = JSON.parse(raw);
    return factPackSchema.parse(parsed);
  }
}

/**
 * Pull the first JSON object out of a model response that may be a bare JSON
 * string, a ```json-fenced block, or prose wrapping a JSON object. Returns the
 * raw object substring (balanced brace matching) so JSON.parse can handle it.
 */
function extractJsonObject(text: string): string | null {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}