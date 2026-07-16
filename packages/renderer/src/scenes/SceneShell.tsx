import { AbsoluteFill } from 'remotion';
import { useSceneTransition } from '../animation/anim';
import { resolveFontFamily } from '../assets/fonts';
import { CAPTION_LAYOUT } from '../captions/layout';
import type { VideoTheme } from '../themes/theme-schema';

export interface SceneShellProps {
  theme: VideoTheme;
  children: React.ReactNode;
  header?: React.ReactNode;
  /** Keep normal scene content above the absolute bottom caption strip. */
  reserveCaptionSpace?: boolean;
}

export const SCENE_SHELL_PADDING = {
  top: 160,
  horizontal: 80,
  bottom: 160,
  captionGap: 52,
} as const;

export function sceneShellPaddingBottom(reserveCaptionSpace: boolean): number {
  if (!reserveCaptionSpace) return SCENE_SHELL_PADDING.bottom;

  const maximumCaptionHeight =
    CAPTION_LAYOUT.maxLines * CAPTION_LAYOUT.lineHeight +
    CAPTION_LAYOUT.paddingVertical * 2;

  return Math.max(
    SCENE_SHELL_PADDING.bottom,
    CAPTION_LAYOUT.stripBottom + maximumCaptionHeight + SCENE_SHELL_PADDING.captionGap,
  );
}

/**
 * Generic scene wrapper.
 *
 * - Applies the validated theme.
 * - Provides the standard enter/exit envelope (fade + lift).
 * - Adds consistent 9:16 safe-area padding.
 * - Can reserve the complete bottom-caption envelope so normal scene content
 *   never renders underneath an absolute caption strip.
 * - Optional top header slot.
 */
export const SceneShell: React.FC<SceneShellProps> = ({
  theme,
  children,
  header,
  reserveCaptionSpace = false,
}) => {
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
          boxSizing: 'border-box',
          paddingTop: SCENE_SHELL_PADDING.top,
          paddingLeft: SCENE_SHELL_PADDING.horizontal,
          paddingRight: SCENE_SHELL_PADDING.horizontal,
          paddingBottom: sceneShellPaddingBottom(reserveCaptionSpace),
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
