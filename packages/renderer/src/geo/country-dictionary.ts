import rawDictionary from './country-dictionary.json';

export interface CountryRecord {
  /** ISO 3166-1 alpha-3 code. */
  iso3: string;
  /** Canonical name used by the Natural Earth / world-atlas dataset. */
  canonicalName: string;
  /** Additional spellings / aliases for matching. */
  aliases: readonly string[];
}

export const countryDictionary: readonly CountryRecord[] = rawDictionary as CountryRecord[];

export const countryByIso3 = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.iso3, record]),
);

export const countryByCanonicalName = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.canonicalName, record]),
);

/**
 * Resolve a country record by ISO3 code. Returns undefined for unknown codes,
 * which allows callers to fail explicitly on invalid geography input.
 */
export function resolveCountryRecord(iso3: string): CountryRecord | undefined {
  return countryByIso3.get(iso3);
}

/**
 * Resolve the canonical Natural Earth name for an ISO3 code.
 */
export function resolveCountryName(iso3: string): string | undefined {
  return resolveCountryRecord(iso3)?.canonicalName;
}
