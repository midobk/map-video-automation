# VoiceProvider boundary

## Goal

Keep compositions provider-agnostic. Voice synthesis happens through the
`VoiceProvider` interface, and real adapters are activated only through explicit
operator configuration.

## Interface

```ts
export interface VoiceProvider {
  synthesize(request: VoiceRequest): Promise<VoiceResult>;
}
```

## Implementations

- `MockVoiceProvider` returns deterministic WAV audio for tests and local
  previews.
- `ElevenLabsVoiceAdapter` returns MP3 bytes only when explicitly selected.

## Safe output paths

`scripts/media/generate-voiceover.mjs` validates the project id and every
narration line id as a single path segment before it performs synthesis or file
writes. Separators, dot segments, absolute paths, whitespace, and other unsafe
characters are rejected, preventing configuration data from escaping
`public/<project>/voiceover/`.

## Duration metadata

A positive duration reported by a provider is accepted. Deterministic WAV
fixtures may derive duration from their PCM header. Compressed output such as
MP3 is measured from the written file with `ffprobe` through the server-only
`@mapvideo/renderer/voice/server` export. MP3 bytes are never parsed with the
WAV-header helper.

## Manifest

Each generated audio file receives a validated adjacent manifest containing the
text hash, provider, model, voice id, relative audio path, measured duration,
generation timestamp, and optional provider request id. Authentication material
is never written to the manifest.
