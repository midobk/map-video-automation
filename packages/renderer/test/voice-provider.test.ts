import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { parseFile, parseBuffer } from "music-metadata";
type ParseFileFn = typeof parseFile;
type ParseBufferFn = typeof parseBuffer;

// Mock music-metadata so the probeAudioDurationSeconds tests can run
// hermetically without an actual MP3 file on disk. The real package
// integration is covered by the `music-metadata` package's own test
// suite; here we only need to verify our wrapper's contract.
//
// Tests for the pure-JS concat/silent pipeline (added in the same PR that
// removed the ffmpeg binary from the defaults) override the mock with the
// real implementation via `realParseFile` / `realParseBuffer` below, so
// the round-trip through the actual MP3 frames is exercised end-to-end.
const parseFileMock = vi.fn();
const parseBufferMock = vi.fn();
vi.mock('music-metadata', () => ({
  parseFile: (...args: unknown[]) => parseFileMock(...args),
  parseBuffer: (...args: unknown[]) => parseBufferMock(...args),
}));

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
import {
  concatAudioFiles,
  concatAudioFilesWithFfmpeg,
  generateSilentAudioFile,
  generateSilentAudioFileWithFfmpeg,
  probeAudioDurationSeconds,
  probeAudioDurationSecondsWithFfprobe,
  resolveVoiceoverDurationSeconds,
} from '../src/voice/server';

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

describe('probeAudioDurationSeconds (music-metadata default)', () => {
  beforeEach(() => {
    parseFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses an MP3 via music-metadata and returns a positive duration', async () => {
    parseFileMock.mockResolvedValueOnce({
      format: { duration: 7.5 },
    });
    const duration = await probeAudioDurationSeconds('/tmp/voice.mp3');
    expect(duration).toBe(7.5);
    expect(parseFileMock).toHaveBeenCalledWith(
      '/tmp/voice.mp3',
      expect.objectContaining({ duration: true, skipCovers: true }),
    );
  });

  it('rejects when the metadata returns a non-positive duration', async () => {
    parseFileMock.mockResolvedValueOnce({ format: { duration: 0 } });
    await expect(probeAudioDurationSeconds('/tmp/voice.mp3')).rejects.toThrow(
      /invalid duration/,
    );
  });

  it('rejects when the metadata returns no duration field', async () => {
    parseFileMock.mockResolvedValueOnce({ format: {} });
    await expect(probeAudioDurationSeconds('/tmp/voice.mp3')).rejects.toThrow(
      /invalid duration/,
    );
  });

  it('rejects when music-metadata throws (e.g. unreadable file)', async () => {
    parseFileMock.mockRejectedValueOnce(new Error('ENOENT: no such file'));
    await expect(probeAudioDurationSeconds('/tmp/voice.mp3')).rejects.toThrow(
      /ENOENT/,
    );
  });
});

describe('probeAudioDurationSecondsWithFfprobe (opt-in)', () => {
  it('is exported as a separate function so callers can opt in', () => {
    expect(typeof probeAudioDurationSecondsWithFfprobe).toBe('function');
    // Distinct from the default probe — the names should diverge to make
    // the choice explicit at the call site.
    expect(probeAudioDurationSecondsWithFfprobe).not.toBe(probeAudioDurationSeconds);
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

/**
 * The pure-JS concat + silence pipeline needs to round-trip real MP3
 * frames through music-metadata to verify its correctness, so it bypasses
 * the file-level `vi.mock('music-metadata')` setup that the other suites
 * use for hermetic unit tests. We pull the real implementation via
 * `vi.importActual` and re-route the existing `parseFileMock` to delegate
 * to it. `vi.importActual` is async, so the wiring happens in `beforeAll`
 * once for the whole describe block.
 */
describe('generateSilentAudioFile (pure-JS silence frame generator)', () => {
  let tmpDir = '';
  let realParseFile: ParseFileFn;

  beforeAll(async () => {
    const realModule = await vi.importActual<{ parseFile: ParseFileFn; parseBuffer: ParseBufferFn }>('music-metadata');
    realParseFile = realModule.parseFile;
  });

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'silence-frames-'));
    parseFileMock.mockReset();
    parseFileMock.mockImplementation(realParseFile);
    parseBufferMock.mockReset();
    // parseBuffer is only used by concat, but resetting it here prevents
    // leftover calls from earlier suites from leaking into the silence tests.
  });

  afterEach(async () => {
    parseFileMock.mockReset();
    parseBufferMock.mockReset();
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes an MP3 whose probed duration is in the expected window for the requested duration', async () => {
    const outputPath = path.join(tmpDir, 'silent-3s.mp3');
    await generateSilentAudioFile(3, outputPath);
    const written = await stat(outputPath);
    expect(written.size).toBeGreaterThan(0);
    const duration = await probeAudioDurationSeconds(outputPath);
    // MPEG frame quantization: a 3.0s request becomes ceil(3.0 / 0.026122) frames
    // = 115 frames ≈ 3.004s, so the readback should land in [2.5, 3.5] with
    // generous slack for any frame-size rounding.
    expect(duration).toBeGreaterThanOrEqual(2.5);
    expect(duration).toBeLessThanOrEqual(3.5);
  });

  it('scales the number of frames with the requested duration', async () => {
    const oneSecondPath = path.join(tmpDir, 'silent-1s.mp3');
    const twoSecondPath = path.join(tmpDir, 'silent-2s.mp3');
    await generateSilentAudioFile(1, oneSecondPath);
    await generateSilentAudioFile(2, twoSecondPath);
    const oneSecondSize = (await stat(oneSecondPath)).size;
    const twoSecondSize = (await stat(twoSecondPath)).size;
    // Each frame is 104 bytes; doubling the duration should approximately
    // double the file size (exact within one frame).
    expect(twoSecondSize).toBeGreaterThan(oneSecondSize * 1.8);
    expect(twoSecondSize).toBeLessThan(oneSecondSize * 2.2);
  });

  it('clamps very small durations up to at least one frame, and rounds fractional durations to whole frames', async () => {
    // music-metadata's MPEG parser needs at least 5 frames AND 164 bytes
    // of peek-ahead to confirm a CBR stream and report a duration (the
    // sync routine bails out as EndOfStream if fewer than 164 bytes
    // remain after the current frame). The shortest duration the
    // generator can produce that satisfies both constraints is 5 frames
    // ≈ 130.6ms — request 0.2s so we have headroom (8 frames ≈ 209ms).
    const tinyPath = path.join(tmpDir, 'silent-200ms.mp3');
    await generateSilentAudioFile(0.2, tinyPath);
    const duration = await probeAudioDurationSeconds(tinyPath);
    // 8 frames * 1152 samples / 44100 Hz = 0.209s.
    expect(duration).toBeGreaterThan(0.1);
    expect(duration).toBeLessThan(0.3);
  });

  it('is exported alongside an ffmpeg-backed opt-in variant', () => {
    expect(typeof generateSilentAudioFile).toBe('function');
    expect(typeof generateSilentAudioFileWithFfmpeg).toBe('function');
    expect(generateSilentAudioFile).not.toBe(generateSilentAudioFileWithFfmpeg);
  });
});

describe('concatAudioFiles (pure-JS frame-level MP3 concat)', () => {
  let tmpDir = '';
  let realParseFile: ParseFileFn;
  let realParseBuffer: ParseBufferFn;

  beforeAll(async () => {
    const realModule = await vi.importActual<{ parseFile: ParseFileFn; parseBuffer: ParseBufferFn }>('music-metadata');
    realParseFile = realModule.parseFile;
    realParseBuffer = realModule.parseBuffer;
  });

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'concat-frames-'));
    parseFileMock.mockReset();
    parseFileMock.mockImplementation(realParseFile);
    parseBufferMock.mockReset();
    parseBufferMock.mockImplementation(realParseBuffer);
  });

  afterEach(async () => {
    parseFileMock.mockReset();
    parseBufferMock.mockReset();
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('concatenates two real silence-MP3 fixtures and the output has approximately the sum of their durations', async () => {
    const a = path.join(tmpDir, 'a.mp3');
    const b = path.join(tmpDir, 'b.mp3');
    const out = path.join(tmpDir, 'out.mp3');
    await generateSilentAudioFile(1, a);
    await generateSilentAudioFile(2, b);
    const aDuration = await probeAudioDurationSeconds(a);
    const bDuration = await probeAudioDurationSeconds(b);

    await concatAudioFiles([a, b], out);

    const outDuration = await probeAudioDurationSeconds(out);
    // Each silence file reads back as ceil(d / 0.026122) frames ≈ the
    // requested duration. Allow ~50ms slack per file for frame quantization.
    const expected = aDuration + bDuration;
    expect(outDuration).toBeGreaterThanOrEqual(expected - 0.1);
    expect(outDuration).toBeLessThanOrEqual(expected + 0.1);

    // The output file should exist and be non-empty.
    const outStat = await stat(out);
    expect(outStat.size).toBeGreaterThan(0);
  });

  it('concatenates three or more inputs in order', async () => {
    const a = path.join(tmpDir, 'a.mp3');
    const b = path.join(tmpDir, 'b.mp3');
    const c = path.join(tmpDir, 'c.mp3');
    const out = path.join(tmpDir, 'out.mp3');
    await generateSilentAudioFile(0.5, a);
    await generateSilentAudioFile(0.5, b);
    await generateSilentAudioFile(0.5, c);

    await concatAudioFiles([a, b, c], out);

    const outDuration = await probeAudioDurationSeconds(out);
    // 3 * 0.5s ≈ 1.5s plus 3 frames of quantization slack.
    expect(outDuration).toBeGreaterThanOrEqual(1.4);
    expect(outDuration).toBeLessThanOrEqual(1.6);
  });

  it('copies a single input file to the output path without re-reading it twice', async () => {
    const a = path.join(tmpDir, 'a.mp3');
    const out = path.join(tmpDir, 'out.mp3');
    await generateSilentAudioFile(1, a);
    const aBytes = await readFile(a);
    await concatAudioFiles([a], out);
    const outBytes = await readFile(out);
    expect(outBytes.equals(aBytes)).toBe(true);
  });

  it('rejects when the input list is empty', async () => {
    await expect(concatAudioFiles([], path.join(tmpDir, 'out.mp3'))).rejects.toThrow(
      /at least one input file/,
    );
  });

  it('rejects inputs with mismatched sample rate or channel count', async () => {
    // Mismatched sample rate: build a 48kHz mono file by hand-writing
    // every frame header with the 48kHz sample-rate index. music-metadata
    // reads the LAST frame's header to determine the file's sample rate,
    // so just flipping byte 2 of frame 0 is not enough — every frame
    // must be re-stamped.
    const mono44 = path.join(tmpDir, 'mono-44.mp3');
    await generateSilentAudioFile(1, mono44);
    const mono48 = path.join(tmpDir, 'mono-48.mp3');
    {
      const buf = Buffer.from(await readFile(mono44));
      // Rewrite every frame's byte 2: 0x10 (44.1kHz) → 0x14 (48kHz).
      for (let offset = 0; offset + 4 <= buf.length; offset += 104) {
        if (buf[offset] === 0xff && buf[offset + 1] === 0xfb) {
          buf[offset + 2] = 0x14;
        }
      }
      await (await import('node:fs/promises')).writeFile(mono48, buf);
    }
    // Sanity check: music-metadata should now report 48kHz.
    const { parseFile } = await import('music-metadata');
    const probeMeta = await parseFile(mono48);
    expect(probeMeta.format.sampleRate).toBe(48000);

    await expect(concatAudioFiles([mono44, mono48], path.join(tmpDir, 'out.mp3'))).rejects.toThrow(
      /sample rate/,
    );
  });

  it('rejects inputs with mismatched channel count', async () => {
    // music-metadata reports `numberOfChannels` based on the channel-mode
    // bits in byte 3 (lower 2 bits). The silence frames use 11 = mono.
    // Flip to 00 = stereo on every frame and music-metadata will see 2
    // channels.
    const mono = path.join(tmpDir, 'mono.mp3');
    await generateSilentAudioFile(1, mono);
    const stereo = path.join(tmpDir, 'stereo.mp3');
    {
      const buf = Buffer.from(await readFile(mono));
      // Rewrite every frame's byte 3: 0xC4 (mono) → 0x04 (stereo).
      for (let offset = 0; offset + 4 <= buf.length; offset += 104) {
        if (buf[offset] === 0xff && buf[offset + 1] === 0xfb) {
          buf[offset + 3] = 0x04;
        }
      }
      await (await import('node:fs/promises')).writeFile(stereo, buf);
    }
    const { parseFile } = await import('music-metadata');
    const probeMeta = await parseFile(stereo);
    expect(probeMeta.format.numberOfChannels).toBe(2);

    await expect(concatAudioFiles([mono, stereo], path.join(tmpDir, 'out.mp3'))).rejects.toThrow(
      /channel count/,
    );
  });

  it('is exported alongside an ffmpeg-backed opt-in variant', () => {
    expect(typeof concatAudioFiles).toBe('function');
    expect(typeof concatAudioFilesWithFfmpeg).toBe('function');
    expect(concatAudioFiles).not.toBe(concatAudioFilesWithFfmpeg);
  });
});
