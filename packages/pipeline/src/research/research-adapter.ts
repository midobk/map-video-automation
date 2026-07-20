import type { FactPack } from '../schemas/fact-pack';

/**
 * Research adapter contract.
 *
 * Given a topic prompt, return a validated fact pack with claims and sources.
 */
export interface ResearchAdapter {
  research(topic: string, options?: { idempotencyKey?: string }): Promise<FactPack>;
}
