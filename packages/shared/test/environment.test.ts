import { describe, expect, it } from 'vitest';
import { parseEnvironment, readServerEnvironment } from '../src/environment';

describe('environment safety', () => {
  it('defaults to mocked providers with publishing blocked', () => {
    expect(parseEnvironment({})).toMatchObject({
      APP_ENV: 'local',
      PROVIDER_MODE: 'mock',
      PUBLISHER_MODE: 'mock',
      PUBLISHING_KILL_SWITCH: true,
      ALLOW_LOCAL_EXTERNAL_PUBLISHING: false,
    });
  });

  it('rejects real local publishing without explicit opt-in', () => {
    expect(() =>
      parseEnvironment({
        APP_ENV: 'local',
        PUBLISHER_MODE: 'real',
        PUBLISHING_KILL_SWITCH: 'false',
        ALLOW_LOCAL_EXTERNAL_PUBLISHING: 'false',
      }),
    ).toThrow();
  });

  it('accepts optional Supabase configuration through the server entrypoint', () => {
    expect(
      readServerEnvironment({
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      }),
    ).toMatchObject({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    });
  });
});
