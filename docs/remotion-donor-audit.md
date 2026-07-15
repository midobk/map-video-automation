# Remotion Donor Audit

This document records the audit of the donor project at `~/Desktop/remotion-studio/`
before any of its code is transplanted into `packages/renderer` or `apps/remotion-studio`.
No donor module is transplanted until its imports and assumptions are classified here.

The donor is a source of reusable **patterns and utilities**, not an architecture to
copy wholesale. Every Europ’Équipement item is explicitly excluded below.

## Donor environment

- Remotion: `4.0.475`
- React: `^19.0.0`
- Zod: `4.3.6`
- Package manager: npm (lockfile NOT imported)
- Git status: not a Git repository
- Secret file: `.env.local` (ElevenLabs key) — classified `secret`; never read, printed, copied, or committed.

## Classification legend

- `reuse` — copy with minimal adaptation
- `adapt` — copy and modify to fit the target contracts
- `rewrite` — use only as a pattern; reimplement from scratch
- `document-only` — keep as reference/documentation, do not copy code
- `exclude` — must not enter this repository
- `secret` — credential material; never copy
- `generated` — produced by a script; regenerate here, do not copy
- `client-specific` — Europ’Équipement content/branding; must not enter this repository

## Per-file audit

### `package.json` — `document-only`

- Purpose: donor dependency manifest.
- Imports: none.
- Runtime deps: `@remotion/cli`, `@remotion/google-fonts`, `@remotion/transitions` (declared but unused in donor code), `@remotion/zod-types`, `remotion`, `react`, `react-dom`, `zod`.
- Dev deps: `@types/node`, `@types/react`, `typescript`.
- Static assets: none.
- Browser-only assumptions: none.
- Node-only assumptions: none.
- Brand assumptions: none.
- Client-specific assumptions: none.
- Licensing: all MIT-licensed.
- Planned action: use only to identify dependency versions; do not copy the file.
- Target destination: `packages/renderer/package.json`, `apps/remotion-studio/package.json` (authored fresh).

### `index.ts` — `adapt`

- Purpose: `registerRoot(RemotionRoot)`.
- Imports: `./src/Root`.
- Brand/client assumptions: none.
- Planned action: copy the 4-line pattern; point at the target studio entry.
- Target destination: `apps/remotion-studio/src/index.ts`.

### `remotion.config.ts` — `adapt`

- Purpose: Remotion CLI config (entry, jpeg frames, overwrite, concurrency auto, ANGLE renderer).
- Imports: none.
- Brand/client assumptions: none.
- Planned action: copy and adapt entry path.
- Target destination: `apps/remotion-studio/remotion.config.ts`.

### `tsconfig.json` — `exclude`

- Purpose: donor TS config.
- Planned action: do not copy; the target has `tsconfig.base.json` and per-package configs.
- Target destination: none.

### `CLAUDE.md` / `AGENTS.md` — `document-only`

- Purpose: operator docs + a “Pitfalls” section drawn from real mistakes (OptionalAudio 404 leak, narration.json field-clobbering, EELogo staticFile, strict TS, CSS template-literal parser trips, audio/duration mismatch, re-audit rules).
- Brand/client assumptions: ~10% references the Europ’Équipement build as the running example.
- Planned action: distill the generic pitfalls into `packages/renderer/docs` (failure modes). Do not copy the files.
- Target destination: `packages/renderer/docs/remotion-failure-modes.md`.

### `src/lib/anim.ts` — `reuse`

- Purpose: spring presets (`SMOOTH`/`SNAPPY`/`GENTLE`), `useSceneTransition`, `useReveal`, `ramp`.
- Imports: `remotion` only (`Easing`, `interpolate`, `spring`, `useCurrentFrame`, `useVideoConfig`).
- Runtime deps: `remotion`.
- Static assets: none.
- Browser-only assumptions: uses Remotion hooks (browser/React render context).
- Node-only assumptions: none.
- Brand/client assumptions: none (comments mention “shield / check reveal” — drop the comment).
- Client-specific assumptions: none.
- Planned action: copy essentially verbatim; strip donor-specific comments; keep as frame-driven, deterministic (no `Date.now()`/`Math.random()`).
- Target destination: `packages/renderer/src/animation/anim.ts`.

### `src/font.ts` — `adapt`

- Purpose: load Inter via `@remotion/google-fonts/Inter`; export `fontFamily_Inter`.
- Imports: `@remotion/google-fonts/Inter`.
- Runtime deps: `@remotion/google-fonts`.
- Brand/client assumptions: Inter is a neutral default, but a single hardcoded font is a hidden global. Fonts must become theme-driven, not a baked module-level constant.
- Planned action: adapt into a font-loading helper that resolves a family name from the theme (with a validated allow-list of bundled Google Fonts), defaulting to Inter. Avoid remote runtime downloads beyond Remotion’s own font fetch at build/render time (fonts are bundled by `@remotion/google-fonts`).
- Target destination: `packages/renderer/src/assets/fonts.ts`.

### `src/vfx.ts` — `reuse`

- Purpose: `VFX_INTENSITY` knob + `vfx()` scaler.
- Imports: none.
- Brand/client assumptions: none.
- Planned action: copy verbatim; keep as a pure, deterministic scaler.
- Target destination: `packages/renderer/src/animation/vfx.ts`.

### `src/components/OptionalAudio.tsx` — `adapt`

- Purpose: `<Audio>` wrapper that no-ops on missing files to avoid the media-bunny 404.
- Imports: `react`, `remotion` (`Audio`, `staticFile`), dynamic `@remotion/studio`.
- Runtime deps: `remotion`; dynamic `@remotion/studio` (NOT in donor `package.json` — implicit dependency provided by the Remotion runtime).
- Browser-only assumptions: React effects, Remotion static-files API.
- Brand/client assumptions: none.
- Planned action: adapt to honor the target `MissingAssetBehavior` (`ignore`/`warn`/`error`): in Studio, missing optional audio warns/no-ops; missing required audio (narration) errors; in production render, any required missing audio errors loudly. Replace the dynamic `@remotion/studio` import with a safe, typed boundary so `@remotion/studio` is an explicit optional peer dependency.
- Target destination: `packages/renderer/src/audio/OptionalAudio.tsx`.

### `src/components/{Caption,Card,FlowArrow,Timeline,BrowserFrame,DecisionMatrix,SubtitleBar,IndustrialBackground}.tsx` — `rewrite`

- Purpose: themed UI primitives.
- Imports: `remotion`, donor `tokens.ts`, donor `anim.ts`.
- Brand/client assumptions: all styled with the industrial/red Europ’Équipement look; read brand colors from `tokens.ts`.
- Planned action: do not copy. Reimplement generic equivalents as needed in PR 1B from validated themes. PR 1A needs none of these.
- Target destination: none in PR 1A.

### `src/components/Icon.tsx` — `rewrite` / `exclude`

- Purpose: CSS/SVG icon set.
- Brand/client assumptions: `IconName` union is the Europ’Équipement video’s concepts (`wordpress | ovh | nas | codex | …`).
- Planned action: exclude the union; a generic icon registry is a PR 1B concern.
- Target destination: none in PR 1A.

### `src/components/EELogo.tsx` — `exclude` (`client-specific`)

- Purpose: Europ’Équipement logo.
- Client-specific assumptions: hardcoded `staticFile("europ-equipement/logo/...")` and wordmark.
- Planned action: do not copy.
- Target destination: none.

### `src/scenes/EuropEquipementGuide.tsx` + all 14 scene files — `exclude` (`client-specific`)

- Purpose: the actual client video; hard-imports 12 scenes and hardcoded asset paths.
- Client-specific assumptions: all content, French script, brand, timeline.
- Planned action: do not copy.
- Target destination: none.

### `src/scenes/SceneShell.tsx` — `rewrite`

- Purpose: shared scene wrapper (industrial bg, header, enter/exit envelope, red-line wipe).
- Brand/client assumptions: industrial/red styling.
- Planned action: do not copy; the scene-shell pattern is reimplemented generically in PR 1B from validated themes.
- Target destination: none in PR 1A.

### `src/data/scenes.ts` — `exclude` (`client-specific`)

- Purpose: the full French script and 12-scene data.
- Planned action: do not copy.
- Target destination: none.

### `src/styles/tokens.ts` — `rewrite`

- Purpose: design tokens (top half) + brand-locked colors and the 12-scene timeline (bottom half).
- Brand/client assumptions: red `#e30613` etc. “locked to the brief”; `sceneOrder`/`sceneDurationsFrames` are the 12 specific scenes.
- Planned action: do not copy. Reuse the token **categories** (colors, typography, spacing, radii, shadows, timing) as the shape of a validated `VideoTheme`. Brand values become explicit example themes. The 12-scene timeline block is excluded entirely.
- Target destination: `packages/renderer/src/themes/theme-schema.ts` (shape) + `packages/renderer/src/themes/examples.ts` (neutral example themes).

### `src/projects/starter/Starter.tsx` — `adapt`

- Purpose: props-driven, Zod-schema’d title-card composition.
- Imports: `remotion`, `zod`, `@remotion/zod-types` (`zColor`), donor `font`, donor `anim`.
- Brand/client assumptions: hardcoded dark background `#0b0e14` and `#f4f6fb` text; `accent` passed via props (good).
- Planned action: adapt into the generic starter fixture: keep the Zod-schema + `useReveal` pattern; drive background/text from the validated theme; target 1080×1920 @30fps; add `calculateMetadata`; deterministic; no client content.
- Target destination: `packages/renderer/src/compositions/starter/StartComposition.tsx` + schema.

### `src/projects/starter/narration.json` — `rewrite`

- Purpose: ElevenLabs narration config template.
- Client-specific assumptions: donor uses donor voice ids.
- Planned action: do not copy. The fixture must not require ElevenLabs; narration is optional in PR 1A. A voiceover manifest/provider boundary is PR 1B.
- Target destination: none in PR 1A (mock-only voiceover CLI structure only).

### `scripts/generate-sfx.mjs` — `reuse`

- Purpose: zero-dependency offline 16-bit PCM WAV synthesizer; writes `public/sfx/*.wav`.
- Imports: `node:fs`, `node:path`, `node:url`.
- Runtime/dev deps: none.
- Node-only assumptions: Node fs/path.
- Brand/client assumptions: none (generic whoosh/chime/success/click).
- Planned action: copy essentially verbatim into `scripts/media/generate-sfx.mjs`; regenerate SFX locally (do not copy donor WAVs).
- Target destination: `scripts/media/generate-sfx.mjs`.

### `scripts/generate-voiceover.mjs` — `adapt`

- Purpose: ElevenLabs TTS driven by `src/projects/<project>/narration.json`; writes MP3s and flips `enabled`.
- Imports: `node:fs`, `node:path`, `node:url`.
- Node-only assumptions: Node fs/path, `fetch`.
- Brand/client assumptions: none (project-agnostic by design).
- Secret assumptions: reads `ELEVENLABS_API_KEY` from env or `.env.local`.
- Known pitfall: round-trips the JSON and clobbers unknown fields on first run; flips `enabled`.
- Planned action: adapt into a safe CLI structure behind a `VoiceProvider` boundary (mock + ElevenLabs adapter). PR 1A ships the mock-only path so the fixture render needs no key; the ElevenLabs adapter + validated voiceover manifest are PR 1B. Never put credentials into code or manifests.
- Target destination: `packages/renderer/src/audio/voice/` (provider boundary) + `scripts/media/generate-voiceover.mjs` (CLI).

### `public/sfx/*.wav` — `generated`

- Planned action: regenerate via the SFX script; do not copy donor WAVs.
- Target destination: `apps/remotion-studio/public/sfx/` (generated locally; see artifact limits).

### `public/europ-equipement/**`, `public/starter/voiceover/**` — `exclude` (`client-specific` / `generated`)

- Planned action: do not copy.
- Target destination: none.

### `.env.local` — `secret`

- Planned action: never read, print, copy, or commit. The fixture pipeline must not require any key.
- Target destination: none.

### `README_VIDEO.md`, `docs/MISSING_CLIENT_ASSETS.md`, `PROMPTS/**`, `REVIEW/**` — `exclude` (`client-specific`)

- Planned action: do not copy.
- Target destination: none.

### `out/**` — `exclude` (`generated`)

- Planned action: do not copy generated renders.
- Target destination: none.

### `node_modules/`, `package-lock.json` — `exclude`

- Planned action: do not copy; target uses pnpm with a frozen lockfile.

## Explicitly excluded Europ’Équipement material

The following must not appear in renderer code or assets. After implementation, the
renderer source is searched for `Europ`, `Equipement`, `Équipement`, `EELogo`, and
`e30613`; any occurrence must be justified, and normally there should be none.

- `src/scenes/EuropEquipementGuide.tsx` and all 14 scene files
- `src/components/EELogo.tsx`
- `src/data/scenes.ts`
- `src/projects/europ-equipement/narration.json`
- `public/europ-equipement/**` (logo, voiceover MP3s, audio bed, screenshots)
- The brand color block in `src/styles/tokens.ts` (`#e30613`, `#a9000a`, `#050505`, `#151515`, `#a9adb2`)
- The 12-scene timeline block in `src/styles/tokens.ts` (`sceneOrder`, `sceneDurationsFrames`, `sceneSchedule*`, `totalDurationFrames`)
- The client-specific `IconName` union in `src/components/Icon.tsx`
- `README_VIDEO.md`, `docs/MISSING_CLIENT_ASSETS.md`, `PROMPTS/**`, `REVIEW/**`

## Migration record (actual)

| Donor file | Classification | Action | Target |
|---|---|---|---|
| `package.json` | document-only | reference only | — |
| `index.ts` | adapt | copied pattern | `apps/remotion-studio/src/index.ts` |
| `remotion.config.ts` | adapt | copied + adapted entry | `apps/remotion-studio/remotion.config.ts` |
| `CLAUDE.md`/`AGENTS.md` | document-only | distilled pitfalls | `packages/renderer/docs/failure-modes.md` |
| `src/lib/anim.ts` | reuse | copied verbatim (stripped comments) | `packages/renderer/src/animation/anim.ts` |
| `src/font.ts` | adapt | theme-driven font helper | `packages/renderer/src/assets/fonts.ts` |
| `src/vfx.ts` | reuse | copied verbatim | `packages/renderer/src/animation/vfx.ts` |
| `src/components/OptionalAudio.tsx` | adapt | added `MissingAssetBehavior`; removed dynamic `@remotion/studio` import in favor of `AudioConfigProvider` | `packages/renderer/src/audio/OptionalAudio.tsx` |
| `src/styles/tokens.ts` | rewrite | reused token categories only as the `VideoTheme` shape; brand values and 12-scene timeline excluded | `packages/renderer/src/themes/*` |
| `src/projects/starter/Starter.tsx` | adapt | theme-driven 9:16 fixture with `calculateMetadata` | `packages/renderer/src/compositions/starter/*` |
| `scripts/generate-sfx.mjs` | reuse | copied; `Math.random()` noise replaced with a deterministic LCG | `scripts/media/generate-sfx.mjs` |
| `scripts/generate-voiceover.mjs` | adapt | safe CLI with mock provider only; no key required | `scripts/media/generate-voiceover.mjs` |
| `@remotion/zod-types` (donor dep) | exclude | dropped to avoid a duplicate `zod` (its peer hard-pins `zod@4.3.6` while the workspace uses `4.4.3`); `zColor` replaced with a custom `colorSchema` hex validator | — |
| All Europ’Équipement files | exclude/client-specific | none | — |
| `.env.local` | secret | none | — |
| `out/**`, `node_modules/`, `package-lock.json` | exclude | none | — |