// Safe voiceover CLI for the renderer fixture pipeline.
//
// PR 1A ships ONLY the mock provider, which generates deterministic placeholder
// audio offline. The fixture render must NOT require ElevenLabs or any key.
//
// The full VoiceProvider boundary (mock + ElevenLabs adapter) and the validated
// voiceover manifest are delivered in PR 1B. Until then the ElevenLabs path is
// intentionally stubbed.
//
// Run:  pnpm voiceover:generate -- <project> [--provider mock]

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  let provider = 'mock';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--provider') provider = args[++i];
    else if (a.startsWith('--provider=')) provider = a.slice('--provider='.length);
    else positional.push(a);
  }
  return { project: positional[0], provider };
}

const { project, provider } = parseArgs(process.argv);

if (provider !== 'mock') {
  console.error(
    `\n✖ Provider "${provider}" is not available in PR 1A.\n` +
      '  The ElevenLabs adapter and the voiceover manifest ship in PR 1B.\n' +
      '  For now use:  pnpm voiceover:generate -- <project> --provider mock\n',
  );
  process.exit(1);
}

if (!project) {
  console.error(
    '\n✖ Usage: pnpm voiceover:generate -- <project> [--provider mock]\n' +
      '  <project> is a folder under apps/remotion-studio/public/<project>/ with narration.json.\n',
  );
  process.exit(1);
}

const NARRATION_PATH = resolve(ROOT, 'apps/remotion-studio/public', project, 'narration.json');
if (!existsSync(NARRATION_PATH)) {
  console.error(
    `\nℹ No narration.json found at ${NARRATION_PATH}.\n` +
      '  The PR 1A fixture does not require voiceover. Nothing to generate.\n',
  );
  process.exit(0);
}

const config = JSON.parse(readFileSync(NARRATION_PATH, 'utf8'));
const OUT_DIR = resolve(ROOT, 'apps/remotion-studio/public', project, 'voiceover');
mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

function encodeWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buffer;
}

// Mock provider: deterministic, offline placeholder tone per line. Duration is
// derived from text length so timing stays reproducible. This is a stand-in for
// real TTS, not a production voice.
function mockAudio(text) {
  const seconds = Math.min(30, Math.max(1, text.length / 15)); // ~15 chars/sec
  const len = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const tt = i / SAMPLE_RATE;
    const env = Math.min(1, tt * 4) * Math.min(1, (seconds - tt) * 4);
    out[i] = Math.sin(2 * Math.PI * 220 * tt) * 0.15 * env; // soft placeholder tone
  }
  return out;
}

let ok = 0;
for (const line of config.lines ?? []) {
  const buf = encodeWav(mockAudio(line.text ?? ''));
  const outPath = resolve(OUT_DIR, `${line.id}.wav`);
  writeFileSync(outPath, buf);
  ok++;
  console.log(`  ✓ ${line.id}.wav  (mock placeholder, ${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log(`\n✓ Generated ${ok} mock voiceover placeholder(s) in apps/remotion-studio/public/${project}/voiceover/`);