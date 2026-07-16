import { feature } from 'topojson-client';
import type { Objects, Topology, GeometryObject } from 'topojson-specification';
import worldAtlas from 'world-atlas/countries-110m.json';
import landAtlas from 'world-atlas/land-110m.json';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { resolveCountryNumericId } from './country-dictionary';

const typedWorldAtlas = worldAtlas as unknown as Topology<Objects<GeoJsonProperties>>;
const typedLandAtlas = landAtlas as unknown as Topology<Objects<GeoJsonProperties>>;

const countriesObject = typedWorldAtlas.objects.countries as GeometryObject<GeoJsonProperties>;
const landObject = typedLandAtlas.objects.land as GeometryObject<GeoJsonProperties>;

export const allCountries = feature(
  typedWorldAtlas,
  countriesObject,
) as unknown as FeatureCollection<Geometry>;

export const landFeature = feature(typedLandAtlas, landObject) as unknown as Feature<Geometry>;

const featureByNumericId = new Map<string, Feature<Geometry>>(
  allCountries.features
    .filter((country) => country.id !== undefined && country.id !== null)
    .map((country) => [String(country.id), country]),
);

/** Find world-atlas features matching validated ISO3 codes. */
export function findFeaturesByIsoCodes(isoCodes: readonly string[]): Feature<Geometry>[] {
  return isoCodes.flatMap((iso3) => {
    const numericId = resolveCountryNumericId(iso3);
    if (!numericId) return [];
    const match = featureByNumericId.get(numericId);
    return match ? [match] : [];
  });
}

export function featureCollectionFromIsoCodes(
  isoCodes: readonly string[],
): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    features: findFeaturesByIsoCodes(isoCodes),
  };
}
