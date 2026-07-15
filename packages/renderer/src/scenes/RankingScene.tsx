import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import { CaptionStrip } from '../captions/renderer';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';
import { resolveSceneCaptionPresentation } from './caption-presentation';

/**
 * Ranking scene. Shows up to seven ranked items with labels and values.
 * Items are rendered in the order given; sort them before rendering if a
 * particular order is required.
 */
export const RankingScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'ranking');
  const titleReveal = useReveal(8, { lift: 30 });
  const { items } = scene;
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const captionPresentation = resolveSceneCaptionPresentation(scene);

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
            fontSize: 58,
            fontWeight: 800,
            color: theme.colors.text,
            margin: '0 0 48px',
            lineHeight: 1.1,
            opacity: titleReveal.opacity,
            transform: `translateY(${titleReveal.translateY}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {items.map((item, index) => {
            const reveal = useReveal(14 + index * 6, { lift: 20 });
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '22px 28px',
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius,
                  opacity: reveal.opacity,
                  transform: `translateY(${reveal.translateY}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: bodyFamily,
                    fontSize: 34,
                    fontWeight: 600,
                    color: theme.colors.text,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontFamily: headingFamily,
                    fontSize: 38,
                    fontWeight: 800,
                    color: theme.colors.accent,
                  }}
                >
                  {item.value}
                </span>
              </div>
            );
          })}
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
