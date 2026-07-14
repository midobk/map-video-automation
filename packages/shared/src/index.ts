export { environmentSchema, parseEnvironment, type Environment } from './environment';

export const safetyDefaults = Object.freeze({
  providerMode: 'mock',
  publisherMode: 'mock',
  publishingKillSwitch: true,
});
