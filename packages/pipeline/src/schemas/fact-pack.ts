import { z } from 'zod';

/**
 * A sourced claim produced by the research phase.
 */
export const claimSchema = z.object({
  text: z.string().min(1).max(500),
  source: z.object({
    name: z.string().min(1).max(200),
    url: z.string().url().optional(),
  }),
});

/**
 * Risk level for a topic. Medium/high risk stops for human review before render.
 */
export const riskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

/**
 * Fact pack: structured output from the research adapter.
 */
export const factPackSchema = z.object({
  topic: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  claims: z.array(claimSchema).min(1).max(20),
  entities: z.array(z.string().min(1).max(120)).min(1).max(10),
  risk: riskLevelSchema.default('LOW'),
});

export type Claim = z.infer<typeof claimSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type FactPack = z.infer<typeof factPackSchema>;
