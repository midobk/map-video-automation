import type { z } from 'zod';
import type { CalculateMetadataFunction } from 'remotion';

/**
 * Typed composition registry.
 *
 * Authoritative rendering logic lives in `@mapvideo/renderer`. Each composition
 * exposes its id, React component, Zod schema, metadata function, and default
 * props. The local `apps/remotion-studio` only iterates the registry instead of
 * hardcoding composition details.
 */
export interface CompositionDefinition<TProps extends Record<string, unknown>> {
  id: string;
  component: React.ComponentType<TProps>;
  schema: z.ZodType<TProps>;
  calculateMetadata: CalculateMetadataFunction<TProps>;
  fps: number;
  width: number;
  height: number;
  /** Static initial duration used by the Studio composition registration. */
  durationInFrames: number;
  defaultProps: TProps;
}

/**
 * Untyped storage shape used by the registry. `any` is intentionally limited to
 * internal storage; public accessors return typed `CompositionDefinition<T>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCompositionDefinition = CompositionDefinition<any>;

export class DuplicateCompositionIdError extends Error {
  constructor(readonly id: string) {
    super(`Duplicate composition id "${id}".`);
    this.name = 'DuplicateCompositionIdError';
  }
}

export class CompositionRegistry {
  private readonly byId = new Map<string, AnyCompositionDefinition>();

  constructor(definitions: readonly AnyCompositionDefinition[] = []) {
    for (const def of definitions) {
      this.register(def);
    }
  }

  register(definition: AnyCompositionDefinition): this {
    if (this.byId.has(definition.id)) {
      throw new DuplicateCompositionIdError(definition.id);
    }
    this.byId.set(definition.id, definition);
    return this;
  }

  get<T extends Record<string, unknown>>(id: string): CompositionDefinition<T> | undefined {
    return this.byId.get(id) as CompositionDefinition<T> | undefined;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly AnyCompositionDefinition[] {
    return Array.from(this.byId.values());
  }

  ids(): readonly string[] {
    return Array.from(this.byId.keys());
  }
}

/**
 * Convenience helper to build a typed definition without manually widening
 * generic parameters.
 */
export function defineComposition<TProps extends Record<string, unknown>>(
  definition: CompositionDefinition<TProps>,
): CompositionDefinition<TProps> {
  return definition;
}
