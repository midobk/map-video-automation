/**
 * @mapvideo/renderer — authoritative Remotion rendering logic for the
 * Map Video Automation platform.
 */

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

export {
  sceneRenderers,
  resolveSceneRenderer,
  UnsupportedSceneKindError,
  type SceneRendererRegistry,
  type SceneProps,
  SceneShell,
} from './scenes';

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

export {
  MapCanvas,
  countryDictionary,
  countryByIso3,
  countryByNumericId,
  countryByCanonicalName,
  isKnownIso3,
  resolveCountryRecord,
  resolveCountryName,
  resolveCountryNumericId,
  GEO_DATASET,
  fitProjectionState,
  interpolateProjectionState,
  centroidOf,
  createProjection,
  allCountries,
  landFeature,
  findFeaturesByIsoCodes,
  featureCollectionFromIsoCodes,
  resolveMapZoomProgress,
  type MapCanvasProps,
  type CountryRecord,
  type GeoDataset,
  type MapLabel,
  type ProjectionName,
  type ProjectionState,
  type FitProjectionOptions,
} from './geo';

export {
  mapVideoPlanSchema,
  mapVideoSceneSchema,
  statCardSceneSchema,
  calculateMapVideoMetadata,
  calculatePlanDurationSeconds,
  buildSceneSchedule,
  MapVideoComposition,
  mapVideoComposition,
  mapVideoRtlComposition,
  mapVideoCountryZoomComposition,
  mapVideoRankingComposition,
  MAP_VIDEO_FPS,
  MAP_VIDEO_WIDTH,
  MAP_VIDEO_HEIGHT,
  type MapVideoPlan,
  type MapVideoScene,
  type MapVideoSceneKind,
} from './compositions/map-video';

export {
  starterFixtureProps,
  neutralMapVideoFixture,
  neutralMapVideoFixtureName,
  rtlMapVideoFixture,
  rtlMapVideoFixtureName,
  countryZoomFixture,
  countryZoomFixtureName,
  rankingFixture,
  rankingFixtureName,
} from './fixtures';
