import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import { CaptionStrip } from '../captions/renderer';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';

/**
 * Stat-card scene. Displays a single large metric with a headline and optional
 * subtext, centered in the 9:16 safe area.
 */
export const StatCardScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'stat-card');
  const headlineReveal = useReveal(8, { lift: 30 });
  const valueReveal = useReveal(20, { lift: 20 });
  const subtextReveal = useReveal(32, { lift: 16 });
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);

  return (
    <SceneShell theme={theme}>
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
        <div
          style={{
            fontFamily: headingFamily,
            fontSize: 46,
            fontWeight: 700,
            color: theme.colors.mutedText,
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 32,
            opacity: headlineReveal.opacity,
            transform: `translateY(${headlineReveal.translateY}px)`,
          }}
        >
          {scene.headline}
        </div>

        <div
          style={{
            fontFamily: headingFamily,
            fontSize: 140,
            fontWeight: 900,
            color: theme.colors.accent,
            lineHeight: 1,
            opacity: valueReveal.opacity,
            transform: `translateY(${valueReveal.translateY}px)`,
          }}
        >
          {scene.value}
        </div>

        {scene.subtext && (
          <div
            style={{
              fontFamily: bodyFamily,
              fontSize: 38,
              fontWeight: 500,
              color: theme.colors.text,
              marginTop: 36,
              maxWidth: 760,
              opacity: subtextReveal.opacity,
              transform: `translateY(${subtextReveal.translateY}px)`,
            }}
          >
            {scene.subtext}
          </div>
        )}
      </div>
      {scene.caption && (
        <CaptionStrip
          text={scene.caption}
          theme={theme}
          startFrame={0}
          endFrame={120}
          language="en"
        />
      )}
    </SceneShell>
  );
};
