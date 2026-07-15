/**
 * Vector-map rendering types. All helpers are deterministic and frame-driven;
 * no Node-only APIs are used here.
 */

export interface MapLabel {
  text: string;
  /** Longitude in decimal degrees. */
  longitude: number;
  /** Latitude in decimal degrees. */
  latitude: number;
}

export interface ProjectionState {
  /** D3 rotation [lambda, phi] in degrees. */
  rotate: readonly [number, number];
  /** Projection scale factor. */
  scale: number;
  /** Projection translation [x, y] in screen pixels. */
  translate: readonly [number, number];
}

export type ProjectionName = 'natural-earth' | 'mercator' | 'orthographic';
