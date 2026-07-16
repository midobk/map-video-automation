import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import { CaptionStrip } from '../captions/renderer';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';
import { resolveSceneCaptionPresentation } from './caption-presentation';

/**
 * Comparison scene. Shows two items side by side (or stacked on narrow 9:16).
 */
export const ComparisonScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'comparison');
  const titleReveal = useReveal(8, { lift: 30 });
  const leftReveal = useReveal(18, { lift: 24 });
  const rightReveal = useReveal(26, { lift: 24 });
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const captionPresentation = resolveSceneCaptionPresentation(scene);

  const cardStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: 36,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.accent}`,
  };

  return (
    <SceneShell theme={theme} reserveCaptionSpace={Boolean(scene.caption)}>
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
            fontSize: 58,
            fontWeight: 800,
            color: theme.colors.text,
            margin: '0 0 48px',
            lineHeight: 1.1,
            textAlign: 'center',
            opacity: titleReveal.opacity,
            transform: `translateY(${titleReveal.translateY}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            gap: 32,
          }}
        >
          <div
            style={{
              ...cardStyle,
              opacity: leftReveal.opacity,
              transform: `translateY(${leftReveal.translateY}px)`,
            }}
          >
            <div
              style={{
                fontFamily: bodyFamily,
                fontSize: 30,
                fontWeight: 600,
                color: theme.colors.mutedText,
                marginBottom: 18,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {scene.left.label}
            </div>
            <div
              style={{
                fontFamily: headingFamily,
                fontSize: 52,
                fontWeight: 800,
                color: theme.colors.text,
              }}
            >
              {scene.left.value}
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              opacity: rightReveal.opacity,
              transform: `translateY(${rightReveal.translateY}px)`,
            }}
          >
            <div
              style={{
                fontFamily: bodyFamily,
                fontSize: 30,
                fontWeight: 600,
                color: theme.colors.mutedText,
                marginBottom: 18,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {scene.right.label}
            </div>
            <div
              style={{
                fontFamily: headingFamily,
                fontSize: 52,
                fontWeight: 800,
                color: theme.colors.accent,
              }}
            >
              {scene.right.value}
            </div>
          </div>
        </div>
      </div>
      {scene.caption && (
        <CaptionStrip
          text={scene.caption}
          theme={theme}
          startFrame={captionPresentation.startFrame}
          endFrame={captionPresentation.endFrame}
          language={captionPresentation.language}
        />
      )}
    </SceneShell>
  );
};
