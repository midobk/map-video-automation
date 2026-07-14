// Procedurally synthesize UI sound effects as 48kHz mono WAV files.
// No dependencies, no external/copyrighted audio — every sample is generated
// here. Output: apps/remotion-studio/public/sfx/*.wav
//
// Run:  pnpm sfx:generate

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../apps/remotion-studio/public/sfx');
const SAMPLE_RATE = 48000;

mkdirSync(OUT_DIR, { recursive: true });

// ---------- WAV encoding (16-bit PCM mono) ----------
function encodeWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buffer;
}

const n = (seconds) => Math.floor(seconds * SAMPLE_RATE);
const t = (i) => i / SAMPLE_RATE;

// Soft-clip to keep things gentle and avoid harsh peaks.
const softClip = (x) => Math.tanh(x * 1.2);

// ---------- 1. Whoosh — transition sweep ----------
function whoosh() {
  const dur = 0.5;
  const len = n(dur);
  const out = new Float32Array(len);
  let lp = 0; // one-pole low-pass state
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const env = Math.sin(Math.PI * p) ** 1.6;
    const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * p);
    // Deterministic noise via a cheap LCG instead of Math.random(), so the
    // generated SFX are reproducible across runs.
    const noise = pseudoNoise(i) * 2 - 1;
    lp += cutoff * (noise - lp);
    out[i] = softClip(lp * env * 0.9);
  }
  return out;
}

// Deterministic noise source (LCG) — replaces Math.random() for reproducibility.
function pseudoNoise(i) {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- generic bell/chime partial ----------
function addPartial(out, freq, amp, decay, startSec = 0, detune = 0) {
  const start = n(startSec);
  for (let i = start; i < out.length; i++) {
    const tt = t(i - start);
    const env = Math.exp(-decay * tt);
    out[i] += Math.sin(2 * Math.PI * (freq + detune) * tt) * amp * env;
  }
}

// ---------- 2. Chime — gentle confirm (check / verify) ----------
function chime() {
  const out = new Float32Array(n(0.75));
  addPartial(out, 783.99, 0.5, 5.5);
  addPartial(out, 1174.66, 0.3, 6.5);
  addPartial(out, 1567.98, 0.18, 7.5, 0, 1.5);
  addPartial(out, 2350, 0.12, 40);
  for (let i = 0; i < out.length; i++) out[i] = softClip(out[i]);
  return out;
}

// ---------- 3. Success — rising two-note (release confirmed) ----------
function success() {
  const out = new Float32Array(n(0.9));
  addPartial(out, 659.25, 0.45, 6, 0.0);
  addPartial(out, 987.77, 0.45, 6, 0.12);
  addPartial(out, 1318.51, 0.2, 7, 0.12);
  for (let i = 0; i < out.length; i++) out[i] = softClip(out[i]);
  return out;
}

// ---------- 4. Click — subtle UI tap ----------
function click() {
  const out = new Float32Array(n(0.07));
  for (let i = 0; i < out.length; i++) {
    const tt = t(i);
    const env = Math.exp(-90 * tt);
    const body = Math.sin(2 * Math.PI * 1100 * tt);
    const tick = (pseudoNoise(i) * 2 - 1) * Math.exp(-400 * tt);
    out[i] = softClip((body * 0.6 + tick * 0.5) * env);
  }
  return out;
}

const FILES = {
  'whoosh.wav': whoosh(),
  'chime.wav': chime(),
  'success.wav': success(),
  'click.wav': click(),
};

for (const [name, samples] of Object.entries(FILES)) {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, encodeWav(samples));
  console.log(`  ✓ ${name}  (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}
console.log(`Generated ${Object.keys(FILES).length} SFX files in apps/remotion-studio/public/sfx/`);