import { createContext, useContext, type ReactNode } from 'react';

import {
  paletteFor,
  type ThemeColors,
  type ThemeName,
} from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

type ThemeContextValue = {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.appearanceTheme ?? 'dark');
  const setAppearanceTheme = useSettingsStore((s) => s.setAppearanceTheme);
  const value: ThemeContextValue = {
    theme,
    colors: paletteFor(theme),
    setTheme: setAppearanceTheme,
  };
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      colors: paletteFor('dark'),
      setTheme: () => undefined,
    };
  }
  return ctx;
}
