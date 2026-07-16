import { interpolate, useCurrentFrame } from 'remotion';
import { resolveFontFamily } from '../assets/fonts';
import type { VideoTheme } from '../themes/theme-schema';
import { resolveCaptionFadeEnvelope } from './fade';
import { captionDirection } from './types';
import type { CaptionLanguage } from './types';
import { splitCaptionText } from './split';
import { CAPTION_LAYOUT } from './layout';

export interface CaptionStripProps {
  /** Caption text to display. */
  text: string;
  /** Validated theme. */
  theme: VideoTheme;
  /** Frame window start. */
  startFrame: number;
  /** Frame window end. */
  endFrame: number;
  /** Caption language; drives direction and line-splitting budget. */
  language: CaptionLanguage;
}

/**
 * Bottom caption strip.
 *
 * - Stays inside the 9:16 safe area.
 * - Supports LTR (English/French) and RTL (Arabic) via CSS direction.
 * - Splits long text into multiple lines on word boundaries.
 * - Fades in and out within the provided frame window when the scene is long
 *   enough; ultra-short scenes render at full opacity instead of constructing
 *   duplicate or reversed interpolation points.
 */
export const CaptionStrip: React.FC<CaptionStripProps> = ({
  text,
  theme,
  startFrame,
  endFrame,
  language,
}) => {
  const frame = useCurrentFrame();
  const lines = splitCaptionText(text, language);
  const direction = captionDirection(language);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const fadeEnvelope = resolveCaptionFadeEnvelope(startFrame, endFrame);
  const opacity = fadeEnvelope
    ? interpolate(frame, fadeEnvelope.inputRange, fadeEnvelope.outputRange, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  if (lines.length === 0) return null;

  return (
    <div
      dir={direction}
      style={{
        position: 'absolute',
        bottom: CAPTION_LAYOUT.stripBottom,
        left: CAPTION_LAYOUT.safeLeft,
        right: CAPTION_LAYOUT.safeRight,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
      }}
    >
      <div
        style={{
          direction,
          fontFamily: bodyFamily,
          fontSize: CAPTION_LAYOUT.fontSize,
          lineHeight: `${CAPTION_LAYOUT.lineHeight}px`,
          color: theme.colors.text,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          padding: `${CAPTION_LAYOUT.paddingVertical}px ${CAPTION_LAYOUT.paddingHorizontal}px`,
          borderRadius: theme.borderRadius,
          textAlign: direction === 'rtl' ? 'right' : 'center',
          maxWidth: '100%',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {lines.map((line, index) => (
          <div key={index} style={{ whiteSpace: 'nowrap' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
