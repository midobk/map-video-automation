import { startSchema, type StartProps } from './compositions/starter/start-schema';
import { neutralDarkTheme } from './themes/examples';

/**
 * Deterministic fixture props for the starter composition.
 *
 * These are the default props used by `apps/remotion-studio` and by the
 * `remotion:render:fixture` / `remotion:frame:fixture` commands. They are
 * neutral, contain no client content, and need no network access. They are
 * validated here so an accidental edit to the fixture is caught immediately.
 */
export const starterFixtureProps: StartProps = startSchema.parse({
  theme: neutralDarkTheme,
  title: 'Map Video Renderer',
  subtitle: 'Deterministic Remotion pipeline is ready',
  durationSeconds: 6,
});