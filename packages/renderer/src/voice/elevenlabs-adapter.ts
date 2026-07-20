import type { VoiceProvider, VoiceRequest, VoiceResult } from './provider';

/**
 * ElevenLabs voice-provider adapter.
 *
 * Credentials are supplied at construction time. The adapter never embeds an
 * API key. If no key is provided, `synthesize` throws so that the fixture
 * pipeline cannot silently require a paid service.
 */
export class ElevenLabsVoiceAdapter implements VoiceProvider {
  constructor(
    readonly apiKey: string,
    readonly voiceId: string,
    readonly modelId = 'eleven_multilingual_v2',
  ) {}

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    if (!this.apiKey) {
      throw new Error(
        'ElevenLabsVoiceAdapter requires an API key. Provide one at construction time or use MockVoiceProvider for fixture rendering.',
      );
    }

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + this.voiceId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        model_id: this.modelId,
      }),
    });

    if (!response.ok) {
      // ElevenLabs puts the actionable reason in the JSON body (e.g.
      // "Free users cannot use library voices via the API" or "Instantly
      // cloned voices are not available on your current plan"). Surface it
      // instead of a bare status so the failure is self-diagnosing.
      let detail = '';
      try {
        const body = await response.json();
        detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message ?? JSON.stringify(body);
      } catch {
        detail = await response.text().catch(() => '');
      }
      throw new Error(
        `ElevenLabs TTS failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return {
      audioBuffer,
      format: 'mp3',
      durationSeconds: 0, // caller should measure with ffprobe
      providerRequestId: response.headers.get('x-request-id') ?? undefined,
    };
  }
}
