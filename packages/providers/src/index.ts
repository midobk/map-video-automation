export type ProviderMode = 'mock' | 'openai';

export interface RuntimeDecoder<T> {
  parse(input: unknown): T;
}

export interface StructuredGenerationRequest<T> {
  task: string;
  input: unknown;
  idempotencyKey: string;
  outputDecoder: RuntimeDecoder<T>;
}

export interface StructuredGenerationResult<T> {
  output: T;
  providerRequestId: string;
  estimatedCostUsd: number;
}

export interface AiProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>>;
}

export class MockAiProvider implements AiProvider {
  public constructor(private readonly fixture: unknown) {}

  public async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const output = request.outputDecoder.parse(structuredClone(this.fixture));

    return Promise.resolve({
      output,
      providerRequestId: `mock:${request.idempotencyKey}`,
      estimatedCostUsd: 0,
    });
  }
}

export { OpenAiProvider } from './openai-provider';
