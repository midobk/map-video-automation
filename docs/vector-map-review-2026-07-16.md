# Vector-map renderer review report — 2026-07-16

## Scope

This report records the independent review and remediation of PR #8, the first
vector-map rendering increment. The original branch was based on `main` before
the renderer-stabilization PR #7 and could not be merged safely without replaying
the feature on the stabilized runtime.

## Findings

### 1. Stale branch could regress renderer stabilization

The original branch conflicted with current `main` and touched caption rendering,
scene scheduling, and visual-regression files repaired by PR #7.

**Resolution:** the feature branch was rebuilt from current `main`. Vector-map
work was reapplied without restoring hardcoded caption timing, English-only
caption direction, missing caption-space reservation, or the obsolete
selected-frame script.

### 2. Later map scenes used absolute frames for local animation

`useCurrentFrame()` is relative to the surrounding Remotion `Sequence`, but the
original zoom interpolation subtracted each scene's absolute composition start.
Only the first map scene could progress correctly.

**Resolution:** `resolveMapZoomProgress()` consumes scene-local frames only.
Country-zoom visual regression captures Morocco, Canada, Algeria, and France in
later sequences and requires the selected frames to be distinct.

### 3. Geography validation was not fail-closed

Lowercase and unknown ISO3 codes were accepted, unknown countries were silently
ignored during topology lookup, and label coordinates were not bounded.

**Resolution:** map plans now require known uppercase ISO 3166-1 alpha-3 codes,
reject duplicate country codes, and constrain longitude to -180..180 and latitude
to -90..90. The committed ISO dictionary is generated directly from the pinned
world-atlas feature names, checked deterministically, and topology lookup throws
instead of silently dropping a validated country.

### 4. Geo manifest generation was non-deterministic

The original generated manifest embedded the current timestamp, changing a
committed file on every run.

**Resolution:** the manifest contains only stable package metadata and SHA-256
checksums. `pnpm geo:check` regenerates both the dictionary and manifest in memory
and fails when either committed file is stale.

### 5. Orthographic focus could remain on the hidden hemisphere

Fitting an orthographic projection without first rotating to the selected
feature can clip countries on the far side of the globe.

**Resolution:** orthographic focus fitting rotates to the geographic centroid
before calculating scale and translation. Canada is rendered with the
orthographic projection in the committed fixture and is covered by unit and
visual-regression checks.

### 6. Generated metadata admitted a non-ISO placeholder

The pinned metadata package represents Kosovo with `UNK`, which matches the
three-uppercase-character shape but is not an ISO 3166-1 alpha-3 assignment.
That placeholder entered the validator dictionary and made `UNK` appear valid.

**Resolution:** generation excludes known non-ISO placeholders before committing
the dictionary. The generated dictionary no longer contains Kosovo/`UNK`, and
schema and geography tests explicitly reject it.

### 7. A map highlight could omit every map source

Because the legacy static asset and all vector fields were optional/defaulted, a
scene containing only presentation labels such as `highlighted: ['Canada']`
could validate and render a generic world map without the claimed highlight.

**Resolution:** every map-highlight scene must provide either a static `mapAsset`
or explicit vector geography through focus countries, context countries, or map
labels. A completely source-free highlight is rejected at the semantic schema
gate, while legacy static maps and labels-only world maps remain supported.

## Additional hardening

- Vector-map theme colors are runtime-validated.
- The stat-card scene uses the stabilized caption presentation and reserved
  caption envelope.
- Static-map plans remain backward compatible.
- New fixture MP4s are rendered, probed, uploaded, and inspected in CI.
- The current frame-regression script is extended rather than replaced.
- Publishing, production credentials, and cloud database state remain untouched.

## Merge gate

PR #8 may merge only after the current head passes frozen install, lint,
typecheck, tests, build, deterministic geo-data verification, Gitleaks,
clean Supabase reset, all five fixture renders, MP4 probing, selected-frame
regression, Vercel, and a final independent review with no unresolved findings.
