# Visual regression

## Strategy

Remotion compositions are deterministic when props, timing, and assets are
fixed. Visual regression is therefore a determinism check rather than a pixel
comparison.

## Script

`scripts/visual-regression.sh` renders two stills for the neutral fixture and
compares the output files byte-for-byte. Identical bytes prove the renderer is
stable across identical inputs.

## Commands

- `pnpm remotion:render:fixture` — render the neutral map-video to `out/video.mp4`
- `pnpm remotion:render:rtl-fixture` — render the RTL fixture
- `pnpm visual-regression` — render two stills and assert byte equality
