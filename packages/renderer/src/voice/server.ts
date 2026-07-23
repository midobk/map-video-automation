import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { parseFile } from 'music-metadata';
import { estimateWavDurationSeconds } from './wav';
import type { VoiceResult } from './provider';

export {
  assertSafeVoiceoverPathSegment,
  UnsafeVoiceoverPathSegmentError,
} from './path-segment';

export type AudioDurationProbe = (filePath: string) => Promise<number>;

/**
 * Default audio-duration probe. Pure-JS via the `music-metadata` package so
 * the real-provider render path works on machines without an `ffprobe`
 * binary (developer laptops, container images without ffmpeg installed, etc.).
 *
 * music-metadata parses the MP3 frame headers in-process and returns the
 * computed duration directly — no native binary, no child_process spawn.
 */
export async function probeAudioDurationSeconds(filePath: string): Promise<number> {
  const metadata = await parseFile(filePath, { duration: true, skipCovers: true });
  const durationSeconds = metadata.format.duration;
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(
      `music-metadata returned an invalid duration for "${filePath}": ${JSON.stringify(
        metadata.format.duration,
      )}`,
    );
  }
  return durationSeconds;
}

/**
 * Alternative probe that shells out to `ffprobe`. Faster on machines where
 * the binary is installed, but requires it on PATH. Kept as an opt-in for
 * environments that prefer the native tool (or for diagnostics).
 */
export async function probeAudioDurationSecondsWithFfprobe(
  filePath: string,
): Promise<number> {
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
 * Concatenate audio files (e.g. per-scene narration clips) into a single
 * output file using ffmpeg's concat demuxer with stream copy (`-c copy`).
 *
 * Inputs must share the same codec/format parameters — ElevenLabs clips from
 * the same voice/model do, so copy is fast and lossless. A single input is
 * copied straight to the output path. The concat list is written to a temp
 * file next to the output and removed in a `finally`.
 */
export async function concatAudioFiles(inputs: string[], outputPath: string): Promise<void> {
  if (inputs.length === 0) {
    throw new Error('concatAudioFiles requires at least one input file.');
  }
  if (inputs.length === 1) {
    const only = inputs[0];
    if (only) {
      await fs.copyFile(only, outputPath);
    }
    return;
  }

  const listFile = `${outputPath}.concat.txt`;
  // Quote each path for the concat demuxer's `file '<path>'` syntax.
  const list = inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listFile, list, 'utf8');
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        'ffmpeg',
        ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath],
        { encoding: 'utf8' },
        (error) => {
          if (error) {
            reject(new Error(`ffmpeg concat failed: ${error.message}`, { cause: error }));
            return;
          }
          resolve();
        },
      );
    });
  } finally {
    await fs.rm(listFile, { force: true });
  }
}

/**
 * Generate a silent MP3 clip of the requested duration. Used to fill scenes
 * that have no voiceover text so the concatenated narration track stays
 * aligned with the video timeline (audio length == sum of scene durations).
 */
export async function generateSilentAudioFile(
  durationSeconds: number,
  outputPath: string,
): Promise<void> {
  const seconds = Math.max(0.1, durationSeconds).toFixed(3);
  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-f',
        'lavfi',
        '-i',
        `anullsrc=r=44100:cl=mono`,
        '-t',
        seconds,
        '-c:a',
        'libmp3lame',
        '-b:a',
        '96k',
        outputPath,
      ],
      { encoding: 'utf8' },
      (error) => {
        if (error) {
          reject(new Error(`ffmpeg silent-clip generation failed: ${error.message}`, { cause: error }));
          return;
        }
        resolve();
      },
    );
  });
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
