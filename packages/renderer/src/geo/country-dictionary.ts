import worldCountries from 'world-countries';

interface WorldCountryRecord {
  cca3?: string;
  ccn3?: string;
  name: {
    common: string;
    official: string;
  };
  altSpellings?: string[];
}

export interface CountryRecord {
  /** ISO 3166-1 alpha-3 code. */
  iso3: string;
  /** Numeric identifier used by world-atlas, normalized without leading zeroes. */
  numericId: string;
  /** Human-readable common name. */
  canonicalName: string;
  /** Additional spellings supplied by the source dataset. */
  aliases: readonly string[];
}

function normalizeNumericId(value: string): string {
  return String(Number.parseInt(value, 10));
}

const records = (worldCountries as WorldCountryRecord[])
  .filter(
    (country): country is WorldCountryRecord & { cca3: string; ccn3: string } =>
      /^[A-Z]{3}$/u.test(country.cca3 ?? '') && /^\d{3}$/u.test(country.ccn3 ?? ''),
  )
  .map<CountryRecord>((country) => ({
    iso3: country.cca3,
    numericId: normalizeNumericId(country.ccn3),
    canonicalName: country.name.common,
    aliases: [country.name.official, ...(country.altSpellings ?? [])],
  }))
  .sort((left, right) => (left.iso3 < right.iso3 ? -1 : left.iso3 > right.iso3 ? 1 : 0));

export const countryDictionary: readonly CountryRecord[] = Object.freeze(records);

export const countryByIso3 = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.iso3, record]),
);

export const countryByNumericId = new Map<string, CountryRecord>(
  countryDictionary.map((record) => [record.numericId, record]),
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

export function resolveCountryNumericId(iso3: string): string | undefined {
  return resolveCountryRecord(iso3)?.numericId;
}
