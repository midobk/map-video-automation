import { createContext, useContext, type ReactNode } from 'react';
import { neutralDarkTheme } from './examples';
import type { VideoTheme } from './theme-schema';

/**
 * React context that exposes the validated theme to scene components.
 * The composition resolves the theme from its props (already validated by Zod)
 * and wraps its tree in `<ThemeProvider>`.
 */
const ThemeContext = createContext<VideoTheme>(neutralDarkTheme);

export const ThemeProvider: React.FC<{
  theme: VideoTheme;
  children: ReactNode;
}> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export function useTheme(): VideoTheme {
  return useContext(ThemeContext);
}