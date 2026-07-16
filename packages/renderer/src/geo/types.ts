/** Browser-safe vector-map rendering types. */

export interface MapLabel {
  text: string;
  /** Longitude in decimal degrees, from -180 through 180. */
  longitude: number;
  /** Latitude in decimal degrees, from -90 through 90. */
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

export interface FitProjectionOptions {
  /** Inset in pixels around the fitted feature. */
  padding?: number;
  /** Rotate an orthographic globe so the fitted feature is on the visible hemisphere. */
  centerOnFeature?: boolean;
}

export type ProjectionName = 'natural-earth' | 'mercator' | 'orthographic';
