export const keys = {
  me: ['me'] as const,
  version: ['app-version'] as const,
  dashboard: (salesUserId?: string | null) => ['dashboard', salesUserId ?? null] as const,
  orders: (params: Record<string, unknown>) => ['orders', params] as const,
  order: (id: string) => ['order', id] as const,
};
