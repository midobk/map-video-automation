import { mapVideoPlanSchema } from '../compositions/map-video/map-video-schema';
import { neutralDarkTheme } from '../themes/examples';
import type { MapVideoPlan } from '../compositions/map-video/map-video-schema';

export const rtlMapVideoFixtureName = 'map-video-rtl' as const;

/**
 * Arabic/RTL map-video fixture.
 *
 * Verifies Arabic shaping, right-to-left directionality, line wrapping, and
 * caption safe areas. Uses neutral geography only.
 */
export const rtlMapVideoFixture: MapVideoPlan = mapVideoPlanSchema.parse({
  theme: neutralDarkTheme,
  projectId: 'rtl-map',
  transitionSeconds: 0.5,
  scenes: [
    {
      id: 'rtl-intro',
      kind: 'title',
      durationSeconds: 2.5,
      title: 'خريطة الفيديو',
      subtitle: 'قارات العالم والمحيطات',
      eyebrow: 'RTL Fixture',
    },
    {
      id: 'rtl-continents',
      kind: 'map-highlight',
      durationSeconds: 3,
      label: 'القارات',
      highlighted: [
        'أفريقيا',
        'آسيا',
        'أمريكا الشمالية',
        'أمريكا الجنوبية',
        'أنتاركتيكا',
        'أوقيانوسيا',
      ],
      projection: 'natural-earth',
      focusIsoCodes: [],
      contextIsoCodes: [],
      labels: [
        { text: 'أفريقيا', longitude: 20, latitude: 5 },
        { text: 'آسيا', longitude: 90, latitude: 45 },
        { text: 'أمريكا الشمالية', longitude: -100, latitude: 50 },
        { text: 'أمريكا الجنوبية', longitude: -60, latitude: -15 },
        { text: 'أنتاركتيكا', longitude: 0, latitude: -80 },
        { text: 'أوقيانوسيا', longitude: 135, latitude: -25 },
      ],
      caption: 'تغطي القارات حوالي 29٪ من سطح الأرض.',
    },
    {
      id: 'rtl-comparison',
      kind: 'comparison',
      durationSeconds: 2.5,
      title: 'اليابسة والماء',
      left: { label: 'اليابسة', value: '٢٩٪' },
      right: { label: 'المحيطات', value: '٧١٪' },
      caption: 'المحيطات تهيمن على كوكب الأرض.',
    },
    {
      id: 'rtl-outro',
      kind: 'outro',
      durationSeconds: 2,
      title: 'استكشف المزيد',
      subtitle: 'جغرافيا محايدة، تُعرض بشكل حتمي',
    },
  ],
});
