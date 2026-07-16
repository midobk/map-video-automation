import { TitleScene } from './TitleScene';
import { MapHighlightScene } from './MapHighlightScene';
import { RankingScene } from './RankingScene';
import { StatCardScene } from './StatCardScene';
import { ComparisonScene } from './ComparisonScene';
import { CaptionScene } from './CaptionScene';
import { OutroScene } from './OutroScene';
import type { MapVideoSceneKind } from '../compositions/map-video/map-video-schema';
import type { SceneProps } from './types';

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

export function resolveSceneRenderer(kind: MapVideoSceneKind): React.ComponentType<SceneProps> {
  const renderer = sceneRenderers[kind];
  if (!renderer) throw new UnsupportedSceneKindError(kind);
  return renderer;
}
