# Generic composition runtime

## Registry

Compositions are registered as typed definitions in `@mapvideo/renderer` and
iterated by `apps/remotion-studio/src/Root.tsx`:

```ts
export interface CompositionDefinition<TProps> {
  id: string;
  component: React.ComponentType<TProps>;
  schema: z.ZodType<TProps>;
  calculateMetadata: CalculateMetadataFunction<TProps>;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  defaultProps: TProps;
}
```

Adding a composition requires one definition object and one registry entry.
Duplicate IDs are rejected at registration time.

## Scene-plan schema

A map-video plan is a validated object with a theme, project id, transition
length, and a list of scenes. Each scene is a discriminated union by `kind`:

- `title`
- `map-highlight`
- `ranking`
- `comparison`
- `caption`
- `outro`

Every plan is validated by `mapVideoPlanSchema` before rendering.

## Scene registry

`sceneRenderers` maps each `kind` to a React component. `MapVideoComposition`
builds a `<Sequence>` per scene from the metadata-driven schedule and delegates
to the registry. Adding a scene requires one schema, one component, and one
registry entry.

## Metadata-driven timing

Total duration is the sum of scene durations minus the transition overlap
budget. `calculateMapVideoMetadata` and `buildSceneSchedule` compute frame counts
and start frames from the validated plan; no hidden timeline constants exist.
