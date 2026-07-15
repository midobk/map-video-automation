# VoiceProvider boundary

## Goal

Keep `@mapvideo/renderer` free of direct ElevenLabs or other provider imports.
Voice synthesis happens through an internal `VoiceProvider` interface.

## Interface

```ts
export interface VoiceProvider {
  synthesize(text: string, options: VoiceSynthesizeOptions): Promise<VoiceResult>;
}
```

## Implementations

- `MockVoiceProvider` returns deterministic WAV metadata for tests and local
  previews.
- `ElevenLabsVoiceProvider` calls the ElevenLabs API when a real voiceover is
  requested.

## Manifest

`scripts/media/generate-voiceover.mjs` builds a `voiceoverManifest`, iterates
every scene that needs a voiceover, and delegates each call to the configured
provider. The manifest is written to `out/voiceover-manifest.json`.
