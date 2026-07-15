/**
 * Zero-dependency 16-bit mono WAV encoder.
 *
 * Kept small and synchronous so the mock voice provider can generate
 * deterministic placeholder audio without touching the network.
 */

const SAMPLE_RATE = 44100;

/**
 * Encode a Float32Array of mono samples (values in [-1, 1]) as a 16-bit PCM
 * WAV ArrayBuffer.
 */
export function encodeWav(samples: Float32Array): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = samples[i] ?? 0;
    const v = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }

  // Copy into a dedicated ArrayBuffer so the returned buffer is not a view into
  // a shared Node Buffer pool.
  const copy = new Uint8Array(buffer.length);
  copy.set(buffer);
  return copy.buffer;
}

/** Estimate duration of a mono 16-bit PCM WAV buffer in seconds. */
export function estimateWavDurationSeconds(audioBuffer: ArrayBuffer): number {
  if (audioBuffer.byteLength < 44) return 0;
  const view = new DataView(audioBuffer);
  const byteRate = view.getUint32(28, true);
  if (byteRate === 0) return 0;
  const dataSize = view.getUint32(40, true);
  return dataSize / byteRate;
}
