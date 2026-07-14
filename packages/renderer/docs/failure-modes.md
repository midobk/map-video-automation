# Common Remotion failure modes

Distilled from the donor project's operating notes. Each item explains the
failure and how this renderer avoids it.

## 1. The media-bunny 404 on a missing `<Audio>`

Remotion's media pre-fetcher 404s the moment it sees an `<Audio src={staticFile(...)}>`
for a file that does not exist. Probing the file in a `useEffect` still leaks one
render of the missing file, which is enough to trigger the 404.

**Mitigation:** `<OptionalAudio>` probes the static-files list synchronously
through `AudioConfigProvider` before mounting `<Audio>`, so a missing optional
file is never mounted. Required narration is validated before rendering, so a
missing required file fails explicitly.

## 2. Silent incomplete video

A missing required asset that is silently skipped produces a video that looks
fine but is missing narration or a key asset.

**Mitigation:** required narration always resolves to `error`. The asset
manifest validates file existence and required/optional status before a render
starts. `enforceMissingAsset('error', ...)` throws a `MissingAssetError`.

## 3. Narration manifest field clobbering

Round-tripping a narration JSON file and writing it back can drop unknown fields
on the first run.

**Mitigation:** the PR 1A voiceover CLI is mock-only and writes generated audio
to a separate `voiceover/` folder; it does not rewrite the narration source. The
validated voiceover manifest lands in PR 1B.

## 4. Non-deterministic renders

`Math.random()`, `Date.now()`, current-time reads, or remote asset/font fetches
make the same input produce different output across runs.

**Mitigation:** all helpers are frame-driven. The SFX generator uses an LCG
noise source instead of `Math.random()`. Fonts are bundled. Assets are local.

## 5. Path traversal / absolute paths in plans

Accepting unvalidated paths lets a plan read files outside `public/`.

**Mitigation:** `resolveStaticPath` rejects absolute, drive-rooted, and
traversal paths, and `validateAssetManifest` enforces allowed extensions and
rejects duplicates.

## 6. Unvalidated render props

Free-form JSON passed straight into a composition bypasses the schema and can
crash mid-render or render the wrong thing.

**Mitigation:** every composition has a Zod schema; `starterFixtureProps` is
parsed at import time so an accidental edit is caught immediately.

## 7. CSS template-literal parser trips

Complex inline `style` template literals can trip Remotion's style parser.

**Mitigation:** keep inline styles simple; interpolate only primitive values
(strings/numbers), not nested objects or expressions with backticks inside
backticks.