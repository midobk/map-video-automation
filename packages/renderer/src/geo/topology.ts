import { feature } from 'topojson-client';
import type { Objects, Topology, GeometryObject } from 'topojson-specification';
import worldAtlas from 'world-atlas/countries-110m.json';
import landAtlas from 'world-atlas/land-110m.json';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { resolveCountryName } from './country-dictionary';

const typedWorldAtlas = worldAtlas as unknown as Topology<Objects<GeoJsonProperties>>;
const typedLandAtlas = landAtlas as unknown as Topology<Objects<GeoJsonProperties>>;

const countriesObject = typedWorldAtlas.objects.countries as GeometryObject<GeoJsonProperties>;
const landObject = typedLandAtlas.objects.land as GeometryObject<GeoJsonProperties>;

export const allCountries = feature(
  typedWorldAtlas,
  countriesObject,
) as unknown as FeatureCollection<Geometry>;

export const landFeature = feature(typedLandAtlas, landObject) as unknown as Feature<Geometry>;

/**
 * Find world-atlas country features matching the supplied ISO3 codes.
 * Unknown codes are ignored so the caller can decide whether that is an error.
 */
export function findFeaturesByIsoCodes(isoCodes: readonly string[]): Feature<Geometry>[] {
  const features: Feature<Geometry>[] = [];
  for (const iso3 of isoCodes) {
    const name = resolveCountryName(iso3);
    if (!name) {
      continue;
    }
    const match = allCountries.features.find(
      (f: Feature<Geometry>) => (f.properties?.name as string | undefined) === name,
    );
    if (match) {
      features.push(match);
    }
  }
  return features;
}

/**
 * Build a FeatureCollection from a list of ISO3 codes. Useful for fitting a
 * projection to a group of countries.
 */
export function featureCollectionFromIsoCodes(
  isoCodes: readonly string[],
): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    features: findFeaturesByIsoCodes(isoCodes),
  };
}
