import { loadFont } from '@remotion/google-fonts/Inter';

/**
 * Font loading for the renderer.
 *
 * Fonts are loaded through `@remotion/google-fonts`, which bundles each family
 * as its own subpath. Remotion blocks rendering until the font is ready, so text
 * never renders in a fallback face, and no remote font fetch happens at render
 * time beyond Remotion's own bundled-font mechanism.
 *
 * To add another family, import its subpath and register it in `ALLOWED_FONTS`
 * below. Do not accept arbitrary family strings — that would allow remote
 * runtime downloads of un-vetted fonts.
 */
const inter = loadFont('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});

/** Map of supported family name -> resolved CSS font-family. */
export const ALLOWED_FONTS = {
  Inter: inter.fontFamily,
} as const;

export type AllowedFontFamily = keyof typeof ALLOWED_FONTS;

/**
 * Resolve a theme font-family string to a loaded CSS family. Throws on
 * unsupported families rather than silently falling back.
 */
export function resolveFontFamily(family: string): string {
  if (family in ALLOWED_FONTS) {
    return ALLOWED_FONTS[family as AllowedFontFamily];
  }
  throw new Error(
    `Unsupported font family "${family}". Supported: ${Object.keys(ALLOWED_FONTS).join(', ')}. Add the family to ALLOWED_FONTS before using it.`,
  );
}