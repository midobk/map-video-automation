import { execFile } from 'node:child_process';
import { estimateWavDurationSeconds } from './wav';
import type { VoiceResult } from './provider';

export type AudioDurationProbe = (filePath: string) => Promise<number>;

/** Measure an audio file with ffprobe and require a positive finite duration. */
export async function probeAudioDurationSeconds(filePath: string): Promise<number> {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { encoding: 'utf8' },
      (error, output) => {
        if (error) {
          reject(
            new Error(
              `Unable to measure audio duration for "${filePath}" with ffprobe: ${error.message}`,
              { cause: error },
            ),
          );
          return;
        }
        resolve(output);
      },
    );
  });

  const durationSeconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(
      `ffprobe returned an invalid duration for "${filePath}": ${JSON.stringify(stdout.trim())}`,
    );
  }
  return durationSeconds;
}

export interface ResolveVoiceoverDurationInput {
  result: Pick<VoiceResult, 'audioBuffer' | 'format' | 'durationSeconds'>;
  outputPath: string;
  probe?: AudioDurationProbe;
}

/**
 * Resolve trustworthy duration metadata for a generated voiceover.
 *
 * Provider-reported positive durations are accepted. WAV fixtures may fall back
 * to their PCM header. Compressed formats such as MP3 are measured from the
 * written file with ffprobe and are never interpreted as WAV bytes.
 */
export async function resolveVoiceoverDurationSeconds({
  result,
  outputPath,
  probe = probeAudioDurationSeconds,
}: ResolveVoiceoverDurationInput): Promise<number> {
  if (Number.isFinite(result.durationSeconds) && result.durationSeconds > 0) {
    return result.durationSeconds;
  }

  if (result.format === 'wav') {
    const wavDuration = estimateWavDurationSeconds(result.audioBuffer);
    if (Number.isFinite(wavDuration) && wavDuration > 0) {
      return wavDuration;
    }
  }

  return probe(outputPath);
}
