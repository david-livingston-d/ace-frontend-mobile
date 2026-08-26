import { api } from '@/lib/api/client';
import type { MeOut, TokenPair } from '@/lib/api/types';

export const authApi = {
  login: (email: string, password: string) => api.post<TokenPair>('/auth/login', { email, password }).then((r) => r.data),
  logout: (refresh_token: string) => api.post('/auth/logout', { refresh_token }).then(() => undefined),
  me: () => api.get<MeOut>('/auth/me').then((r) => r.data),
};
