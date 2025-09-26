import { QueryClient } from '@tanstack/react-query';

// Optimized React Query configuration for better performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive caching for better performance
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      
      // Network optimizations
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Performance optimizations
      structuralSharing: true,
      networkMode: 'online',
    },
    mutations: {
      // Optimistic updates for better UX
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Prefetch strategies for common data
export const prefetchStrategies = {
  // Prefetch farms data on app initialization
  prefetchFarms: async (userId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['farms-optimized', userId],
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  },
  
  // Prefetch dashboard data when navigating to dashboard
  prefetchDashboard: async (farmId: string) => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: ['dashboard-summary', farmId],
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: ['feeding-metrics-optimized', farmId],
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),
    ];
    
    return Promise.allSettled(promises);
  },
  
  // Invalidate strategies for data mutations
  invalidateAfterFeedingUpdate: (farmId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['feeding-metrics-optimized', farmId],
    });
    queryClient.invalidateQueries({
      queryKey: ['dashboard-summary', farmId],
    });
    queryClient.invalidateQueries({
      queryKey: ['feeding-history-optimized', farmId],
    });
  },
  
  invalidateAfterBiometryUpdate: (farmId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['biometry-history-optimized', farmId],
    });
    queryClient.invalidateQueries({
      queryKey: ['dashboard-summary', farmId],
    });
    queryClient.invalidateQueries({
      queryKey: ['feeding-metrics-optimized', farmId],
    });
  },
  
  invalidateAfterInventoryUpdate: (farmId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['inventory-optimized', farmId],
    });
    queryClient.invalidateQueries({
      queryKey: ['feeding-metrics-optimized', farmId],
    });
  },
};