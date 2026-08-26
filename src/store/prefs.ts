import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvStorage } from './mmkv';

export type ThemePref = 'system' | 'light' | 'dark';
type Prefs = { theme: ThemePref; setTheme: (t: ThemePref) => void; dismissedVersion: string | null; dismissVersion: (v: string) => void };
export const usePrefs = create<Prefs>()(persist(
  (set) => ({ theme: 'system', setTheme: (theme) => set({ theme }), dismissedVersion: null, dismissVersion: (v) => set({ dismissedVersion: v }) }),
  { name: 'prefs', storage: mmkvStorage('prefs') },
));
