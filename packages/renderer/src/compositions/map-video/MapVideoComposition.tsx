import { AbsoluteFill, Sequence } from 'remotion';
import { ThemeProvider } from '../../themes/theme';
import { resolveSceneRenderer } from '../../scenes';
import { buildSceneSchedule } from './calculate-metadata';
import type { MapVideoPlan } from './map-video-schema';

/** Generic schema-driven map-video composition. */
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
              <Scene scene={scene} theme={theme} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
