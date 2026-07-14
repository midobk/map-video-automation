import { describe, expect, it } from 'vitest';
import { readServerEnvironment } from './environment.server';

describe('server environment entrypoint', () => {
  it('accepts the safe Phase 0 defaults', () => {
    expect(readServerEnvironment({})).toMatchObject({
      PROVIDER_MODE: 'mock',
      PUBLISHER_MODE: 'mock',
      PUBLISHING_KILL_SWITCH: true,
    });
  });

  it('rejects an unsafe real-publishing configuration', () => {
    expect(() =>
      readServerEnvironment({
        APP_ENV: 'production',
        PUBLISHER_MODE: 'real',
        PUBLISHING_KILL_SWITCH: 'true',
      }),
    ).toThrow();
  });
});
