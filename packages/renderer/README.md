# @mapvideo/renderer

The authoritative Remotion rendering logic for the Map Video Automation platform.
This package contains animation helpers, asset-safety utilities, audio behavior,
validated themes, and props-driven compositions. It is consumed by
`apps/remotion-studio`, which is only the local development, preview, and
visual-inspection surface.

## Contents

- `src/animation/` — deterministic spring presets and animation helpers.
- `src/assets/` — static-path safety helpers and font loading.
- `src/audio/` — missing-asset behavior and `<OptionalAudio>`.
- `src/themes/` — the validated `VideoTheme` model and neutral example themes.
- `src/compositions/starter/` — the generic, props-driven starter fixture.
- `src/fixtures.ts` — the deterministic fixture props used by the studio.

## Commands (run from the repo root)

```bash
pnpm remotion:studio          # open Remotion Studio for the fixture
pnpm remotion:frame:fixture   # render a single still frame of the fixture
pnpm remotion:render:fixture  # render the fixture MP4
pnpm sfx:generate             # regenerate the offline SFX wav files
```

## Guides

- [Rendering guide](docs/rendering-guide.md) — Studio, rendering the fixture,
  deterministic rendering requirements, rendering environment record.
- [Assets and audio](docs/assets-and-audio.md) — asset folder conventions,
  required vs optional assets, static-file rules, font rules, audio rules.
- [Remotion failure modes](docs/failure-modes.md) — common Remotion pitfalls
  and how this renderer avoids them.
- [Donor extraction](docs/donor-extraction.md) — what was reused, rewritten, or
  excluded from the donor project.
- [Donor audit](../../docs/remotion-donor-audit.md) — the per-file donor audit.