import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { useReveal } from '../../animation/anim';
import { vfx } from '../../animation/vfx';
import { resolveFontFamily } from '../../assets/fonts';
import { ThemeProvider } from '../../themes/theme';
import { START_FPS } from './start-schema';
import type { StartProps } from './start-schema';

/**
 * Generic starter fixture composition: a vertical title card that proves the
 * whole pipeline (fonts, springs, Zod props, theme, metadata-driven timing)
 * works. Deterministic, offline, and free of client-specific content.
 */
export const StartComposition: React.FC<StartProps> = ({
  theme,
  title,
  subtitle,
  durationSeconds,
}) => {
  const frame = useCurrentFrame();
  const titleReveal = useReveal(8, { lift: 40 });
  const subtitleReveal = useReveal(22);

  const totalFrames = Math.max(1, Math.round(durationSeconds * START_FPS));
  // Glow swells in then settles — frame-driven, no current-time reads.
  const glow = interpolate(
    frame,
    [0, Math.min(60, totalFrames / 2)],
    [0.15, 0.45],
    { extrapolateRight: 'clamp' },
  );

  const headingFamily = resolveFontFamily(theme.typography.headingFamily);
  const bodyFamily = resolveFontFamily(theme.typography.bodyFamily);
  const radius = theme.borderRadius;
  const surface = theme.colors.surface;

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill
        style={{
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 80,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.colors.accent} 0%, transparent 70%)`,
            opacity: vfx(glow),
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: headingFamily,
              fontSize: 92,
              fontWeight: 800,
              color: theme.colors.text,
              margin: 0,
              lineHeight: 1.1,
              opacity: titleReveal.opacity,
              transform: `translateY(${titleReveal.translateY}px)`,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: bodyFamily,
              fontSize: 34,
              fontWeight: 500,
              color: theme.colors.accent,
              marginTop: 28,
              padding: `10px ${20 + radius / 2}px`,
              borderRadius: radius,
              backgroundColor: surface,
              opacity: subtitleReveal.opacity,
              transform: `translateY(${subtitleReveal.translateY}px)`,
            }}
          >
            {subtitle}
          </p>
        </div>
      </AbsoluteFill>
    </ThemeProvider>
  );
};