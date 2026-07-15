import { describe, expect, it } from 'vitest';
import { CAPTION_LAYOUT } from '../src/captions/layout';
import {
  SCENE_SHELL_PADDING,
  sceneShellPaddingBottom,
} from '../src/scenes/SceneShell';

describe('caption layout reservation', () => {
  it('keeps the normal bottom padding when no caption strip exists', () => {
    expect(sceneShellPaddingBottom(false)).toBe(SCENE_SHELL_PADDING.bottom);
  });

  it('reserves more space than the maximum caption envelope', () => {
    const maximumCaptionEnvelope =
      CAPTION_LAYOUT.stripBottom +
      CAPTION_LAYOUT.maxLines * CAPTION_LAYOUT.lineHeight +
      CAPTION_LAYOUT.paddingVertical * 2;

    expect(sceneShellPaddingBottom(true)).toBeGreaterThan(maximumCaptionEnvelope);
  });
});
