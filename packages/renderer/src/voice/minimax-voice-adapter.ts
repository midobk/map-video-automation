import type { VoiceProvider, VoiceRequest, VoiceResult } from './provider';

const MINIMAX_TTS_URL = 'https://api.minimax.io/v1/t2a_v2';

/**
 * MiniMax TTS voice-provider adapter (Text-to-Audio v2).
 *
 * Uses the same MINIMAX_API_KEY as the research adapter, so a single MiniMax
 * account powers both research and narration. MiniMax returns the audio as a
 * hex-encoded byte string in `data.audio` (an MP3 with an ID3 header); we
 * decode it to an ArrayBuffer. The caller measures the real duration with
 * ffprobe, though `extra_info.audio_length` (ms) is used as a fallback.
 *
 * Requires an API key. Free-tier MiniMax credit covers short MVP renders.
 */
export class MiniMaxVoiceAdapter implements VoiceProvider {
  constructor(
    readonly apiKey: string,
    readonly voiceId: string,
    readonly modelId = 'speech-02-turbo',
  ) {}

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    if (!this.apiKey) {
      throw new Error(
        'MiniMaxVoiceAdapter requires an API key. Provide MINIMAX_API_KEY or use MockVoiceProvider for fixture rendering.',
      );
    }

    const response = await fetch(MINIMAX_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        text: request.text,
        stream: false,
        voice_setting: {
          voice_id: this.voiceId,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
          audio_format: 'mp3',
        },
      }),
    });

    // MiniMax returns HTTP 200 even on logical errors, with a non-zero
    // base_resp.status_code. Treat both transport and logical errors.
    const body = (await response.json().catch(() => null)) as MiniMaxTtsResponse | null;
    if (!response.ok) {
      throw new Error(
        `MiniMax TTS failed: ${response.status} ${response.statusText}` +
          `${body ? ` — ${JSON.stringify(body)}` : ''}`.slice(0, 400),
      );
    }
    const status = body?.base_resp?.status_code;
    if (status && status !== 0) {
      throw new Error(
        `MiniMax TTS failed: ${body?.base_resp?.status_msg ?? `status ${status}`}`,
      );
    }

    const hex = body?.data?.audio;
    if (!hex) {
      throw new Error('MiniMax TTS response did not include audio data.');
    }

    const buffer = Buffer.from(hex, 'hex');
    const audioBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const durationSeconds = (body?.extra_info?.audio_length ?? 0) / 1000;

    return {
      audioBuffer,
      format: 'mp3',
      durationSeconds,
      providerRequestId: response.headers.get('x-request-id') ?? undefined,
    };
  }
}

interface MiniMaxTtsResponse {
  base_resp?: { status_code?: number; status_msg?: string };
  data?: { audio?: string };
  extra_info?: { audio_length?: number };
}