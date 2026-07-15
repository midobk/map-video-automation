# Visual regression

## Strategy

Remotion compositions are deterministic when props, timing, and assets are
fixed. Visual regression is therefore a determinism check rather than a pixel
comparison.

## Script

`scripts/visual-regression.sh` renders key frames twice and compares the output
files byte-for-byte. Identical bytes prove the renderer is stable across
identical inputs.

- The starter fixture uses `remotion still`.
- Map-video compositions use `remotion render --sequence --frames=N-N` because
  their timeline is built from nested `<Sequence>` components; the full render
  pipeline is required to evaluate the scene schedule at an arbitrary frame.

The checked frames cover the neutral fixture, the RTL fixture, the country-zoom
fixture, and the ranking fixture.

## Commands

- `pnpm remotion:render:fixture` — render the starter fixture to `out/starter/starter.mp4`
- `pnpm remotion:render:map-video` — render the neutral map-video fixture
- `pnpm remotion:render:rtl-fixture` — render the RTL fixture
- `pnpm visual-regression` — render key frames twice and assert byte equality
