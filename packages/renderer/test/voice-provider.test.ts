import { describe, expect, it } from 'vitest';
import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  parseVoiceoverManifest,
  hashVoiceoverText,
  estimateWavDurationSeconds,
  concatenateWavBuffers,
} from '../src';

describe('MockVoiceProvider', () => {
  it('generates a deterministic WAV buffer', async () => {
    const provider = new MockVoiceProvider();
    const result = await provider.synthesize({ text: 'Hello world' });
    expect(result.format).toBe('wav');
    expect(result.audioBuffer.byteLength).toBeGreaterThan(44);
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('produces the same duration for the same text', async () => {
    const provider = new MockVoiceProvider();
    const a = await provider.synthesize({ text: 'Repeatable' });
    const b = await provider.synthesize({ text: 'Repeatable' });
    expect(a.durationSeconds).toBe(b.durationSeconds);
    expect(a.audioBuffer.byteLength).toBe(b.audioBuffer.byteLength);
  });

  it('estimates the WAV duration from the buffer header', async () => {
    const provider = new MockVoiceProvider();
    const result = await provider.synthesize({ text: 'Duration check' });
    const estimated = estimateWavDurationSeconds(result.audioBuffer);
    expect(estimated).toBeGreaterThan(0);
  });
});

describe('ElevenLabsVoiceAdapter', () => {
  it('throws when no API key is provided', async () => {
    const adapter = new ElevenLabsVoiceAdapter('', 'voice-1');
    await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(
      'ElevenLabsVoiceAdapter requires an API key',
    );
  });
});

describe('voiceover manifest', () => {
  it('parses a valid manifest', () => {
    const manifest = parseVoiceoverManifest({
      textHash: 'abc123',
      provider: 'mock',
      model: 'mock-v1',
      voiceId: 'default',
      audioPath: 'project/voiceover/intro.wav',
      durationSeconds: 3.5,
      generatedAt: '2026-07-15T12:00:00Z',
    });
    expect(manifest.provider).toBe('mock');
  });

  it('rejects an invalid ISO timestamp', () => {
    expect(() =>
      parseVoiceoverManifest({
        textHash: 'abc',
        provider: 'mock',
        model: 'm',
        voiceId: 'd',
        audioPath: 'p.wav',
        durationSeconds: 1,
        generatedAt: 'not-a-date',
      }),
    ).toThrow();
  });

  it('hashes text deterministically', () => {
    expect(hashVoiceoverText('same')).toBe(hashVoiceoverText('same'));
    expect(hashVoiceoverText('a')).not.toBe(hashVoiceoverText('b'));
  });
});

describe('WAV concatenation', () => {
  it('returns a valid empty WAV for no buffers', () => {
    const result = concatenateWavBuffers([]);
    expect(result.byteLength).toBe(44);
    expect(estimateWavDurationSeconds(result)).toBe(0);
  });

  it('concatenates two mock voiceover buffers', async () => {
    const provider = new MockVoiceProvider();
    const a = await provider.synthesize({ text: 'Hello' });
    const b = await provider.synthesize({ text: 'World' });
    const combined = concatenateWavBuffers([a.audioBuffer, b.audioBuffer]);
    expect(combined.byteLength).toBe(a.audioBuffer.byteLength + b.audioBuffer.byteLength - 44);
    expect(estimateWavDurationSeconds(combined)).toBeCloseTo(
      estimateWavDurationSeconds(a.audioBuffer) + estimateWavDurationSeconds(b.audioBuffer),
      1,
    );
  });
});
