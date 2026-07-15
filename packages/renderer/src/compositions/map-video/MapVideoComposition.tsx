import { AbsoluteFill, Sequence } from 'remotion';
import { ThemeProvider } from '../../themes/theme';
import { resolveSceneRenderer } from '../../scenes';
import { buildSceneSchedule } from './calculate-metadata';
import type { MapVideoPlan } from './map-video-schema';

/**
 * Generic map-video composition.
 *
 * - Validates nothing at render time (Remotion already enforces the schema).
 * - Builds a <Sequence> per scene from the metadata-driven schedule.
 * - Delegates each scene to the renderer registered for its kind.
 * - Wraps the tree in the validated theme.
 */
export const MapVideoComposition: React.FC<MapVideoPlan> = (plan) => {
  const { theme, scenes } = plan;
  const schedule = buildSceneSchedule(plan);

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
        {scenes.map((scene, index) => {
          const { startFrame, durationInFrames } = schedule[index]!;
          const Scene = resolveSceneRenderer(scene.kind);
          return (
            <Sequence key={scene.id} from={startFrame} durationInFrames={durationInFrames}>
              <Scene
                scene={scene}
                theme={theme}
                startFrame={startFrame}
                durationInFrames={durationInFrames}
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
