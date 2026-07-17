import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { ThemeProvider } from '../../themes/theme';
import { resolveSceneRenderer } from '../../scenes';
import { buildSceneSchedule } from './calculate-metadata';
import { MAP_VIDEO_FPS, type MapVideoPlan } from './map-video-schema';

/** Generic schema-driven map-video composition. */
export const MapVideoComposition: React.FC<MapVideoPlan> = (plan) => {
  const { theme, scenes, audioAsset, audioDurationSeconds } = plan;
  const schedule = buildSceneSchedule(plan);

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
        {audioAsset ? (
          <Audio
            src={staticFile(audioAsset)}
            /**
             * If the audio asset is longer than the visual composition, cap
             * playback to the composition duration. The render orchestrator
             * asserts audioDurationSeconds ≈ composition duration before
             * invoking the renderer; this is a safety net.
             */
            {...(audioDurationSeconds !== undefined
              ? { endAt: Math.round(audioDurationSeconds * MAP_VIDEO_FPS) }
              : {})}
          />
        ) : null}
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
