import {
  geoCentroid,
  geoDistance,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  type GeoProjection,
} from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { FitProjectionOptions, ProjectionName, ProjectionState } from './types';

export function createProjection(name: ProjectionName): GeoProjection {
  switch (name) {
    case 'natural-earth':
      return geoNaturalEarth1();
    case 'mercator':
      return geoMercator();
    case 'orthographic':
      return geoOrthographic();
  }
}

function cloneState(projection: GeoProjection): ProjectionState {
  const rotate = projection.rotate();
  const translate = projection.translate();
  return {
    rotate: [rotate[0] ?? 0, rotate[1] ?? 0],
    scale: projection.scale(),
    translate: [translate[0], translate[1]],
  };
}

export function centroidOf(
  geo: Feature<Geometry> | FeatureCollection<Geometry>,
): [number, number] {
  const centroid = geoCentroid(geo);
  return [centroid[0] ?? 0, centroid[1] ?? 0];
}

/**
 * Return whether a geographic point lies on the visible hemisphere. Flat
 * projections show every in-bounds point; orthographic maps must additionally
 * reject points more than 90 degrees from the current geographic center.
 */
export function isPointVisibleOnProjection(
  name: ProjectionName,
  rotation: readonly [number, number],
  point: readonly [number, number],
): boolean {
  if (name !== 'orthographic') return true;

  const center: [number, number] = [-rotation[0], -rotation[1]];
  return geoDistance(center, [point[0], point[1]]) <= Math.PI / 2 + 1e-9;
}

/**
 * Fit a projection to a feature. Orthographic focus fits rotate the requested
 * geography onto the visible hemisphere before measuring its bounds.
 */
export function fitProjectionState(
  name: ProjectionName,
  size: readonly [number, number],
  geo: Feature<Geometry> | FeatureCollection<Geometry>,
  options: FitProjectionOptions = {},
): ProjectionState {
  const projection = createProjection(name);
  const padding = Math.max(0, options.padding ?? 0);

  if (name === 'orthographic' && options.centerOnFeature) {
    const [longitude, latitude] = centroidOf(geo);
    projection.rotate([-longitude, -latitude, 0]);
  }

  const width = Math.max(1, size[0]);
  const height = Math.max(1, size[1]);
  const maxPadding = Math.max(0, Math.min(width, height) / 2 - 1);
  const safePadding = Math.min(padding, maxPadding);
  projection.fitExtent(
    [
      [safePadding, safePadding],
      [width - safePadding, height - safePadding],
    ],
    geo,
  );

  return cloneState(projection);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/** Interpolate projection state using the shortest longitude rotation path. */
export function interpolateProjectionState(
  from: ProjectionState,
  to: ProjectionState,
  progress: number,
): ProjectionState {
  const t = Math.max(0, Math.min(1, progress));
  let longitudeDelta = to.rotate[0] - from.rotate[0];
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;

  return {
    rotate: [
      lerp(from.rotate[0], from.rotate[0] + longitudeDelta, t),
      lerp(from.rotate[1], to.rotate[1], t),
    ],
    scale: lerp(from.scale, to.scale, t),
    translate: [
      lerp(from.translate[0], to.translate[0], t),
      lerp(from.translate[1], to.translate[1], t),
    ],
  };
}
