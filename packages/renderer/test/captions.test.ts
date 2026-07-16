import { describe, expect, it } from 'vitest';
import {
  splitCaptionText,
  measureCaptionLines,
  captionDirection,
  captionAvailableWidth,
  resolveCaptionFadeEnvelope,
} from '../src';
import { resolveSceneCaptionPresentation } from '../src/scenes/caption-presentation';

describe('caption splitting', () => {
  it('keeps a short sentence on one line', () => {
    expect(splitCaptionText('Short caption.', 'en')).toEqual(['Short caption.']);
  });

  it('splits a long sentence on word boundaries', () => {
    const text = 'This is a deliberately long caption that should wrap onto multiple lines.';
    const lines = splitCaptionText(text, 'en', 20);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 20)).toBe(true);
  });

  it('breaks an oversized word at the max length', () => {
    const text = 'supercalifragilisticexpialidocious';
    const lines = splitCaptionText(text, 'en', 10);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 10)).toBe(true);
  });

  it('returns an empty array for empty text', () => {
    expect(splitCaptionText('', 'en')).toEqual([]);
  });
});

describe('caption direction', () => {
  it('marks Arabic as RTL', () => {
    expect(captionDirection('ar')).toBe('rtl');
  });

  it('marks English and French as LTR', () => {
    expect(captionDirection('en')).toBe('ltr');
    expect(captionDirection('fr')).toBe('ltr');
  });
});

describe('scene caption presentation', () => {
  it('propagates Arabic and uses the complete scene duration', () => {
    const presentation = resolveSceneCaptionPresentation({
      id: 'long-arabic-title',
      kind: 'title',
      durationSeconds: 10,
      title: 'عنوان',
      caption: 'شرح عربي',
      captionLanguage: 'ar',
    });

    expect(presentation).toEqual({
      language: 'ar',
      startFrame: 0,
      endFrame: 300,
    });
  });

  it('defaults older plans without a language to English', () => {
    const presentation = resolveSceneCaptionPresentation({
      id: 'legacy-title',
      kind: 'title',
      durationSeconds: 2,
      title: 'Title',
      caption: 'Caption',
    });

    expect(presentation.language).toBe('en');
    expect(presentation.endFrame).toBe(60);
  });
});

describe('caption fade envelopes', () => {
  it('uses the normal eight-frame fades for a long scene', () => {
    expect(resolveCaptionFadeEnvelope(0, 60)).toEqual({
      inputRange: [0, 8, 52, 60],
      outputRange: [0, 1, 1, 0],
    });
  });

  it('clamps fades to a strictly increasing range for a three-frame scene', () => {
    const envelope = resolveCaptionFadeEnvelope(0, 3);
    expect(envelope).toEqual({
      inputRange: [0, 1, 2, 3],
      outputRange: [0, 1, 1, 0],
    });
    expect(envelope?.inputRange.every((value, index, values) => index === 0 || value > values[index - 1]!)).toBe(true);
  });

  it('disables fading when a one- or two-frame scene cannot support a valid envelope', () => {
    expect(resolveCaptionFadeEnvelope(0, 1)).toBeNull();
    expect(resolveCaptionFadeEnvelope(0, 2)).toBeNull();
  });

  it('never creates duplicate points at the sixteen-frame boundary', () => {
    expect(resolveCaptionFadeEnvelope(0, 16)?.inputRange).toEqual([0, 7, 9, 16]);
  });
});

describe('caption overflow detection', () => {
  it('reports that a short caption fits', () => {
    const { fits } = measureCaptionLines('Short caption.', 'en');
    expect(fits).toBe(true);
  });

  it('reports overflow for too many lines', () => {
    const longText = Array.from({ length: 200 }, () => 'word').join(' ');
    const { fits } = measureCaptionLines(longText, 'en');
    expect(fits).toBe(false);
  });

  it('reports overflow for a very long single line', () => {
    const { fits } = measureCaptionLines('a'.repeat(300), 'en');
    expect(fits).toBe(false);
  });

  it('reports that Arabic short text fits', () => {
    const { fits } = measureCaptionLines('هذه جملة قصيرة.', 'ar');
    expect(fits).toBe(true);
  });

  it('exposes a positive available width', () => {
    expect(captionAvailableWidth()).toBeGreaterThan(0);
  });
});
