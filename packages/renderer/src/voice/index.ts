export type { VoiceProvider, VoiceRequest, VoiceResult } from './provider';
export { voiceProviderSchema, voiceRequestSchema, voiceResultSchema } from './provider-schemas';
export {
  voiceoverManifestSchema,
  parseVoiceoverManifest,
  safeParseVoiceoverManifest,
  hashVoiceoverText,
  type VoiceoverManifest,
} from './manifest';
export { MockVoiceProvider } from './mock-provider';
export { ElevenLabsVoiceAdapter } from './elevenlabs-adapter';
export { MiniMaxVoiceAdapter } from './minimax-voice-adapter';
export { encodeWav, estimateWavDurationSeconds, concatenateWavBuffers } from './wav';
export {
  assertSafeVoiceoverPathSegment,
  UnsafeVoiceoverPathSegmentError,
} from './path-segment';
// NOTE: server-only helpers (probeAudioDurationSeconds, concatAudioFiles,
// generateSilentAudioFile, resolveVoiceoverDurationSeconds) are intentionally
// NOT re-exported here. They import `node:child_process` / `node:fs`, which
// webpack cannot bundle for the browser composition. Import them from
// `@mapvideo/renderer/voice/server` (server-side only).
