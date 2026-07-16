import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { resolveFontFamily } from '../assets/fonts';
import { MapCanvas } from '../geo/MapCanvas';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';

/**
 * Map highlight scene.
 *
 * By default renders a deterministic D3 Geo vector map from Natural Earth data.
 * If a legacy `mapAsset` path is provided and no vector focus is configured,
 * it falls back to the static image so older plans keep rendering.
 *
 * Captions are rendered centrally by MapVideoComposition from the plan's
 * narration caption track.
 */
export const MapHighlightScene: React.FC<SceneProps> = ({
  scene,
  theme,
  startFrame,
  durationInFrames,
}) => {
  assertSceneKind(scene, 'map-highlight');
  const frame = useCurrentFrame();
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);

  // Smooth camera move from a world view to the focused countries.
  const zoomProgress =
    scene.focusIsoCodes.length > 0
      ? interpolate(frame, [startFrame, startFrame + durationInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const hasVectorMap =
    scene.focusIsoCodes.length > 0 ||
    scene.contextIsoCodes.length > 0 ||
    scene.labels.length > 0 ||
    scene.mapAsset === undefined;

  return (
    <SceneShell theme={theme}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <h2
          style={{
            fontFamily: headingFamily,
            fontSize: 64,
            fontWeight: 800,
            color: theme.colors.text,
            margin: '0 0 32px',
            lineHeight: 1.1,
          }}
        >
          {scene.label}
        </h2>

        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          {hasVectorMap ? (
            <MapCanvas
              width={920}
              height={960}
              theme={theme}
              projection={scene.projection}
              focusIsoCodes={scene.focusIsoCodes}
              contextIsoCodes={scene.contextIsoCodes}
              labels={scene.labels}
              zoomProgress={zoomProgress}
            />
          ) : (
            <Img
              src={staticFile(scene.mapAsset ?? '')}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            marginTop: 32,
          }}
        >
          {scene.highlighted.map((region) => (
            <div
              key={region}
              style={{
                fontFamily: bodyFamily,
                fontSize: 28,
                fontWeight: 600,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                padding: '10px 22px',
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.colors.accent}`,
              }}
            >
              {region}
            </div>
          ))}
        </div>
      </div>
    </SceneShell>
  );
};
