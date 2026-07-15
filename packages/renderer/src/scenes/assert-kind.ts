import type { MapVideoScene, MapVideoSceneKind } from '../compositions/map-video/map-video-schema';

/**
 * Type-safe scene-kind narrowing helper. Throws a clear error if a scene is
 * routed to the wrong renderer — this should never happen when the registry is
 * correct, but the guard keeps the runtime honest.
 */
export function assertSceneKind<K extends MapVideoSceneKind>(
  scene: MapVideoScene,
  kind: K,
): asserts scene is Extract<MapVideoScene, { kind: K }> {
  if (scene.kind !== kind) {
    throw new Error(
      `Scene renderer mismatch: expected kind "${kind}" but received "${scene.kind}" (id=${scene.id}).`,
    );
  }
}
