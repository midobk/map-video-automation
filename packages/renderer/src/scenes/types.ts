import type { VideoTheme } from '../themes/theme-schema';
import type { MapVideoScene } from '../compositions/map-video/map-video-schema';

/**
 * Props passed to every scene renderer by the generic map-video runtime.
 * Each component narrows `scene` to its specific kind internally.
 */
export interface SceneProps {
  scene: MapVideoScene;
  theme: VideoTheme;
  /** Global frame at which this scene starts in the composition timeline. */
  startFrame: number;
  /** Duration of this scene in frames, used for frame-driven animation. */
  durationInFrames: number;
}
