import { describe, expect, it } from 'vitest';
import {
  CompositionRegistry,
  DuplicateCompositionIdError,
  defineComposition,
  starterComposition,
} from '../src';

const dummyComposition = defineComposition({
  id: 'dummy',
  component: () => null,
  schema: starterComposition.schema,
  calculateMetadata: starterComposition.calculateMetadata,
  fps: starterComposition.fps,
  width: starterComposition.width,
  height: starterComposition.height,
  durationInFrames: starterComposition.durationInFrames,
  defaultProps: starterComposition.defaultProps,
});

describe('CompositionRegistry', () => {
  it('registers a composition and retrieves it by id', () => {
    const registry = new CompositionRegistry([starterComposition]);
    expect(registry.has('starter')).toBe(true);
    expect(registry.get('starter')?.id).toBe('starter');
    expect(registry.ids()).toEqual(['starter']);
  });

  it('lists all registered compositions', () => {
    const registry = new CompositionRegistry([starterComposition, dummyComposition]);
    expect(registry.all().map((d) => d.id)).toEqual(['starter', 'dummy']);
  });

  it('throws on duplicate composition ids', () => {
    expect(() => new CompositionRegistry([starterComposition, starterComposition])).toThrow(
      DuplicateCompositionIdError,
    );
  });

  it('throws when registering a duplicate id explicitly', () => {
    const registry = new CompositionRegistry();
    registry.register(starterComposition);
    expect(() => registry.register(starterComposition)).toThrow(DuplicateCompositionIdError);
  });
});
