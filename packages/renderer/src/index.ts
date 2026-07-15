/**
 * @mapvideo/renderer — authoritative Remotion rendering logic for the
 * Map Video Automation platform.
 *
 * This package contains animation helpers, asset-safety utilities, audio
 * behavior, validated themes, and props-driven compositions. It is consumed by
 * `apps/remotion-studio`, which is only the local development, preview, and
 * visual-inspection surface.
 */

// Animation helpers and spring presets.
export {
  SMOOTH,
  SNAPPY,
  GENTLE,
  useSceneTransition,
  useReveal,
  ramp,
  type EasingFunction,
} from './animation/anim';
export { VFX_INTENSITY, vfx } from './animation/vfx';

// Asset-safety and font helpers.
export {
  resolveStaticPath,
  validateAssetType,
  assertNoDuplicateAssets,
  validateAssetManifest,
  AssetPathError,
  ALLOWED_FONTS,
  resolveFontFamily,
  type AssetType,
  type AssetDeclaration,
  type AllowedFontFamily,
} from './assets';

// Audio behavior and optional audio.
export {
  resolveMissingAssetBehavior,
  enforceMissingAsset,
  MissingAssetError,
  AudioConfigContext,
  AudioConfigProvider,
  useAudioConfig,
  OptionalAudio,
  type MissingAssetBehavior,
  type RenderEnvironment,
  type AssetKind,
  type MissingAssetEvent,
  type AudioConfig,
  type OptionalAudioProps,
} from './audio';

// Validated themes.
export {
  videoThemeSchema,
  parseTheme,
  safeParseTheme,
  neutralDarkTheme,
  neutralLightTheme,
  exampleThemes,
  ThemeProvider,
  useTheme,
  type VideoTheme,
  type ExampleThemeId,
} from './themes';

// Compositions.
export {
  startSchema,
  calculateStartMetadata,
  StartComposition,
  START_FPS,
  START_WIDTH,
  START_HEIGHT,
  type StartProps,
} from './compositions';

// Deterministic fixture.
export { starterFixtureProps } from './fixtures';