import { describe, expect, it } from 'vitest';
import {
  splitCaptionText,
  measureCaptionLines,
  captionDirection,
  captionAvailableWidth,
  alignSceneVoiceover,
  alignCaptionsFromPlan,
  secondsToFrames,
  framesToSeconds,
} from '../src';
import { neutralMapVideoFixture } from '../src';

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

describe('caption alignment', () => {
  it('distributes a scene voiceover across its frame window', () => {
    const lines = alignSceneVoiceover(
      {
        id: 's1',
        kind: 'title',
        durationSeconds: 2,
        title: 'T',
        voiceoverText: 'one two three four five six seven eight',
      },
      'en',
      0,
      60,
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]!.startFrame).toBe(0);
    expect(lines[lines.length - 1]!.endFrame).toBe(60);
    expect(lines.every((line) => line.endFrame > line.startFrame)).toBe(true);
  });

  it('returns no lines when a scene has no voiceover text', () => {
    const lines = alignSceneVoiceover(
      { id: 's1', kind: 'title', durationSeconds: 2, title: 'T' },
      'en',
      0,
      60,
    );
    expect(lines).toEqual([]);
  });

  it('aligns captions for a full fixture plan', () => {
    const track = alignCaptionsFromPlan(neutralMapVideoFixture);
    expect(track.language).toBe('en');
    expect(track.lines.length).toBeGreaterThan(0);
    expect(track.lines[0]!.startFrame).toBe(0);
    expect(track.lines.every((line) => line.endFrame > line.startFrame)).toBe(true);
  });

  it('converts seconds to frames at 30 FPS', () => {
    expect(secondsToFrames(2)).toBe(60);
  });

  it('converts frames to seconds at 30 FPS', () => {
    expect(framesToSeconds(60)).toBe(2);
  });
});
