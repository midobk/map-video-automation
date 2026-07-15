# Donor extraction decisions

The donor project at `~/Desktop/remotion-studio/` is a source of reusable
patterns and utilities, not an architecture to copy wholesale. The full per-file
audit lives at [`docs/remotion-donor-audit.md`](../../../docs/remotion-donor-audit.md).

## Copied (reuse) — minimal adaptation

- `src/lib/anim.ts` → `src/animation/anim.ts`. Copied verbatim; donor-specific
  comments stripped. Frame-driven, deterministic.
- `src/vfx.ts` → `src/animation/vfx.ts`. Copied verbatim.
- `scripts/generate-sfx.mjs` → `scripts/media/generate-sfx.mjs`. Copied; the
  `Math.random()` noise sources replaced with a deterministic LCG so generated
  SFX are reproducible.

## Adapted

- `src/font.ts` → `src/assets/fonts.ts`. The donor's single hardcoded Inter
  module constant became a theme-driven `resolveFontFamily` with an
  `ALLOWED_FONTS` allow-list, so fonts are not a hidden global.
- `src/components/OptionalAudio.tsx` → `src/audio/OptionalAudio.tsx`. Rewired
  to honor `MissingAssetBehavior`. The dynamic `@remotion/studio` import was
  removed; the file-existence probe is injected through `AudioConfigProvider`,
  so `@remotion/studio` is no longer an implicit renderer dependency.
- `src/projects/starter/Starter.tsx` → `src/compositions/starter/`. Kept the
  Zod-schema + `useReveal` pattern; retargeted to 1080×1920 @30fps; colors now
  come from the validated `VideoTheme` instead of hardcoded hexes; added
  `calculateMetadata` for duration derivation.
- `scripts/generate-voiceover.mjs` → `scripts/media/generate-voiceover.mjs`.
  Adapted into a safe CLI with a mock provider; the fixture render no longer
  requires ElevenLabs. The ElevenLabs adapter and validated manifest are PR 1B.

## Used as a pattern, then rewritten

- `src/styles/tokens.ts` → `src/themes/`. Only the token *categories*
  (colors, typography, spacing, radii) were reused, as the shape of the
  validated `VideoTheme`. Brand values and the 12-scene timeline were excluded.
  Neutral example themes replace brand tokens.

## Document-only

- `CLAUDE.md` / `AGENTS.md` pitfalls → `docs/failure-modes.md`.

## Excluded (client-specific / secret / generated)

- Every Europ’Équipement scene, `EELogo.tsx`, `src/data/scenes.ts`, the
  `europ-equipement` narration and assets, the brand color block (`#e30613`
  etc.), the 12-scene timeline, the client-specific `Icon` union.
- `.env.local` (secret — never copied).
- `out/**`, `node_modules/`, `package-lock.json` (generated / build state).

## Verification

After implementation the renderer source was searched for `Europ`,
`Equipement`, `Équipement`, `EELogo`, and `e30613`; none are present.