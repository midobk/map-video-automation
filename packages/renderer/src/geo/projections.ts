import { geoNaturalEarth1, geoMercator, geoOrthographic, geoCentroid } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { ProjectionName, ProjectionState } from './types';

export function createProjection(name: ProjectionName) {
  switch (name) {
    case 'natural-earth':
      return geoNaturalEarth1();
    case 'mercator':
      return geoMercator();
    case 'orthographic':
      return geoOrthographic();
    default:
      return geoNaturalEarth1();
  }
}

function cloneState(projection: ReturnType<typeof createProjection>): ProjectionState {
  const rotate = projection.rotate();
  return {
    rotate: [rotate[0] ?? 0, rotate[1] ?? 0],
    scale: projection.scale(),
    translate: [projection.translate()[0], projection.translate()[1]],
  };
}

/**
 * Fit a projection to a geographic feature (or feature collection) inside a
 * [width, height] viewport. Returns the resulting rotation, scale, and
 * translation so they can be interpolated frame-by-frame.
 */
export function fitProjectionState(
  name: ProjectionName,
  size: readonly [number, number],
  geo: Feature<Geometry> | FeatureCollection<Geometry>,
): ProjectionState {
  const projection = createProjection(name);
  projection.fitSize(size.slice() as [number, number], geo);
  return cloneState(projection);
}

/**
 * Compute the centroid of a geographic feature in [longitude, latitude].
 */
export function centroidOf(geo: Feature<Geometry> | FeatureCollection<Geometry>): [number, number] {
  const c = geoCentroid(geo);
  return [c[0] ?? 0, c[1] ?? 0];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two projection states. All values are linearly blended,
 * which is sufficient for the short, smooth camera moves used in fixture scenes.
 */
export function interpolateProjectionState(
  from: ProjectionState,
  to: ProjectionState,
  t: number,
): ProjectionState {
  // Take the shortest rotation path across the antimeridian.
  let deltaRotateLon = to.rotate[0] - from.rotate[0];
  if (deltaRotateLon > 180) {
    deltaRotateLon -= 360;
  } else if (deltaRotateLon < -180) {
    deltaRotateLon += 360;
  }

  return {
    rotate: [
      lerp(from.rotate[0], from.rotate[0] + deltaRotateLon, t),
      lerp(from.rotate[1], to.rotate[1], t),
    ],
    scale: lerp(from.scale, to.scale, t),
    translate: [
      lerp(from.translate[0], to.translate[0], t),
      lerp(from.translate[1], to.translate[1], t),
    ],
  };
}
