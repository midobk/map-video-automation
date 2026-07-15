import type { VideoTheme } from './theme-schema';

/**
 * Neutral, brand-free example themes. These are starting points, not the
 * platform's identity. Real videos pass their own validated theme through
 * composition props. No client brand colors live in this package.
 */

export const neutralDarkTheme: VideoTheme = {
  colors: {
    background: '#0b0e14',
    surface: '#141925',
    primary: '#4f8cff',
    accent: '#4f8cff',
    text: '#f4f6fb',
    mutedText: '#9aa6b8',
  },
  map: {
    ocean: '#0b0e14',
    land: '#1c2230',
    border: '#3d4a63',
    highlight: '#4f8cff',
    label: '#f4f6fb',
  },
  typography: {
    headingFamily: 'Inter',
    bodyFamily: 'Inter',
  },
  borderRadius: 20,
  spacingScale: 8,
};

export const neutralLightTheme: VideoTheme = {
  colors: {
    background: '#f5f7fa',
    surface: '#ffffff',
    primary: '#2b6cb0',
    accent: '#2b6cb0',
    text: '#1a202c',
    mutedText: '#718096',
  },
  map: {
    ocean: '#e8eef5',
    land: '#ffffff',
    border: '#a0aec0',
    highlight: '#2b6cb0',
    label: '#1a202c',
  },
  typography: {
    headingFamily: 'Inter',
    bodyFamily: 'Inter',
  },
  borderRadius: 16,
  spacingScale: 8,
};

export const exampleThemes = {
  'neutral-dark': neutralDarkTheme,
  'neutral-light': neutralLightTheme,
} as const;

export type ExampleThemeId = keyof typeof exampleThemes;
