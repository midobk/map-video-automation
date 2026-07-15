import { AbsoluteFill } from 'remotion';
import { useSceneTransition } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import type { VideoTheme } from '../themes/theme-schema';

export interface SceneShellProps {
  theme: VideoTheme;
  children: React.ReactNode;
  header?: React.ReactNode;
}

/**
 * Generic scene wrapper.
 *
 * - Applies the validated theme.
 * - Provides the standard enter/exit envelope (fade + lift).
 * - Adds consistent 9:16 safe-area padding.
 * - Optional top header slot.
 *
 * The background and typography come from the theme, so the shell is brand-free
 * and works with any validated `VideoTheme`.
 */
export const SceneShell: React.FC<SceneShellProps> = ({ theme, children, header }) => {
  const { opacity, translateY } = useSceneTransition({ enter: 18, exit: 14, lift: 26 });
  const headingFamily = resolveFontFamily(theme.typography.headingFamily);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        fontFamily: headingFamily,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {header}
      <AbsoluteFill
        style={{
          paddingTop: 160,
          paddingLeft: 80,
          paddingRight: 80,
          paddingBottom: 160,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
