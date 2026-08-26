import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

// react-native-mmkv v4's real API is `createMMKV()`, not `new MMKV()` — see
// node_modules/react-native-mmkv/lib/specs/MMKV.nitro.d.ts (methods are
// getString/set/remove, not getString/set/delete).
const mmkv = createMMKV({ id: 'prefs' });
const storage: StateStorage = {
  getItem: (k) => mmkv.getString(k) ?? null,
  setItem: (k, v) => mmkv.set(k, v),
  removeItem: (k) => mmkv.remove(k),
};
export type ThemePref = 'system' | 'light' | 'dark';
type Prefs = { theme: ThemePref; setTheme: (t: ThemePref) => void; dismissedVersion: string | null; dismissVersion: (v: string) => void };
export const usePrefs = create<Prefs>()(persist(
  (set) => ({ theme: 'system', setTheme: (theme) => set({ theme }), dismissedVersion: null, dismissVersion: (v) => set({ dismissedVersion: v }) }),
  { name: 'prefs', storage: createJSONStorage(() => storage) },
));
