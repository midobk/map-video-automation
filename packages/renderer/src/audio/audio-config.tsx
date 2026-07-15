import { createContext, useContext } from 'react';
import type { RenderEnvironment } from './missing-asset';

/**
 * Audio configuration shared across a composition.
 *
 * `probe` answers "does this public/ path exist right now?" synchronously. It
 * is the Studio-only mechanism that lets `<OptionalAudio>` avoid mounting an
 * `<Audio>` for a missing file (which would trigger a media-bunny 404). In a
 * production render there is no Studio static-files API, so `probe` is `null`
 * and `<OptionalAudio>` renders audio unconditionally — required assets are
 * validated before rendering, so a missing required asset in production fails
 * loudly through Remotion itself.
 *
 * Keeping `probe` injectable means this package never imports `@remotion/studio`
 * directly; the Studio app supplies the probe, making `@remotion/studio` an
 * explicit, optional concern of the app, not a hidden dependency of the
 * renderer.
 */
export interface AudioConfig {
  /** Synchronous existence probe for public/ paths, or null in production. */
  readonly probe: ((path: string) => boolean) | null;
  readonly environment: RenderEnvironment;
}

export const AudioConfigContext = createContext<AudioConfig>({
  probe: null,
  environment: 'render',
});

export function useAudioConfig(): AudioConfig {
  return useContext(AudioConfigContext);
}

/** Provide a Studio file-existence probe and environment to a composition. */
export interface AudioConfigProviderProps {
  probe?: AudioConfig['probe'];
  environment?: AudioConfig['environment'];
  children: React.ReactNode;
}

export const AudioConfigProvider: React.FC<AudioConfigProviderProps> = ({
  probe,
  environment,
  children,
}) => (
  <AudioConfigContext.Provider
    value={{
      probe: probe ?? null,
      environment: environment ?? 'render',
    }}
  >
    {children}
  </AudioConfigContext.Provider>
);