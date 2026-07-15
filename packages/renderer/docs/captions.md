# Caption system

## Responsibility

Render optional multi-language captions inside a safe area with automatic
line-splitting and RTL layout.

## Languages supported

- `en` — LTR
- `fr` — LTR
- `ar` — RTL

## Layout

`CaptionLayout` converts scene dimensions into a padded safe box using
`CAPTION_SAFE_AREA_PERCENTAGE` and optional explicit margins.

## Splitting

`splitCaptionLines` breaks caption text into lines that fit `maxWidth` using the
`remotion-measure` package with the configured font. It supports explicit
`\n` newlines and wraps overflowing words at safe-area edges.

## Renderer

`CaptionRenderer` applies `direction: rtl` for `ar` and positions each line in
the safe box. It is used by the `caption` scene.
