# Rendering guide

## Starting Remotion Studio

From the repo root:

```bash
pnpm remotion:studio
```

This runs `remotion studio` inside `apps/remotion-studio`, which registers the
compositions exported by `@mapvideo/renderer`. Studio serves
`apps/remotion-studio/public/` as the static-file root.

## Rendering the fixtures

```bash
pnpm remotion:render:fixture         # starter MP4
pnpm remotion:frame:fixture          # starter still at frame 60
pnpm remotion:render:map-video       # neutral vector-map MP4
pnpm remotion:render:rtl-fixture     # RTL vector-map MP4
```

New PR 1C fixtures are rendered directly through `remotion render`:

```bash
pnpm --filter @mapvideo/remotion-studio exec remotion render map-video-country-zoom out/map-video-country-zoom/map-video-country-zoom.mp4
pnpm --filter @mapvideo/remotion-studio exec remotion render map-video-ranking out/map-video-ranking/map-video-ranking.mp4
```

Generated renders are gitignored. Do not commit large MP4 files; use the
documented output path or CI artifacts instead (see the repo artifact limits).

## Deterministic rendering requirements

The same validated props and assets must produce byte-identical (or visually
identical) output every time. To keep renders deterministic:

- **No current time.** Do not call `Date.now()`, `new Date()`, `performance.now()`,
  or `Math.random()` in any composition or helper. Everything is frame-driven via
  `useCurrentFrame()` / `useVideoConfig()`.
- **No remote assets at render time.** All assets live under
  `apps/remotion-studio/public/` and are referenced with `staticFile()`. Fonts
  are loaded through `@remotion/google-fonts`, which bundles them.
- **No unvalidated props.** Every composition validates its props with a Zod
  schema and derives timing through `calculateMetadata`.
- **Fixed locale, timezone, inputs, and seeds.** Fixtures use stable inputs;
  generated media (SFX, mock voiceover) uses deterministic synthesis (the SFX
  script uses an LCG noise source, not `Math.random()`).

## Rendering environment record

When recording a test render, capture:

- Node version (`.node-version`)
- pnpm version (`packageManager`)
- Remotion version (`4.0.475`)
- Chromium version (printed by `remotion` on first render)
- FFmpeg / ffprobe versions (`ffmpeg -version`, `ffprobe -version`)
- OS and architecture
- Font-loading behavior (Inter, bundled via `@remotion/google-fonts`)
- Locale and timezone assumptions (fixtures assume no locale dependence)
- GPU configuration when relevant (`remotion.config.ts` uses the ANGLE renderer)

## Verifying a render

After rendering the fixture, verify:

- The output is 1080×1920 at 30 FPS.
- The MP4 plays correctly end to end.
- The first and final frames are not clipped.
- No one-frame flashes occur.
- No missing-glyph boxes appear.
- No network access was needed during the render.
