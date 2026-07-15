# Caption system

## Responsibility

Render optional multilingual captions inside the 1080×1920 safe area with
deterministic line splitting, timing, and text direction.

## Languages supported

- `en` — LTR
- `fr` — LTR
- `ar` — RTL

Each map-video scene may set:

```ts
captionLanguage?: 'en' | 'fr' | 'ar';
```

Omitted values remain backward-compatible and resolve to English. Arabic plans
must explicitly use `ar`; the RTL fixture pins this behavior in tests.

## Timing

`resolveSceneCaptionPresentation()` derives the caption window from the scene's
validated `durationSeconds` and the fixed map-video FPS. Scene renderers do not
use hidden four-second constants, and a caption remains active for its complete
scene-local sequence.

## Splitting and direction

`splitCaptionText()` wraps on word boundaries according to the selected language
budget. `captionDirection()` maps Arabic to `rtl` and English/French to `ltr`.
`CaptionStrip` applies the resolved `dir`, alignment, line splitting, safe-area
position, and fade envelope.

The full-frame `caption` scene uses the same language metadata for its text
direction and alignment.
