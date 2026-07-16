import { readServerEnvironment } from '../packages/shared/src/environment';

const environment = readServerEnvironment();

if (environment.PROVIDER_MODE !== 'mock') {
  throw new Error('Phase 0 verification requires mock providers.');
}
if (environment.PUBLISHER_MODE !== 'mock') {
  throw new Error('Phase 0 verification requires mock publishers.');
}
if (!environment.PUBLISHING_KILL_SWITCH) {
  throw new Error('Publishing kill switch must remain enabled.');
}

console.log('Environment safety verification passed.');
