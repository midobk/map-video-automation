# Renderer stabilization report — 2026-07-15

## Why this work exists

Renderer PRs #4 and #5 were merged before their automated reviews completed.
Both pull-request heads had green checks, but the reviews finished after merge
and reported six valid P2 findings. The defects therefore existed on `main` even
though CI and Vercel were green.

During PR #7 visual inspection, two additional validation defects were found:
the selected-frame script always rendered frame 0, and bottom caption strips
overlaid normal scene content. Those findings are included in this stabilization
rather than being deferred.

The independent review of PR #7 then found a ninth edge case: very short valid
scenes could produce duplicate or reversed caption-fade interpolation points.
That finding is also repaired in this PR before merge.

This report is the repository record for issue #6 and PR #7.

## Findings and remediation

### 1. Browser-safe asset manifests did not enforce declared media type

`validateAssetManifest()` normalized paths and checked duplicates but did not
call `validateAssetType()`. A `.txt` file declared as audio could pass the
one-step browser-safe gate.

**Fix:** normalize first, validate every normalized extension against its
declared type, then reject duplicate normalized paths.

### 2. Narration line identifiers could escape the voiceover folder

The voiceover generator used project and line identifiers directly in
`resolve()` calls. Separators or absolute-path syntax in configuration could
write outside `public/<project>/voiceover/`.

**Fix:** require project and line identifiers to be one safe path segment before
any synthesis or file write. The accepted form is 1-64 ASCII letters, numbers,
underscores, or hyphens, beginning with an alphanumeric character.

### 3. MP3 bytes could be interpreted as a WAV header

The ElevenLabs adapter intentionally returned zero duration for callers to
measure. The CLI then used the WAV-header estimator for every zero-duration
result, including MP3.

**Fix:** keep provider-reported positive values, permit WAV-header fallback only
for WAV, and measure compressed or malformed output from the written file with
`ffprobe` through a server-only package export.

### 4. Transition overlap could move the schedule cursor backward

The plan schema allowed scenes shorter than the requested transition. The old
scheduler subtracted the full transition at each boundary, allowing negative or
reversed start frames.

**Fix:** convert durations to frames once and bound each overlap by both adjacent
scene lengths so every boundary advances by at least one frame. Composition
duration is derived from the same final schedule.

### 5. Arabic captions were rendered with English direction metadata

Several scene renderers hardcoded `language="en"`. The Arabic fixture therefore
contained Arabic strings but still used LTR splitting and direction.

**Fix:** add optional `captionLanguage` to the validated base scene, default
omitted legacy plans to English at presentation time, propagate the resolved
language through every caption strip, and mark every RTL fixture scene as
Arabic. The full-frame caption scene uses the same direction metadata.

### 6. Captions used a hidden four-second window

Title, ranking, comparison, and outro scenes used `endFrame={120}`. Valid scenes
longer than four seconds silently lost their captions.

**Fix:** centralize scene-caption presentation and calculate the end frame from
the validated scene duration and fixed map-video FPS.

### 7. Visual-regression commands silently rendered frame 0

The script passed the requested frame as an unsupported fourth positional
argument. Remotion ignored it and used the default frame 0, so each composition's
three supposedly distinct snapshots were actually the same first frame.

**Fix:** pass the documented `--frame=<number>` flag. CI now uploads the actual
first, middle, and final selected frames for visual inspection and compares two
renders of each requested frame for byte determinism.

### 8. Caption strips overlaid normal scene content

The caption strip is absolutely positioned near the bottom of the 9:16 frame,
but the generic scene content area did not reserve the strip's maximum envelope.
Region chips and comparison cards could render beneath English and Arabic
captions.

**Fix:** `SceneShell` now reserves bottom space based on the caption layout's
maximum line count, line height, padding, bottom offset, and a fixed visual gap.
Every scene that renders a bottom caption opts into this reservation.

### 9. Short scenes could create invalid caption-fade ranges

The caption strip used fixed eight-frame fade-in and fade-out points. For a
three-frame scene this produced a non-monotonic interpolation range such as
`[0, 8, -5, 3]`; sixteen-frame scenes produced duplicate middle points. The
scene schema permits such short positive durations.

**Fix:** `resolveCaptionFadeEnvelope()` limits each fade to the available frame
window while keeping all interpolation points strictly increasing. One- and
two-frame scenes cannot support a four-point envelope, so they render the
caption at full opacity for the lifetime of their enclosing sequence instead of
calling `interpolate()` with invalid points.

## Regression coverage

The stabilization branch adds coverage for:

- mismatched media type in the browser-safe manifest gate;
- duplicates that appear only after path normalization;
- unsafe project and narration output identifiers;
- MP3 duration fallback invoking a media probe;
- provider-reported duration bypassing the probe;
- transitions longer than adjacent scenes;
- supported and unsupported caption languages;
- Arabic fixture language metadata;
- ten-second caption windows and legacy English fallback;
- scene-shell caption-space calculation;
- real selected-frame rendering through Remotion's `--frame` option;
- normal eight-frame caption fades;
- strictly increasing three-frame fade points;
- full-opacity fallback for one- and two-frame scenes;
- the sixteen-frame duplicate-point boundary.

## Process control added

`AGENTS.md` now states that a pull request must not merge while CI, deployment
checks, or independent review are pending. The reviewed commit must still be the
current head, and every valid finding and thread must be addressed before merge.

A green head before review completion is not merge approval.

## Validation status

PR #7 remains unmerged until the final post-review head passes all repository CI
jobs, normal and RTL fixture rendering, selected-frame visual regression,
Vercel preview, manual frame inspection, and review-thread verification. Results
are recorded in the PR conversation rather than being predicted here.

## Scope boundaries

- No production database migration.
- No provider credential is added.
- No publishing adapter or social-platform action is enabled.
- Existing mock modes and the publishing kill switch remain unchanged.
