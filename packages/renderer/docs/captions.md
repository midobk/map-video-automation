# Caption system

## Responsibility

Render optional multilingual captions inside the 1080×1920 safe area with
deterministic line splitting, timing, text direction, layout reservation, and
safe fade envelopes.

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

`resolveCaptionFadeEnvelope()` uses the normal eight-frame fades when sufficient
frames are available and shortens them when required to keep Remotion's
interpolation points strictly increasing. One- and two-frame scenes use full
opacity within their enclosing sequence because no valid four-point fade
envelope can fit in those windows.

## Splitting, direction, and layout

`splitCaptionText()` wraps on word boundaries according to the selected language
budget. `captionDirection()` maps Arabic to `rtl` and English/French to `ltr`.
`CaptionStrip` applies the resolved `dir`, alignment, line splitting, safe-area
position, and duration-aware fade envelope.

Captioned scenes reserve the strip's maximum vertical envelope in `SceneShell`,
preventing map chips, cards, and other normal content from rendering beneath it.

The full-frame `caption` scene uses the same language metadata for its text
direction and alignment.
