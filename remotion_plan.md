# Remotion Renderer Adaptation Plan

## Purpose

Adapt the reusable shell and proven utilities from the local donor project at `~/Desktop/remotion-studio/` into the Map Video Automation repository as a generic, typed, deterministic, schema-driven Remotion renderer.

The donor project is a source of reusable patterns and utilities, not the architecture to copy wholesale. The Europ’Équipement video, branding, assets, narration, logo, scenes, hardcoded timeline, and client-specific logic must remain outside this repository.

## Source projects

### Target repository

- Repository: `midobk/map-video-automation`
- Package manager: pnpm
- Runtime: Node 22
- Architecture: TypeScript monorepo with Turborepo
- Existing renderer boundary: `packages/renderer`
- Existing web application: `apps/web`

### Donor project

- Local path: `~/Desktop/remotion-studio/`
- Remotion: 4.0.475
- React: 19
- Zod: 4.3.6
- Package manager: npm
- Git status: not a Git repository
- Secret file: `.env.local`, containing an ElevenLabs key; never read, print, copy, or commit it

The donor contains:

- A reusable Remotion shell
- A props-driven and Zod-schema-driven `Starter` composition
- Animation and spring helpers
- Optional audio behavior
- Font and VFX helpers
- Offline SFX generation
- ElevenLabs voiceover generation
- Per-project static asset conventions
- Remotion pitfalls and operator documentation
- One large, client-specific Europ’Équipement composition that must be excluded

## Non-negotiable constraints

- Do not copy `.env.local`, API keys, tokens, or credentials.
- Do not copy `node_modules`, `package-lock.json`, generated renders, or local caches.
- Do not copy Europ’Équipement text, scenes, data, branding, logo, screenshots, narration, business logic, assets, or project documentation.
- Do not introduce social publishing, production Supabase access, or OpenClaw as a runtime dependency.
- Do not silently ignore required narration or required assets.
- Do not accept unvalidated JSON as render props.
- Do not use unchecked TypeScript casts at provider, plan, manifest, or composition boundaries.
- Do not rely on remote assets, remote fonts, external APIs, current time, or unseeded randomness in deterministic fixtures.
- Do not merge an implementation agent’s own pull request.
- Do not claim rendering works without running and visually inspecting it.

## Required preflight

Before implementation:

1. Read:
   - `AGENTS.md`
   - `README.md`
   - `docs/AI_MAP_VIDEO_AUTOMATION_IMPLEMENTATION_V2.md`
   - `docs/architecture.md`
   - `docs/content-policy.md`
   - `docs/adr/*`
   - this file
2. Inspect the current Phase 0 pull request, unresolved review threads, CI results, and Vercel preview.
3. Confirm that `~/Desktop/remotion-studio/` exists and is readable.
4. If the donor directory is unavailable, stop and report the exact path and error. Do not approximate its contents from this document.
5. Confirm whether Phase 0 is merged.
6. If Phase 0 is not merged, base PR 1A on the latest reviewed Phase 0 branch, mark it as stacked, and do not merge it before Phase 0.
7. Do not weaken existing environment validation, migration validation, action pinning, or secret scanning.

## Mandatory donor audit

Before copying or rewriting donor code, create:

`docs/remotion-donor-audit.md`

For every relevant donor file, record:

- Donor path
- Purpose
- Imports
- Runtime dependencies
- Development dependencies
- Static assets required
- Browser-only assumptions
- Node-only assumptions
- Brand assumptions
- Client-specific assumptions
- Licensing concerns
- Classification
- Planned action
- Target destination

Allowed classifications:

- `reuse`
- `adapt`
- `rewrite`
- `document-only`
- `exclude`
- `secret`
- `generated`
- `client-specific`

Do not transplant a module until its imports and assumptions are classified.

The audit must explicitly identify all excluded Europ’Équipement material.

## Donor classification guidance

### Reuse with minimal adaptation

Inspect and reuse where suitable:

- `src/lib/anim.ts`
- Generic spring and animation presets
- `OptionalAudio.tsx`
- Generic `font.ts`
- Generic `vfx.ts`
- `scripts/generate-sfx.mjs`
- `scripts/generate-voiceover.mjs`
- `src/projects/starter/`
- Per-project asset conventions
- Remotion pitfalls documentation

### Reuse as a pattern, then redesign

- `SceneShell.tsx`
- Caption, Takeaway, SceneHeader, Card, Timeline, BrowserFrame, FlowArrow, and transition components
- `tokens.ts`
- Timeline organization
- Project-folder organization

### Exclude

- Every Europ’Équipement scene
- `EELogo.tsx`
- Europ’Équipement data and narration
- `public/europ-equipement/`
- Hardcoded 12-scene timeline
- Client-specific subtitle unions
- Client-specific colors, logo assumptions, screenshots, and README material

Search the resulting renderer code for `Europ`, `Equipement`, `Équipement`, `EELogo`, and `e30613`. Any occurrence must be reviewed and justified; normally there should be none.

## Target architecture

```text
apps/
  web/
  remotion-studio/
    src/
      Root.tsx
      compositions/
      previews/

packages/
  renderer/
    src/
      animation/
      assets/
      audio/
      captions/
      compositions/
      metadata/
      scenes/
      themes/
      validation/
      index.ts
    test/

scripts/
  media/
```

Authoritative rendering logic belongs in `packages/renderer`.

`apps/remotion-studio` is only the local development, preview, and visual-inspection surface.

## Dependency policy

- Start with Remotion 4.0.475 to match the donor.
- Do not change the Remotion major or minor version without explicit approval.
- Keep Node 22, React 19, pnpm, Turborepo, strict TypeScript, ESLint, Prettier, and Vitest.
- Do not import npm lock state from the donor.
- Pin every new dependency.
- Explain the need and license for each dependency.
- Verify compatibility with Node 22 and React 19.
- Avoid duplicate libraries already available in the workspace.

## Delivery strategy

Implementation is split into two pull requests.

---

# PR 1A — Reusable renderer kernel

Suggested issue title:

`Extract reusable Remotion renderer kernel`

Suggested branch:

`feat/remotion-renderer-kernel`

## Scope

Build the reusable Remotion foundation without implementing the full generic map-video runtime.

## Required deliverables

### 1. Monorepo integration

- Add the Remotion dependencies to the pnpm workspace.
- Turn `packages/renderer` into a real reusable package.
- Create `apps/remotion-studio`.
- Integrate with root TypeScript, ESLint, Vitest, Turborepo, and build commands.
- Preserve the frozen lockfile workflow.

### 2. Donor extraction

Extract or adapt:

- Animation helpers and spring presets
- Font utilities
- Generic VFX helpers
- Asset-path helpers
- Optional audio behavior
- Starter composition concepts
- Offline SFX generation
- Voiceover generation conventions
- Per-project asset structure
- Remotion pitfalls documentation

Add a migration record describing which donor files were copied, rewritten, used only as patterns, or excluded.

### 3. Generic theme

Create a validated theme model, such as:

```ts
export interface VideoTheme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
    mutedText: string;
  };
  typography: {
    headingFamily: string;
    bodyFamily: string;
  };
  borderRadius: number;
  spacingScale: number;
}
```

Brand-specific tokens must become explicit example themes, not hidden global constants.

### 4. Asset safety

Create reusable asset helpers that:

- Resolve only allowed relative static paths
- Reject path traversal
- Distinguish required and optional assets
- Validate expected asset types
- Avoid machine-specific absolute paths in plans

### 5. Audio behavior

Support:

```ts
type MissingAssetBehavior = 'ignore' | 'warn' | 'error';
```

Required defaults:

- Studio preview: `warn`
- Production render: `error`
- Required narration: `error`
- Explicitly optional SFX: `ignore` or `warn`
- Tests: `error`

Missing required narration must fail rather than silently producing an incomplete video.

### 6. Starter fixture composition

Create a generic starter composition that:

- Is props-driven
- Uses a Zod schema
- Uses `calculateMetadata`
- Renders at 1080×1920
- Uses 30 FPS
- Uses deterministic fixture data
- Requires no database, API, provider, or network access
- Contains no client-specific content

### 7. Scripts and commands

Provide commands similar to:

```bash
pnpm remotion:studio
pnpm remotion:frame:fixture
pnpm remotion:render:fixture
pnpm sfx:generate
```

Adapt the donor voiceover script into a safe CLI structure, but the fixture render must not require ElevenLabs.

### 8. Tests

Add tests for:

- Deterministic animation helpers
- Theme validation
- Composition-prop validation
- Metadata calculation
- Missing required audio
- Missing optional audio
- Invalid and traversing asset paths
- Stable fixture configuration

### 9. Documentation

Document:

- Starting Remotion Studio
- Rendering the fixture
- Asset folder conventions
- Required versus optional assets
- Static file rules
- Font loading rules
- Audio rules
- Deterministic rendering requirements
- Common Remotion failure modes
- Donor extraction decisions

## PR 1A acceptance criteria

Run successfully:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm secrets:scan
pnpm remotion:frame:fixture
pnpm remotion:render:fixture
git status --short
```

Also verify:

- The fixture is 1080×1920 and 30 FPS.
- The MP4 plays correctly.
- The first and final frames are not clipped.
- No one-frame flashes occur.
- No missing glyphs occur.
- No network access is needed.
- No proprietary or client assets are present.
- The render is visually inspected.

Do not commit large MP4 files by default. Use CI artifacts or document the generated path. Committed reference images should be minimal and optimized.

Post validation evidence, visual observations, output duration, output size, known limitations, and rollback steps on the draft PR.

Request independent review. Do not merge your own PR.

---

# PR 1B — Generic composition and scene runtime

Start only after PR 1A is reviewed, all valid findings are resolved, and PR 1A is merged.

Suggested issue title:

`Build generic schema-driven video composition runtime`

Suggested branch:

`feat/generic-video-composition-runtime`

## Required deliverables

### 1. Composition registry

Create a typed composition registry so `Root.tsx` does not manually hardcode composition details.

Example direction:

```ts
export interface CompositionDefinition<TProps> {
  id: string;
  component: React.ComponentType<TProps>;
  schema: z.ZodType<TProps>;
  calculateMetadata: CalculateMetadataFunction<TProps>;
  defaultProps: TProps;
}
```

Validate unique composition IDs.

### 2. Typed scene-plan schema

Create a discriminated union for initial scene types:

- `title`
- `map-highlight`
- `ranking`
- `comparison`
- `caption`
- `outro`

Every plan must pass runtime validation before rendering.

### 3. Scene registry

Create a typed renderer registry, such as:

```ts
const sceneRenderers = {
  title: TitleScene,
  mapHighlight: MapHighlightScene,
  ranking: RankingScene,
  comparison: ComparisonScene,
  caption: CaptionScene,
  outro: OutroScene,
} satisfies SceneRendererRegistry;
```

Adding a scene should require one schema, one component, one registry entry, and tests. It must not require editing multiple unrelated timeline files.

### 4. Metadata-driven timing

Replace hidden and hardcoded total durations.

Calculate composition duration from validated scene data:

`intro + scenes + transitions + outro`

Each scene must provide or derive its duration. Narration timing may inform duration through a validated manifest.

### 5. Caption system

Create generic caption types and rendering for:

- English
- French
- Arabic
- RTL direction
- Safe line wrapping
- Caption timing
- Maximum line lengths
- Safe-area placement
- Overflow detection

Remove any client-specific subtitle union pattern.

### 6. Voice provider boundary

Create:

```ts
interface VoiceProvider {
  synthesize(request: VoiceRequest): Promise<VoiceResult>;
}
```

Initial implementations:

- Mock provider
- ElevenLabs CLI adapter

The entire fixture pipeline must work with the mock provider.

Never put credentials into code or manifests.

### 7. Voiceover manifest

Create a validated format similar to:

```ts
interface VoiceoverManifest {
  textHash: string;
  provider: string;
  model: string;
  voiceId: string;
  audioPath: string;
  durationSeconds: number;
  generatedAt: string;
  providerRequestId?: string;
}
```

The manifest should support reproducibility and timing without exposing secrets.

### 8. Asset manifest

Require render plans to declare their assets.

Validate:

- File existence
- Allowed path roots
- Media type
- Required versus optional status
- Duplicate paths
- Missing narration
- Duration metadata
- Path traversal

### 9. Neutral map-video fixture

Create a deterministic 9:16 map-video fixture using stable, non-sensitive geography.

Allowed examples:

- Continents
- Oceans
- Neutral country-location demonstrations with undisputed fixture data

Avoid:

- Territorial disputes
- Current conflict
- Elections
- Religion or ethnicity rankings
- Crime or allegation rankings
- Dynamic current facts

Record map-data source, license, version, and checksum.

### 10. Visual regression support

At minimum include:

- Stable fixture props
- Selected-frame rendering
- Frame hashes or approved snapshots
- Documented snapshot-update procedure
- Two clean renders in the same pinned environment for determinism comparison

Document any nondeterministic pixels instead of silently accepting them.

### 11. RTL fixture

Add an Arabic/RTL fixture and verify:

- Arabic shaping
- Directionality
- Line wrapping
- Font glyph availability
- Caption safe areas
- No mixed-direction visual breakage

### 12. Tests

Add tests for:

- Invalid plans
- Unsupported scene types
- Composition registry uniqueness
- Duration calculations
- Caption overflow
- RTL behavior
- Theme validation
- Asset manifests
- Required narration failures
- Voice manifest validation
- Deterministic frame results

## PR 1B acceptance criteria

Run successfully:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm secrets:scan
pnpm remotion:frame:fixture
pnpm remotion:render:fixture
pnpm remotion:render:rtl-fixture
git status --short
```

Verify:

- No Europ’Équipement material exists in renderer code or assets.
- No external service is required for fixture rendering.
- Every composition uses runtime validation.
- Every composition uses calculated metadata.
- Missing required assets fail explicitly.
- Captions stay inside the 9:16 safe area.
- The first and last frames are correct.
- Scene transitions do not flash.
- Audio timing matches the declared duration.
- Arabic text renders correctly.
- Selected-frame results are reproducible.

Post command evidence, visual evidence, architecture decisions, known limitations, and rollback steps. Request independent review and do not merge your own PR.

## Licensing and data requirements

For every font, icon, map dataset, sound, image, and geographic asset:

- Record its source.
- Record its license.
- Confirm commercial use and redistribution rights.
- Avoid unknown or proprietary assets.
- Avoid remote runtime downloads.
- Pin dataset versions and checksums.

## Rendering environment record

Document for test renders:

- Node version
- pnpm version
- Remotion version
- Chromium version
- FFmpeg and ffprobe versions
- OS and architecture
- Font-loading behavior
- Locale and timezone assumptions
- GPU configuration when relevant

Deterministic fixtures must use fixed locale, timezone, inputs, and random seeds where applicable.

## Artifact limits

Without explicit approval:

- Do not commit generated MP4 files.
- Do not commit a single generated artifact larger than 5 MB.
- Do not increase committed fixture assets by more than 20 MB.
- Prefer optimized PNG or WebP reference frames.
- Prefer downloadable CI artifacts for renders.
- Keep CI render fixtures short enough to finish inside job timeouts.

## Stop conditions

Stop and request a decision before:

- Committing large binary assets
- Introducing a paid service
- Introducing a proprietary font
- Changing Node, React, Zod, pnpm, or Remotion major/minor versions
- Weakening environment validation or secret scanning
- Bypassing a failing render or visual regression
- Copying material with unclear client ownership or licensing
- Changing the Phase 0 architecture

## Final reporting

At the end of each PR, report:

- Issue URL
- PR URL
- Base and head commits
- Donor files reused
- Donor files redesigned
- Donor files excluded
- Dependencies added
- Architecture decisions
- Commands executed and results
- Render metadata
- Visual QA findings
- Licensing records
- Known limitations
- Rollback steps
- Recommended next milestone

Success means the repository gains a reusable Remotion renderer kernel and a generic scene-plan runtime, not a generalized copy of the Europ’Équipement video.