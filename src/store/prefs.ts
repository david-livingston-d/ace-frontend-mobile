import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvStorage } from './mmkv';

export type ThemePref = 'system' | 'light' | 'dark';
type Prefs = {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  dismissedVersion: string | null;
  dismissVersion: (v: string) => void;
  /** Development-only safe-area read-out (`InsetDebugOverlay`), toggled from
   * About. Persisted like any other preference so a reload keeps it on. */
  debugInsets: boolean;
  setDebugInsets: (v: boolean) => void;
};
export const usePrefs = create<Prefs>()(persist(
  (set) => ({
    theme: 'system',
    setTheme: (theme) => set({ theme }),
    dismissedVersion: null,
    dismissVersion: (v) => set({ dismissedVersion: v }),
    debugInsets: false,
    setDebugInsets: (debugInsets) => set({ debugInsets }),
  }),
  { name: 'prefs', storage: mmkvStorage('prefs') },
));
