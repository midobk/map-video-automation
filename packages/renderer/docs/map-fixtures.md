# Map fixtures

## Neutral fixture

`map-video-neutral.ts` is a deterministic, public-domain plan that exercises:

- title, map-highlight, ranking, comparison, caption, outro scenes
- English and French captions
- a static abstract world map from `apps/remotion-studio/public/fixtures/maps/world.svg`

## RTL fixture

`map-video-rtl.ts` is the same plan translated into Arabic with `direction: rtl`,
covering line-splitting and layout mirroring.

## Asset

`world.svg` is a public-domain abstract geography graphic. `LICENSE.md` in the
same directory records the source and license.
