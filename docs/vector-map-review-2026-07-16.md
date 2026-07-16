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
to -90..90. Topology matching uses world-atlas numeric country IDs rather than
fragile display-name equality.

### 4. Geo manifest generation was non-deterministic

The original generated manifest embedded the current timestamp, changing a
committed file on every run.

**Resolution:** the manifest contains only stable package metadata and SHA-256
checksums. `pnpm geo:check` recomputes the expected source and fails CI if the
committed manifest is stale.

### 5. Orthographic focus could remain on the hidden hemisphere

Fitting an orthographic projection without first rotating to the selected
feature can clip countries on the far side of the globe.

**Resolution:** orthographic focus fitting rotates to the geographic centroid
before calculating scale and translation. Canada is rendered with the
orthographic projection in the committed fixture and is covered by unit and
visual-regression checks.

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
typecheck, tests, build, deterministic geo-manifest verification, Gitleaks,
clean Supabase reset, all five fixture renders, MP4 probing, selected-frame
regression, Vercel, and a final independent review with no unresolved findings.
