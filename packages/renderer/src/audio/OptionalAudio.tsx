import { Audio, staticFile } from 'remotion';
import { useAudioConfig } from './audio-config';
import {
  enforceMissingAsset,
  resolveMissingAssetBehavior,
  type AssetKind,
} from './missing-asset';

/**
 * `<Audio>` wrapper that handles missing files safely.
 *
 * Behaviour:
 *   - Production render (no probe): audio is rendered unconditionally. Required
 *     assets are validated before rendering, so a missing required asset fails
 *     loudly through Remotion rather than silently producing an incomplete video.
 *   - Studio (probe provided): the file is probed synchronously before mounting
 *     `<Audio>`, so a missing file never triggers the media-bunny 404. Missing
 *     required assets throw; missing optional assets warn or are ignored.
 */
export interface OptionalAudioProps {
  /** Path relative to public/, no leading slash. */
  src: string;
  volume?: number;
  /** Required assets must exist; optional assets may be absent. */
  required?: boolean;
  /** Asset category, drives the missing-asset policy. */
  kind?: AssetKind['kind'];
}

export const OptionalAudio: React.FC<OptionalAudioProps> = ({
  src,
  volume = 1,
  required = false,
  kind = 'sfx',
}) => {
  const { probe, environment } = useAudioConfig();

  // No probe = production render: render unconditionally.
  if (probe === null) {
    return <Audio src={staticFile(src)} volume={volume} />;
  }

  // Studio: probe synchronously so we never mount <Audio> for a missing file.
  const exists = probe(src);
  if (exists) {
    return <Audio src={staticFile(src)} volume={volume} />;
  }

  const behavior = resolveMissingAssetBehavior(environment, { required, kind });
  enforceMissingAsset(behavior, { path: src, kind, required, environment });
  return null;
};