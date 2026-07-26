import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { parseFile, parseBuffer, type IAudioMetadata } from 'music-metadata';
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
  return readDurationFromMetadata(filePath, metadata);
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

function readDurationFromMetadata(source: string, metadata: IAudioMetadata): number {
  const durationSeconds = metadata.format.duration;
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(
      `music-metadata returned an invalid duration for "${source}": ${JSON.stringify(
        metadata.format.duration,
      )}`,
    );
  }
  return durationSeconds;
}

export interface ResolveVoiceoverDurationInput {
  result: Pick<VoiceResult, 'audioBuffer' | 'format' | 'durationSeconds'>;
  outputPath: string;
  probe?: AudioDurationProbe;
}

export interface Mp3FrameProfile {
  sampleRate: number;
  channelCount: number;
  bitrate: number;
}

/**
 * MPEG-1 Layer III silence frame constants for 44.1kHz mono 32kbps.
 *
 * Each frame is 104 bytes (no padding): 4-byte header + 100-byte main data.
 * 1152 samples per frame → ~26.122ms of silence per frame. We use 32kbps
 * because that gives the cleanest frame math (`144 × 32000 / 44100 ≈ 104.49`
 * → 104 with no padding) and the smallest frame size, which keeps the
 * generated asset compact. music-metadata's MPEG parser reads only the
 * frame headers to compute duration, so the zero-filled body is treated
 * as silence without needing a real MP3 encoder.
 */
const SILENCE_FRAME_HEADER = Buffer.from([0xff, 0xfb, 0x10, 0xc4]);
const SILENCE_FRAME_SIZE = 104;
const SILENCE_FRAME_SAMPLES = 1152;
const SILENCE_SAMPLE_RATE = 44100;
const SILENCE_FRAME_DURATION_SECONDS = SILENCE_FRAME_SAMPLES / SILENCE_SAMPLE_RATE;

/**
 * Read the audio profile (sample rate, channel count, bitrate) from a buffer
 * of MP3 bytes via music-metadata. The full-file scan is fine here because
 * the inputs are short per-scene clips and the metadata read is in-process.
 */
async function readMp3ProfileFromBuffer(buffer: Buffer): Promise<Mp3FrameProfile> {
  const metadata = await parseBuffer(new Uint8Array(buffer), undefined, {
    duration: false,
    skipCovers: true,
  });
  const format = metadata.format;
  if (!Number.isFinite(format.sampleRate) || format.sampleRate === undefined) {
    throw new Error('music-metadata could not determine the sample rate for the MP3 input.');
  }
  if (!Number.isFinite(format.numberOfChannels) || format.numberOfChannels === undefined) {
    throw new Error('music-metadata could not determine the channel count for the MP3 input.');
  }
  if (!Number.isFinite(format.bitrate) || format.bitrate === undefined) {
    throw new Error('music-metadata could not determine the bitrate for the MP3 input.');
  }
  return {
    sampleRate: format.sampleRate,
    channelCount: format.numberOfChannels,
    bitrate: format.bitrate,
  };
}

/**
 * Strip the optional ID3v2 tag at the start of an MP3 byte buffer and the
 * optional ID3v1 tag at the end. Returns the contiguous "raw frames" slice
 * in between, which can be concatenated with another file's frame slice
 * to produce a single valid MP3 stream.
 */
function extractMp3FrameBytes(buffer: Buffer): Buffer {
  let start = 0;
  let end = buffer.length;

  // ID3v2 tag: starts with the literal "ID3" followed by a 2-byte version,
  // a flags byte, and a 4-byte synchsafe size. Total tag size is
  // 10 + synchsafeSize bytes.
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x49 && // 'I'
    buffer[1] === 0x44 && // 'D'
    buffer[2] === 0x33    // '3'
  ) {
    const synchsafeSize =
      ((buffer[6]! & 0x7f) << 21) |
      ((buffer[7]! & 0x7f) << 14) |
      ((buffer[8]! & 0x7f) << 7) |
      (buffer[9]! & 0x7f);
    start = 10 + synchsafeSize;
    if (start > buffer.length) {
      // Malformed: the ID3 header claims a tag larger than the file.
      // Fall back to the full buffer rather than silently losing audio.
      start = 0;
    }
  }

  // ID3v1 tag: 128 bytes at the end of the file, prefixed with "TAG".
  if (
    end - start >= 128 &&
    buffer[end - 128] === 0x54 && // 'T'
    buffer[end - 127] === 0x41 && // 'A'
    buffer[end - 126] === 0x47    // 'G'
  ) {
    end -= 128;
  }

  return buffer.subarray(start, end);
}

/**
 * Concatenate audio files (e.g. per-scene narration clips) into a single
 * output MP3 using pure-JS frame-level concatenation.
 *
 * Each input is parsed by `music-metadata` to confirm it is a valid MP3 and
 * to recover the sample rate / channel count. All inputs must share those
 * two parameters — the per-frame bitrate is allowed to differ, mirroring
 * ffmpeg's `-c copy` concat-demuxer behavior (the resulting stream is a
 * valid mixed-bitrate MP3 that music-metadata and most decoders accept).
 * The ID3v2 tag at the start of each file and the ID3v1 tag at the end are
 * stripped before concatenation; the output has one set of (empty) tags
 * implicitly.
 *
 * A single input is copied straight to the output path.
 *
 * Works on a clean machine with no `ffmpeg` binary installed.
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

  const inputBuffers = await Promise.all(inputs.map((p) => fs.readFile(p)));
  const profiles = await Promise.all(inputBuffers.map(readMp3ProfileFromBuffer));

  const reference = profiles[0]!;
  for (let index = 1; index < profiles.length; index += 1) {
    const profile = profiles[index]!;
    const mismatches: string[] = [];
    if (profile.sampleRate !== reference.sampleRate) {
      mismatches.push(`sample rate (${profile.sampleRate} vs ${reference.sampleRate})`);
    }
    if (profile.channelCount !== reference.channelCount) {
      mismatches.push(`channel count (${profile.channelCount} vs ${reference.channelCount})`);
    }
    if (mismatches.length > 0) {
      throw new Error(
        `Cannot concatenate MP3 files with differing ${mismatches.join(' and ')}: ` +
          `"${inputs[index]}" does not match the format of "${inputs[0]}".`,
      );
    }
  }

  const slices = inputBuffers.map(extractMp3FrameBytes);
  const totalBytes = slices.reduce((sum, slice) => sum + slice.length, 0);
  await fs.writeFile(outputPath, Buffer.concat(slices, totalBytes));
}

/**
 * ffmpeg-backed variant of `concatAudioFiles`. Faster on machines where
 * ffmpeg is installed (it can re-multiplex without re-reading the inputs
 * twice), but requires the `ffmpeg` binary on PATH. Kept as opt-in for
 * environments that prefer the native tool.
 */
export async function concatAudioFilesWithFfmpeg(
  inputs: string[],
  outputPath: string,
): Promise<void> {
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
 * Generate a silent MP3 clip of the requested duration by writing a
 * contiguous stream of MPEG-1 Layer III silence frames (44.1kHz mono
 * 32kbps, 104 bytes per frame, ~26.122ms per frame). The header for each
 * frame is well-formed; the body is zero-filled — the resulting file is a
 * valid MP3 stream that `music-metadata` reads back as exactly
 * `ceil(duration / SILENCE_FRAME_DURATION_SECONDS) * SILENCE_FRAME_DURATION_SECONDS`
 * seconds (within one frame, ~26ms) regardless of the requested duration.
 *
 * The output is the same shape as the ffmpeg-backed
 * `generateSilentAudioFile` (MPEG-1 Layer III silence, mono, 44.1kHz), so
 * the existing probe path (`probeAudioDurationSeconds`) accepts it without
 * changes. We deliberately use 32kbps (not 96kbps like the ffmpeg variant)
 * because that gives a clean 104-byte frame size and keeps the asset
 * compact — the file is full of silence either way.
 *
 * Works on a clean machine with no `ffmpeg` binary installed.
 */
export async function generateSilentAudioFile(
  durationSeconds: number,
  outputPath: string,
): Promise<void> {
  const safeDuration = Math.max(SILENCE_FRAME_DURATION_SECONDS, durationSeconds);
  const totalFrames = Math.max(1, Math.ceil(safeDuration / SILENCE_FRAME_DURATION_SECONDS));
  const frame = Buffer.alloc(SILENCE_FRAME_SIZE);
  SILENCE_FRAME_HEADER.copy(frame, 0);
  // frame[4..104] is already zero — the zero-filled body parses as an
  // "all-zero Huffman" stream which decoders and music-metadata both
  // accept as silence.
  const buffer = Buffer.alloc(SILENCE_FRAME_SIZE * totalFrames);
  for (let index = 0; index < totalFrames; index += 1) {
    frame.copy(buffer, index * SILENCE_FRAME_SIZE);
  }
  await fs.writeFile(outputPath, buffer);
}

/**
 * ffmpeg-backed variant of `generateSilentAudioFile`. Same contract as the
 * default; uses the `anullsrc` filter + libmp3lame to produce a 44.1kHz
 * mono 96kbps silence file. Requires the `ffmpeg` binary on PATH. Kept
 * as opt-in for environments that prefer the native tool.
 */
export async function generateSilentAudioFileWithFfmpeg(
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
