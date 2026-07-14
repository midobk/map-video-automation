# Remotion Studio public assets

This directory is served as Remotion's `public/` root for `apps/remotion-studio`.

- `sfx/` — generated UI sound effects. Run `pnpm sfx:generate` to (re)generate
  `whoosh.wav`, `chime.wav`, `success.wav`, `click.wav`. The `.wav` files are
  gitignored; regenerate them locally.
- `<project>/` — per-project static assets (logos, screenshots, voiceover).
  Per-project folders are the convention; the PR 1A fixture uses none.

Required vs optional assets and static-file rules are documented in
`packages/renderer/docs/`.