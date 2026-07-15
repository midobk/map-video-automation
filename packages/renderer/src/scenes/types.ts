import type { VideoTheme } from '../themes/theme-schema';
import type { MapVideoScene } from '../compositions/map-video/map-video-schema';

/**
 * Props passed to every scene renderer by the generic map-video runtime.
 * Each component narrows `scene` to its specific kind internally.
 */
export interface SceneProps {
  scene: MapVideoScene;
  theme: VideoTheme;
}
