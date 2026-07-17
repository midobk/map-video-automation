import { Img, staticFile, useCurrentFrame } from 'remotion';
import { resolveFontFamily } from '../assets/fonts';
import { CaptionStrip } from '../captions/renderer';
import { MAP_VIDEO_FPS } from '../compositions/map-video/map-video-schema';
import { MapCanvas } from '../geo/MapCanvas';
import { resolveMapZoomProgress } from '../geo/zoom';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';
import { resolveSceneCaptionPresentation } from './caption-presentation';

/** Render a vector map, with a static-map fallback for legacy plans. */
export const MapHighlightScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'map-highlight');
  const frame = useCurrentFrame();
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const captionPresentation = resolveSceneCaptionPresentation(scene);
  const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * MAP_VIDEO_FPS));
  const hasVectorMap =
    scene.focusIsoCodes.length > 0 ||
    scene.contextIsoCodes.length > 0 ||
    scene.labels.length > 0 ||
    scene.mapAsset === undefined;
  const zoomProgress =
    scene.focusIsoCodes.length > 0 ? resolveMapZoomProgress(frame, durationInFrames) : 0;

  return (
    <SceneShell theme={theme} reserveCaptionSpace={Boolean(scene.caption)}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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
      {scene.caption && (
        <CaptionStrip
          text={scene.caption}
          theme={theme}
          startFrame={captionPresentation.startFrame}
          endFrame={captionPresentation.endFrame}
          language={captionPresentation.language}
          lines={captionPresentation.lines}
        />
      )}
    </SceneShell>
  );
};
