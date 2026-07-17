import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import { CaptionStrip } from '../captions/renderer';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';
import { resolveSceneCaptionPresentation } from './caption-presentation';

/**
 * Title card scene. Centers a large heading, optional subtitle, and optional
 * bottom caption inside the 9:16 safe area.
 */
export const TitleScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'title');
  const titleReveal = useReveal(8, { lift: 40 });
  const subtitleReveal = useReveal(22);
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const captionPresentation = resolveSceneCaptionPresentation(scene);

  return (
    <SceneShell theme={theme} reserveCaptionSpace={Boolean(scene.caption)}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          textAlign: 'center',
        }}
      >
        {scene.eyebrow && (
          <div
            style={{
              fontFamily: bodyFamily,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: theme.colors.accent,
              marginBottom: 18,
              opacity: titleReveal.opacity,
              transform: `translateY(${titleReveal.translateY}px)`,
            }}
          >
            {scene.eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: headingFamily,
            fontSize: 92,
            fontWeight: 800,
            color: theme.colors.text,
            lineHeight: 1.1,
            margin: 0,
            opacity: titleReveal.opacity,
            transform: `translateY(${titleReveal.translateY}px)`,
          }}
        >
          {scene.title}
        </h1>
        {scene.subtitle && (
          <p
            style={{
              fontFamily: bodyFamily,
              fontSize: 38,
              fontWeight: 500,
              color: theme.colors.accent,
              marginTop: 28,
              opacity: subtitleReveal.opacity,
              transform: `translateY(${subtitleReveal.translateY}px)`,
            }}
          >
            {scene.subtitle}
          </p>
        )}
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
