const SAFE_VOICEOVER_PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;

export class UnsafeVoiceoverPathSegmentError extends Error {
  constructor(
    readonly label: string,
    readonly value: string,
  ) {
    super(
      `${label} must be a single safe path segment containing only letters, numbers, underscores, or hyphens (1-64 characters).`,
    );
    this.name = 'UnsafeVoiceoverPathSegmentError';
  }
}

/**
 * Validate an identifier before it is used in a project-relative output path.
 *
 * Rejecting separators, dot segments, whitespace, and absolute-path syntax keeps
 * narration configuration from escaping the intended project/voiceover folder.
 */
export function assertSafeVoiceoverPathSegment(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SAFE_VOICEOVER_PATH_SEGMENT.test(value)) {
    throw new UnsafeVoiceoverPathSegmentError(label, String(value ?? ''));
  }
  return value;
}
