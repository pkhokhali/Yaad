import { createContext, useContext, type ReactNode } from 'react';

import { tokensFor, type ScaleMode, type ScaleTokens } from '@/lib/ui/scale';
import { useSettingsStore } from '@/store/useSettingsStore';

type ScaleContextValue = {
  mode: ScaleMode;
  scale: ScaleTokens;
  setMode: (mode: ScaleMode) => void;
};

const ScaleContext = createContext<ScaleContextValue | null>(null);

export function ScaleProvider({ children }: { children: ReactNode }) {
  const mode = useSettingsStore((s) => s.appearanceScale ?? 'standard');
  const setAppearanceScale = useSettingsStore((s) => s.setAppearanceScale);
  const value: ScaleContextValue = {
    mode,
    scale: tokensFor(mode),
    setMode: setAppearanceScale,
  };
  return (
    <ScaleContext.Provider value={value}>{children}</ScaleContext.Provider>
  );
}

export function useScale(): ScaleContextValue {
  const ctx = useContext(ScaleContext);
  if (!ctx) {
    return {
      mode: 'standard',
      scale: tokensFor('standard'),
      setMode: () => undefined,
    };
  }
  return ctx;
}
