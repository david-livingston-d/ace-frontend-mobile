import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { deliveryApi } from './api';

// Not consumed by any screen in M2 (DeliveryNoteDetail is still a placeholder) —
// declared now so M3's real screen doesn't need to touch this module.
export function useDeliveryNote(id: string) {
  return useQuery({ queryKey: keys.deliveryNote(id), queryFn: () => deliveryApi.get(id) });
}
