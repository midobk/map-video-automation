# Asset manifest

## Purpose

Declare every on-disk asset a composition needs (images, maps, audio). The
manifest validates paths, checks that files exist, and records them as public
URLs for Remotion.

## Format

```ts
export interface AssetDeclaration {
  id: string;
  label?: string | undefined;
  src: string;
  type: 'image' | 'audio';
}
```

## Validation

`AssetManifest` accepts allowed root directories (e.g. `apps/remotion-studio/public`).
When a manifest is committed:

- Every `src` must be inside an allowed root.
- Every `src` must exist on disk.
- IDs must be unique.
- Duplicate `src` values are coalesced with a warning, because Remotion reloads
  the same URL once.
