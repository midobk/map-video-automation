export {
  type CompositionDefinition,
  type AnyCompositionDefinition,
  CompositionRegistry,
  DuplicateCompositionIdError,
  defineComposition,
} from './registry';
export {
  startSchema,
  calculateStartMetadata,
  StartComposition,
  START_FPS,
  START_WIDTH,
  START_HEIGHT,
  starterComposition,
  type StartProps,
} from './starter';
export {
  mapVideoPlanSchema,
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
} from './map-video';
