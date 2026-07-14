export type ProviderMode = 'mock' | 'openai';

export interface StructuredGenerationRequest {
  task: string;
  input: unknown;
  idempotencyKey: string;
}

export interface StructuredGenerationResult<T> {
  output: T;
  providerRequestId: string;
  estimatedCostUsd: number;
}

export interface AiProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult<T>>;
}

export class MockAiProvider implements AiProvider {
  public constructor(private readonly fixture: unknown) {}

  public async generateStructured<T>(
    request: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult<T>> {
    return Promise.resolve({
      output: structuredClone(this.fixture) as T,
      providerRequestId: `mock:${request.idempotencyKey}`,
      estimatedCostUsd: 0,
    });
  }
}
