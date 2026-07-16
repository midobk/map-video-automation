import { describe, expect, it, vi } from 'vitest';
import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  parseVoiceoverManifest,
  hashVoiceoverText,
  estimateWavDurationSeconds,
} from '../src';
import {
  assertSafeVoiceoverPathSegment,
  UnsafeVoiceoverPathSegmentError,
} from '../src/voice/path-segment';
import { resolveVoiceoverDurationSeconds } from '../src/voice/server';

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

describe('voiceover output safety', () => {
  it('accepts a single safe project or narration id segment', () => {
    expect(assertSafeVoiceoverPathSegment('intro-01', 'Narration line id')).toBe(
      'intro-01',
    );
  });

  it.each(['../../escape', '../escape', '/absolute', 'nested/id', 'nested\\id', '.', '']) (
    'rejects unsafe output segment %j',
    (value) => {
      expect(() => assertSafeVoiceoverPathSegment(value, 'Narration line id')).toThrow(
        UnsafeVoiceoverPathSegmentError,
      );
    },
  );

  it('uses a media probe for an MP3 without provider duration metadata', async () => {
    const probe = vi.fn(async () => 2.75);
    const duration = await resolveVoiceoverDurationSeconds({
      result: {
        audioBuffer: new ArrayBuffer(128),
        format: 'mp3',
        durationSeconds: 0,
      },
      outputPath: '/tmp/voice.mp3',
      probe,
    });

    expect(duration).toBe(2.75);
    expect(probe).toHaveBeenCalledWith('/tmp/voice.mp3');
  });

  it('keeps a positive provider-reported duration without probing', async () => {
    const probe = vi.fn(async () => 99);
    const duration = await resolveVoiceoverDurationSeconds({
      result: {
        audioBuffer: new ArrayBuffer(128),
        format: 'mp3',
        durationSeconds: 1.25,
      },
      outputPath: '/tmp/voice.mp3',
      probe,
    });

    expect(duration).toBe(1.25);
    expect(probe).not.toHaveBeenCalled();
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
