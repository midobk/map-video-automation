/**
 * Global VFX intensity knob (0 = off, 1 = full).
 * Kept deliberately neutral: raise toward 1 for a punchier look, toward 0
 * for a calmer, minimal look. Scenes should scale effect strengths through
 * `vfx()` so a single knob dials the whole composition.
 */
export const VFX_INTENSITY = 0.85;

/** Scale an effect's strength by the global intensity. */
export const vfx = (value: number) => value * VFX_INTENSITY;