import { useReveal } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import type { SceneProps } from './types';
import { SceneShell } from './SceneShell';
import { assertSceneKind } from './assert-kind';

/**
 * Full-frame caption scene. Shows a single block of text centered in the frame.
 * Useful for transitional statements or quotes.
 */
export const CaptionScene: React.FC<SceneProps> = ({ scene, theme }) => {
  assertSceneKind(scene, 'caption');
  const reveal = useReveal(12, { lift: 30 });
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);

  return (
    <SceneShell theme={theme}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: bodyFamily,
            fontSize: 48,
            fontWeight: 600,
            color: theme.colors.text,
            lineHeight: 1.35,
            margin: 0,
            opacity: reveal.opacity,
            transform: `translateY(${reveal.translateY}px)`,
          }}
        >
          {scene.text}
        </p>
      </div>
    </SceneShell>
  );
};
