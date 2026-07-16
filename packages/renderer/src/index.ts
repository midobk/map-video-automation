/**
 * @mapvideo/renderer — authoritative Remotion rendering logic for the
 * Map Video Automation platform.
 *
 * This package contains animation helpers, asset-safety utilities, audio
 * behavior, validated themes, props-driven compositions, a generic scene-plan
 * runtime, captions, voice-provider boundary, and asset/voiceover manifests.
 * It is consumed by `apps/remotion-studio`, which is only the local
 * development, preview, and visual-inspection surface.
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
export {
  assetManifestSchema,
  parseAssetManifest,
  safeParseAssetManifest,
  AssetManifestError,
  type AssetManifest,
  type AssetManifestEntry,
  type AssetManifestInput,
} from './assets/manifest';

// Audio behavior, optional audio, and voice providers.
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
  type AudioConfigProviderProps,
  type OptionalAudioProps,
} from './audio';
export {
  voiceProviderSchema,
  voiceRequestSchema,
  voiceResultSchema,
  voiceoverManifestSchema,
  parseVoiceoverManifest,
  safeParseVoiceoverManifest,
  hashVoiceoverText,
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  encodeWav,
  estimateWavDurationSeconds,
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
  type VoiceoverManifest,
} from './voice';

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

// Composition registry and compositions.
export {
  type CompositionDefinition,
  type AnyCompositionDefinition,
  CompositionRegistry,
  DuplicateCompositionIdError,
  defineComposition,
} from './compositions';
export {
  startSchema,
  calculateStartMetadata,
  StartComposition,
  START_FPS,
  START_WIDTH,
  START_HEIGHT,
  starterComposition,
  type StartProps,
} from './compositions';

// Scene runtime.
export {
  sceneRenderers,
  resolveSceneRenderer,
  UnsupportedSceneKindError,
  type SceneRendererRegistry,
  type SceneProps,
  SceneShell,
} from './scenes';

// Captions.
export {
  captionDirection,
  captionLanguageSchema,
  captionLineSchema,
  captionTimingSchema,
  splitCaptionText,
  splitCaptionTextForRendering,
  measureCaptionLines,
  captionAvailableWidth,
  resolveCaptionFadeEnvelope,
  DEFAULT_CAPTION_FADE_FRAMES,
  MAX_CAPTION_LINES,
  CAPTION_SAFE_AREA,
  CAPTION_LAYOUT,
  type CaptionLanguage,
  type CaptionDirection,
  type CaptionLine,
  type CaptionTiming,
  type CaptionFadeEnvelope,
} from './captions';
export { CaptionStrip, type CaptionStripProps } from './captions';

// Map-video composition runtime.
export {
  mapVideoPlanSchema,
  mapVideoSceneSchema,
  calculateMapVideoMetadata,
  calculatePlanDurationSeconds,
  buildSceneSchedule,
  MapVideoComposition,
  mapVideoComposition,
  mapVideoRtlComposition,
  MAP_VIDEO_FPS,
  MAP_VIDEO_WIDTH,
  MAP_VIDEO_HEIGHT,
  type MapVideoPlan,
  type MapVideoScene,
  type MapVideoSceneKind,
} from './compositions/map-video';

// Deterministic fixtures.
export { starterFixtureProps } from './fixtures';
export {
  neutralMapVideoFixture,
  neutralMapVideoFixtureName,
} from './fixtures/map-video-neutral';
export {
  rtlMapVideoFixture,
  rtlMapVideoFixtureName,
} from './fixtures/map-video-rtl';
