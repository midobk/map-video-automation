import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { CaptionStrip } from '../../captions/renderer';
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
 * - Adds a global narration audio track when the plan provides one.
 * - Renders timed captions centrally from the narration caption track.
 * - Wraps the tree in the validated theme.
 */
export const MapVideoComposition: React.FC<MapVideoPlan> = (plan) => {
  const { theme, scenes, narration } = plan;
  const schedule = buildSceneSchedule(plan);
  const captionLanguage = narration?.language ?? 'en';
  const captionLines = narration?.captions?.lines ?? [];

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
        {narration?.audioAsset && <Audio src={staticFile(narration.audioAsset)} volume={1} />}
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
                captionLanguage={captionLanguage}
              />
            </Sequence>
          );
        })}
        {captionLines.map((line: { text: string; startFrame: number; endFrame: number }) => (
          <CaptionStrip
            key={`${line.startFrame}-${line.text}`}
            text={line.text}
            theme={theme}
            startFrame={line.startFrame}
            endFrame={line.endFrame}
            language={captionLanguage}
          />
        ))}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
