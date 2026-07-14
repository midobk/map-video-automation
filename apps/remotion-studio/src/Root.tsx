import { Composition, Folder } from 'remotion';
import {
  StartComposition,
  startSchema,
  calculateStartMetadata,
  START_FPS,
  START_WIDTH,
  START_HEIGHT,
  starterFixtureProps,
} from '@mapvideo/renderer';

/**
 * Local Remotion Studio entry. Each composition is defined in
 * `@mapvideo/renderer` (the authoritative package) and only *registered* here,
 * so the studio is a thin preview and visual-inspection surface.
 *
 * Render the fixture with:
 *   pnpm remotion:render:fixture
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="fixtures">
      <Composition
        id="starter"
        component={StartComposition}
        schema={startSchema}
        calculateMetadata={calculateStartMetadata}
        fps={START_FPS}
        width={START_WIDTH}
        height={START_HEIGHT}
        durationInFrames={START_FPS * 6}
        defaultProps={starterFixtureProps}
      />
    </Folder>
  );
};