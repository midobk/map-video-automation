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

/** Parsed WAV header fields used for concatenation validation. */
interface WavHeader {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
}

/** Read the canonical PCM WAV header fields from a buffer. */
function readWavHeader(buffer: ArrayBuffer): WavHeader {
  if (buffer.byteLength < 44) {
    throw new Error('WAV buffer is too short to contain a header');
  }
  const view = new DataView(buffer);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);
  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataOffset: 44,
    dataSize,
  };
}

/**
 * Concatenate multiple mono 16-bit PCM WAV buffers into one WAV.
 *
 * All inputs must share the same sample rate, channel count, and bit depth.
 * This is intentionally limited to the format produced by `encodeWav` so the
 * renderer fixture pipeline can build a single narration track from several
 * scene voiceovers without adding an FFmpeg dependency.
 */
export function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) {
    return encodeWav(new Float32Array(0));
  }

  const headers = buffers.map(readWavHeader);
  const first = headers[0]!;
  for (let i = 1; i < headers.length; i++) {
    const header = headers[i]!;
    if (
      header.sampleRate !== first.sampleRate ||
      header.channels !== first.channels ||
      header.bitsPerSample !== first.bitsPerSample
    ) {
      throw new Error(
        'Cannot concatenate WAV buffers with differing sample rate, channels, or bit depth',
      );
    }
  }

  const totalSamples = headers.reduce((sum, h) => sum + h.dataSize / (h.bitsPerSample / 8), 0);
  const output = Buffer.alloc(44 + totalSamples * 2);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + totalSamples * 2, 4);
  output.write('WAVE', 8);
  output.write('fmt ', 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20); // PCM
  output.writeUInt16LE(first.channels, 22);
  output.writeUInt32LE(first.sampleRate, 24);
  output.writeUInt32LE((first.sampleRate * first.channels * first.bitsPerSample) / 8, 28);
  output.writeUInt16LE((first.channels * first.bitsPerSample) / 8, 32);
  output.writeUInt16LE(first.bitsPerSample, 34);
  output.write('data', 36);
  output.writeUInt32LE(totalSamples * 2, 40);

  let offset = 44;
  for (let i = 0; i < buffers.length; i++) {
    const header = headers[i]!;
    const source = new Uint8Array(buffers[i]!, header.dataOffset, header.dataSize);
    output.set(source, offset);
    offset += source.length;
  }

  const copy = new Uint8Array(output.length);
  copy.set(output);
  return copy.buffer;
}
