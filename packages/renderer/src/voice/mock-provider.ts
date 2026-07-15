import type { VoiceProvider, VoiceRequest, VoiceResult } from './provider';
import { encodeWav, estimateWavDurationSeconds } from './wav';

const SAMPLE_RATE = 44100;

/**
 * Deterministic mock voice provider.
 *
 * Generates a placeholder sine tone whose length is derived from the text
 * length. No API key, no network, fully reproducible for the same input.
 */
export class MockVoiceProvider implements VoiceProvider {
  constructor(readonly charsPerSecond = 15) {}

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    const text = request.text ?? '';
    const seconds = Math.min(30, Math.max(1, text.length / this.charsPerSecond));
    const length = Math.floor(seconds * SAMPLE_RATE);
    const samples = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / SAMPLE_RATE;
      const envelope = Math.min(1, t * 4) * Math.min(1, (seconds - t) * 4);
      samples[i] = Math.sin(2 * Math.PI * 220 * t) * 0.15 * envelope;
    }

    const audioBuffer = encodeWav(samples);
    return {
      audioBuffer,
      format: 'wav',
      durationSeconds: estimateWavDurationSeconds(audioBuffer),
    };
  }
}
