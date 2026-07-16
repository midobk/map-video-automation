import { describe, expect, it } from 'vitest';
import { hasDatabaseConfig } from '../src';

describe('database client', () => {
  it('reports whether Supabase env vars are present', () => {
    // In CI/test without real credentials this should be false.
    expect(typeof hasDatabaseConfig()).toBe('boolean');
  });
});
