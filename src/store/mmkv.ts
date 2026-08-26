import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// react-native-mmkv v4's real API is `createMMKV({ id })`, not `new MMKV()` — see
// node_modules/react-native-mmkv/lib/specs/MMKV.nitro.d.ts (methods are
// getString/set/remove, not getString/set/delete).
//
// Shared by every persisted zustand store (`prefs`, the M2 Task 4 order draft, ...)
// so each gets its own MMKV instance (keyed by `id`, avoiding key collisions between
// stores) while reusing the same `StateStorage` adapter code instead of re-deriving it.
export function mmkvStorage(id: string) {
  const mmkv = createMMKV({ id });
  const storage: StateStorage = {
    getItem: (k) => mmkv.getString(k) ?? null,
    setItem: (k, v) => mmkv.set(k, v),
    removeItem: (k) => mmkv.remove(k),
  };
  return createJSONStorage(() => storage);
}
