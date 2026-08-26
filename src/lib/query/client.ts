import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Default options will be tuned once the API
 * client and offline behaviour are designed (later task); this is a plain
 * default instance for now.
 */
export const queryClient = new QueryClient();
