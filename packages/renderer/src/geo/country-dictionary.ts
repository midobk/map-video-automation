import rawDictionary from './country-dictionary.json' with { type: 'json' };

export interface CountryRecord {
  /** ISO 3166-1 alpha-3 code. */
  iso3: string;
  /** Canonical name copied from the pinned Natural Earth/world-atlas dataset. */
  canonicalName: string;
  /** Additional spellings retained by the generator. */
  aliases: readonly string[];
}

export const countryDictionary: readonly CountryRecord[] = Object.freeze(
  rawDictionary as CountryRecord[],
);

export const countryByIso3 = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.iso3, record]),
);

export const countryByCanonicalName = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.canonicalName, record]),
);

export function isKnownIso3(iso3: string): boolean {
  return countryByIso3.has(iso3);
}

export function resolveCountryRecord(iso3: string): CountryRecord | undefined {
  return countryByIso3.get(iso3);
}

export function resolveCountryName(iso3: string): string | undefined {
  return resolveCountryRecord(iso3)?.canonicalName;
}
