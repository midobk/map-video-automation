import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createVoiceProvider,
} from '../src/tts/tts-adapter-factory';
import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
} from '@mapvideo/renderer/voice';

describe('createVoiceProvider', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset the env vars that influence provider selection. We set them
    // explicitly per test rather than mutating, so the assertion below
    // about "no env vars -> mock" is deterministic.
    delete process.env.TTS_PROVIDER;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
  });

  afterEach(() => {
    // Restore to whatever was set when the suite loaded; the dev
    // environment may have set TTS_PROVIDER=mock for the host runner.
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it('returns a MockVoiceProvider when no TTS_PROVIDER is set', () => {
    const provider = createVoiceProvider();
    expect(provider).toBeInstanceOf(MockVoiceProvider);
  });

  it('returns a MockVoiceProvider when TTS_PROVIDER=mock', () => {
    process.env.TTS_PROVIDER = 'mock';
    expect(createVoiceProvider()).toBeInstanceOf(MockVoiceProvider);
  });

  it('throws when TTS_PROVIDER=elevenlabs but no API key is configured', () => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    expect(() => createVoiceProvider()).toThrow(/ELEVENLABS_API_KEY/);
  });

  it('returns an ElevenLabsVoiceAdapter when TTS_PROVIDER=elevenlabs and a key is set', () => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    process.env.ELEVENLABS_API_KEY = 'test-key';
    const provider = createVoiceProvider();
    expect(provider).toBeInstanceOf(ElevenLabsVoiceAdapter);
    expect((provider as ElevenLabsVoiceAdapter).apiKey).toBe('test-key');
    expect((provider as ElevenLabsVoiceAdapter).voiceId).toBe('21m00Tcm4TlvDq8ikWAM');
  });

  it('respects a custom ELEVENLABS_VOICE_ID override', () => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    process.env.ELEVENLABS_API_KEY = 'test-key';
    process.env.ELEVENLABS_VOICE_ID = 'custom-voice';
    const provider = createVoiceProvider() as ElevenLabsVoiceAdapter;
    expect(provider.voiceId).toBe('custom-voice');
  });
});
