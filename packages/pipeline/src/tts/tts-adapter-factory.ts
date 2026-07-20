import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  MiniMaxVoiceAdapter,
  type VoiceProvider,
} from '@mapvideo/renderer/voice';
import { readServerEnvironment } from '@mapvideo/shared';

/**
 * Build the active voice provider from the server environment.
 *
 * Defaults to MockVoiceProvider so local dev and preview deploys render
 * deterministically without API keys.
 */
export function createVoiceProvider(): VoiceProvider {
  const environment = readServerEnvironment();
  const provider = environment.TTS_PROVIDER ?? 'mock';

  if (provider === 'elevenlabs') {
    const apiKey = environment.ELEVENLABS_API_KEY;
    const voiceId = environment.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
    if (!apiKey) {
      throw new Error('TTS_PROVIDER=elevenlabs requires ELEVENLABS_API_KEY.');
    }
    return new ElevenLabsVoiceAdapter(apiKey, voiceId);
  }

  if (provider === 'minimax') {
    // Reuses MINIMAX_API_KEY (same account as the research adapter).
    const apiKey = environment.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error('TTS_PROVIDER=minimax requires MINIMAX_API_KEY.');
    }
    const voiceId = environment.MINIMAX_TTS_VOICE_ID ?? 'English_CaptivatingStoryteller';
    return new MiniMaxVoiceAdapter(apiKey, voiceId);
  }

  return new MockVoiceProvider();
}

/**
 * Synthesize a single audio buffer for the concatenated narration script.
 */
export async function synthesizeNarration(
  narrationSegments: { sceneId: string; text: string }[],
  provider: VoiceProvider,
): Promise<{
  audioBuffer: ArrayBuffer;
  durationSeconds: number;
  segments: { sceneId: string; text: string; durationSeconds: number }[];
}> {
  const fullText = narrationSegments.map((s) => s.text).join(' ');
  const result = await provider.synthesize({ text: fullText });

  // Split the total duration proportionally by character count for mock alignment.
  const totalChars = Math.max(1, fullText.length);
  const totalDurationSeconds = result.durationSeconds;

  const segments = narrationSegments.map((segment) => ({
    ...segment,
    durationSeconds: (segment.text.length / totalChars) * totalDurationSeconds,
  }));

  return {
    audioBuffer: result.audioBuffer,
    durationSeconds: result.durationSeconds,
    segments,
  };
}
