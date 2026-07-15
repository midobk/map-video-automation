import { TitleScene } from './TitleScene';
import { MapHighlightScene } from './MapHighlightScene';
import { RankingScene } from './RankingScene';
import { StatCardScene } from './StatCardScene';
import { ComparisonScene } from './ComparisonScene';
import { CaptionScene } from './CaptionScene';
import { OutroScene } from './OutroScene';
import type { MapVideoSceneKind } from '../compositions/map-video/map-video-schema';
import type { SceneProps } from './types';

/**
 * Typed scene renderer registry.
 *
 * Adding a scene requires exactly one schema, one component, and one entry
 * here. The generic map-video runtime does not need to know about individual
 * scene kinds beyond this map.
 */
export const sceneRenderers = {
  title: TitleScene,
  'map-highlight': MapHighlightScene,
  ranking: RankingScene,
  'stat-card': StatCardScene,
  comparison: ComparisonScene,
  caption: CaptionScene,
  outro: OutroScene,
} satisfies SceneRendererRegistry;

export type SceneRendererRegistry = Record<MapVideoSceneKind, React.ComponentType<SceneProps>>;

export class UnsupportedSceneKindError extends Error {
  constructor(readonly kind: string) {
    super(`Unsupported scene kind "${kind}".`);
    this.name = 'UnsupportedSceneKindError';
  }
}

/**
 * Resolve a scene kind to its renderer component. Throws a clear error for
 * unsupported kinds so invalid plans fail before rendering.
 */
export function resolveSceneRenderer(kind: MapVideoSceneKind): React.ComponentType<SceneProps> {
  const renderer = sceneRenderers[kind];
  if (!renderer) {
    throw new UnsupportedSceneKindError(kind);
  }
  return renderer;
}
