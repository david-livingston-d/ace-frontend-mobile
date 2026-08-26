import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { authApi } from './api';

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: authApi.me, staleTime: 60_000, refetchOnWindowFocus: true, retry: false });
}
