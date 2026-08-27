import React from 'react';
import type { MeOut } from '@/lib/api/types';
import { useMe } from '@/features/auth/hooks';

export function hasPermission(me: MeOut | undefined, code: string) {
  return !!me && (me.is_superadmin || code in me.permissions);
}

export function scopeOf(me: MeOut | undefined, code: string): string | null {
  if (!me) return null;
  if (me.is_superadmin) return 'all';
  return me.permissions[code] ?? null;
}

export function usePermission(code: string) {
  const { data } = useMe();
  return hasPermission(data, code);
}

export function useScope(code: string) {
  const { data } = useMe();
  return scopeOf(data, code);
}

export function Can({ code, children }: { code: string; children: React.ReactNode }) {
  return usePermission(code) ? <>{children}</> : null;
}
