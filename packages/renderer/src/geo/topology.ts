import { feature } from 'topojson-client';
import type { Objects, Topology, GeometryObject } from 'topojson-specification';
import worldAtlas from 'world-atlas/countries-110m.json';
import landAtlas from 'world-atlas/land-110m.json';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import {
  countryByCanonicalName,
  resolveCountryName,
} from './country-dictionary';

const typedWorldAtlas = worldAtlas as unknown as Topology<Objects<GeoJsonProperties>>;
const typedLandAtlas = landAtlas as unknown as Topology<Objects<GeoJsonProperties>>;

const countriesObject = typedWorldAtlas.objects.countries as GeometryObject<GeoJsonProperties>;
const landObject = typedLandAtlas.objects.land as GeometryObject<GeoJsonProperties>;

export const allCountries = feature(
  typedWorldAtlas,
  countriesObject,
) as unknown as FeatureCollection<Geometry>;

export const landFeature = feature(typedLandAtlas, landObject) as unknown as Feature<Geometry>;

function featureName(country: Feature<Geometry>): string | undefined {
  const name = country.properties?.name;
  return typeof name === 'string' ? name : undefined;
}

const featureByCanonicalName = new Map<string, Feature<Geometry>>(
  allCountries.features.flatMap((country) => {
    const name = featureName(country);
    return name ? [[name, country] as const] : [];
  }),
);

export function countryIso3ForFeature(country: Feature<Geometry>): string | undefined {
  const name = featureName(country);
  return name ? countryByCanonicalName.get(name)?.iso3 : undefined;
}

/** Find world-atlas features for already validated ISO3 codes, failing closed. */
export function findFeaturesByIsoCodes(isoCodes: readonly string[]): Feature<Geometry>[] {
  return isoCodes.map((iso3) => {
    const name = resolveCountryName(iso3);
    const match = name ? featureByCanonicalName.get(name) : undefined;
    if (!match) {
      throw new Error(`The pinned world-atlas dictionary has no feature for ISO3 code "${iso3}".`);
    }
    return match;
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
