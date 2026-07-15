# Asset manifest

## Purpose

Declare every image, map, audio file, video, or font required by a render plan.
Validation is split into a browser-safe structural gate and a server-only disk
gate.

## Format

```ts
export interface AssetDeclaration {
  path: string;
  required: boolean;
  type: 'image' | 'audio' | 'video' | 'font';
  label?: string;
}
```

## Browser-safe validation

`validateAssetManifest()`:

- normalizes each path relative to Remotion `public/`;
- rejects absolute, drive-rooted, backslash, and escaping traversal paths;
- requires each normalized extension to match its declared media type;
- rejects duplicate normalized paths.

This gate uses string operations only and is safe to import into the Remotion
bundle.

## Server-only validation

`validateAssetManifestOnDisk()` adds:

- allowed-root enforcement;
- required-file existence checks;
- reporting for missing optional files;
- positive duration-metadata checks.

Invalid manifests fail before rendering; mismatched media declarations are never
accepted merely because the file exists.
