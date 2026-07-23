import { describe, expect, it, vi } from 'vitest';
import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  MiniMaxVoiceAdapter,
  parseVoiceoverManifest,
  hashVoiceoverText,
  estimateWavDurationSeconds,
  concatenateWavBuffers,
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

  it('posts to the ElevenLabs TTS endpoint with the right headers and body', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => {
        return new Response(new ArrayBuffer(64), {
          status: 200,
          headers: { 'x-request-id': 'req-abc-123' },
        });
      },
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new ElevenLabsVoiceAdapter('test-key', 'voice-7');
      const result = await adapter.synthesize({ text: 'Hello voice' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice-7');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect((init?.headers as Record<string, string>)['xi-api-key']).toBe('test-key');
      const body = JSON.parse(init?.body as string);
      expect(body.text).toBe('Hello voice');
      expect(body.model_id).toBe('eleven_multilingual_v2');

      expect(result.format).toBe('mp3');
      expect(result.audioBuffer.byteLength).toBe(64);
      expect(result.providerRequestId).toBe('req-abc-123');
      // ElevenLabs does not return duration metadata; the caller is
      // expected to probe the rendered MP3 with ffprobe.
      expect(result.durationSeconds).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when the ElevenLabs API returns a non-OK status', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => {
        return new Response('rate limited', { status: 429, statusText: 'Too Many Requests' });
      },
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new ElevenLabsVoiceAdapter('test-key', 'voice-7');
      await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(
        /ElevenLabs TTS failed: 429/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses a custom model id when one is provided at construction', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response(new ArrayBuffer(8), { status: 200 }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new ElevenLabsVoiceAdapter('test-key', 'voice-7', 'eleven_turbo_v2_5');
      await adapter.synthesize({ text: 'turbo' });
      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse(init?.body as string);
      expect(body.model_id).toBe('eleven_turbo_v2_5');
    } finally {
      globalThis.fetch = originalFetch;
    }
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

describe('MiniMaxVoiceAdapter', () => {
  it('throws when no API key is provided', async () => {
    const adapter = new MiniMaxVoiceAdapter('', 'English_CaptivatingStoryteller');
    await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(
      'MiniMaxVoiceAdapter requires an API key',
    );
  });

  it('posts to the MiniMax T2A v2 endpoint and decodes hex audio to an ArrayBuffer', async () => {
    const audioBytes = Buffer.from('ID3 fake mp3 body', 'utf8');
    const hex = audioBytes.toString('hex');
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => {
        return new Response(
          JSON.stringify({
            base_resp: { status_code: 0, status_msg: 'success' },
            data: { audio: hex },
            extra_info: { audio_length: 6012 },
          }),
          { status: 200, headers: { 'x-request-id': 'minimax-req-1' } },
        );
      },
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new MiniMaxVoiceAdapter('test-key', 'English_CaptivatingStoryteller');
      const result = await adapter.synthesize({ text: 'The Nile river' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://api.minimax.io/v1/t2a_v2');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key');
      const body = JSON.parse(init?.body as string);
      expect(body.model).toBe('speech-02-turbo');
      expect(body.text).toBe('The Nile river');
      expect(body.voice_setting.voice_id).toBe('English_CaptivatingStoryteller');
      expect(body.voice_setting.audio_format).toBe('mp3');

      expect(result.format).toBe('mp3');
      expect(result.audioBuffer.byteLength).toBe(audioBytes.length);
      expect(result.durationSeconds).toBeCloseTo(6.012, 3);
      expect(result.providerRequestId).toBe('minimax-req-1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when MiniMax returns a non-OK HTTP status', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response('upstream error', { status: 500, statusText: 'Internal Server Error' }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new MiniMaxVoiceAdapter('test-key', 'English_CaptivatingStoryteller');
      await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(/MiniMax TTS failed: 500/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on a logical error (non-zero base_resp.status_code)', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({ base_resp: { status_code: 2054, status_msg: 'voice id not exist' } }),
          { status: 200 },
        ),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new MiniMaxVoiceAdapter('test-key', 'bogus_voice');
      await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(/voice id not exist/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when the response has no audio data', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({ base_resp: { status_code: 0, status_msg: 'success' }, data: {} }),
          { status: 200 },
        ),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const adapter = new MiniMaxVoiceAdapter('test-key', 'English_CaptivatingStoryteller');
      await expect(adapter.synthesize({ text: 'Test' })).rejects.toThrow(/did not include audio data/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
