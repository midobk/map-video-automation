import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';

/**
 * Outro scene. A calm closing card with a heading and optional subtitle.
 *
 * Captions are rendered centrally by MapVideoComposition from the plan's
 * narration caption track.
 */
export const OutroScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'outro');
  const titleReveal = useReveal(10, { lift: 34 });
  const subtitleReveal = useReveal(26);
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
        <h2
          style={{
            fontFamily: headingFamily,
            fontSize: 84,
            fontWeight: 800,
            color: theme.colors.text,
            lineHeight: 1.1,
            margin: 0,
            opacity: titleReveal.opacity,
            transform: `translateY(${titleReveal.translateY}px)`,
          }}
        >
          {scene.title}
        </h2>
        {scene.subtitle && (
          <p
            style={{
              fontFamily: bodyFamily,
              fontSize: 36,
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
    </SceneShell>
  );
};
