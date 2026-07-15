// Safe voiceover CLI for the renderer fixture pipeline.
//
// Uses the VoiceProvider boundary from @mapvideo/renderer. The default provider
// is mock, which generates deterministic placeholder audio offline and needs
// no API key. The ElevenLabs adapter is available when an API key is supplied
// via the ELEVENLABS_API_KEY environment variable.
//
// Run:  pnpm voiceover:generate -- <project> [--provider mock|elevenlabs]

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MockVoiceProvider,
  ElevenLabsVoiceAdapter,
  hashVoiceoverText,
  parseVoiceoverManifest,
  estimateWavDurationSeconds,
} from '@mapvideo/renderer';

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

if (!project) {
  console.error(
    '\n✖ Usage: pnpm voiceover:generate -- <project> [--provider mock|elevenlabs]\n' +
      '  <project> is a folder under apps/remotion-studio/public/<project>/ with narration.json.\n',
  );
  process.exit(1);
}

const NARRATION_PATH = resolve(ROOT, 'apps/remotion-studio/public', project, 'narration.json');
if (!existsSync(NARRATION_PATH)) {
  console.error(
    `\nℹ No narration.json found at ${NARRATION_PATH}.\n` +
      '  Nothing to generate.\n',
  );
  process.exit(0);
}

const OUT_DIR = resolve(ROOT, 'apps/remotion-studio/public', project, 'voiceover');
mkdirSync(OUT_DIR, { recursive: true });

let voiceProvider;
if (provider === 'mock') {
  voiceProvider = new MockVoiceProvider();
} else if (provider === 'elevenlabs') {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'default';
  if (!apiKey) {
    console.error(
      '\n✖ ElevenLabs provider selected but ELEVENLABS_API_KEY is not set.\n' +
        '  Set the key in the environment or use --provider mock.\n',
    );
    process.exit(1);
  }
  voiceProvider = new ElevenLabsVoiceAdapter(apiKey, voiceId);
} else {
  console.error(`\n✖ Unknown provider "${provider}". Use mock or elevenlabs.\n`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(NARRATION_PATH, 'utf8'));
const generatedAt = new Date().toISOString();

let ok = 0;
for (const line of config.lines ?? []) {
  const text = line.text ?? '';
  const result = await voiceProvider.synthesize({ text });
  const ext = result.format === 'mp3' ? 'mp3' : 'wav';
  const outPath = resolve(OUT_DIR, `${line.id}.${ext}`);
  writeFileSync(outPath, Buffer.from(result.audioBuffer));

  const durationSeconds =
    result.durationSeconds > 0
      ? result.durationSeconds
      : estimateWavDurationSeconds(result.audioBuffer);

  const manifest = parseVoiceoverManifest({
    textHash: hashVoiceoverText(text),
    provider,
    model: line.model ?? (provider === 'mock' ? 'mock-v1' : 'eleven_multilingual_v2'),
    voiceId: line.voiceId ?? 'default',
    audioPath: `${project}/voiceover/${line.id}.${ext}`,
    durationSeconds,
    generatedAt,
    providerRequestId: result.providerRequestId,
  });

  writeFileSync(
    resolve(OUT_DIR, `${line.id}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );

  ok++;
  console.log(
    `  ✓ ${line.id}.${ext}  (${provider}, ${(result.audioBuffer.byteLength / 1024).toFixed(0)} KB, ${durationSeconds.toFixed(2)} s)`,
  );
}

console.log(
  `\n✓ Generated ${ok} voiceover file(s) in apps/remotion-studio/public/${project}/voiceover/`,
);
