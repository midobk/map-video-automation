/**
 * Provider-agnostic voice synthesis boundary.
 *
 * The renderer depends on this interface, not on any particular TTS service.
 * Credentials are passed when constructing an adapter, never hardcoded here.
 */

export interface VoiceRequest {
  /** Text to synthesize. */
  text: string;
  /** Voice identifier (provider-specific). */
  voiceId?: string;
  /** Model identifier (provider-specific). */
  model?: string;
  /** Optional provider tag for logging and manifest writing. */
  provider?: string;
}

export interface VoiceResult {
  /** Synthesized audio bytes. */
  audioBuffer: ArrayBuffer;
  /** Audio format. */
  format: 'wav' | 'mp3';
  /** Duration in seconds, measured or estimated. */
  durationSeconds: number;
  /** Optional provider request id for traceability. */
  providerRequestId?: string | undefined;
}

export interface VoiceProvider {
  synthesize(request: VoiceRequest): Promise<VoiceResult>;
}
