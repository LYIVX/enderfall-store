import { useState, useCallback } from 'react';

type LoadingState = {
  [key: string]: boolean;
};

/**
 * Custom hook to manage loading states across the application
 * 
 * @example
 * const { isLoading, startLoading, stopLoading } = useLoading();
 * 
 * // Start loading for a specific operation
 * const fetchData = async () => {
 *   startLoading('fetchData');
 *   try {
 *     await api.getData();
 *   } finally {
 *     stopLoading('fetchData');
 *   }
 * };
 * 
 * // Check if a specific operation is loading
 * return isLoading('fetchData') ? <Loading /> : <Data />;
 */
export function useLoading() {
  const [loadingState, setLoadingState] = useState<LoadingState>({});

  /**
   * Check if a specific operation is loading
   * @param key - The operation identifier
   * @returns Boolean indicating if the operation is loading
   */
  const isLoading = useCallback((key?: string) => {
    if (!key) {
      // If no key is provided, check if any operation is loading
      return Object.values(loadingState).some(Boolean);
    }
    return !!loadingState[key];
  }, [loadingState]);

  /**
   * Start loading for a specific operation
   * @param key - The operation identifier
   */
  const startLoading = useCallback((key: string) => {
    setLoadingState(prev => ({ ...prev, [key]: true }));
  }, []);

  /**
   * Stop loading for a specific operation
   * @param key - The operation identifier
   */
  const stopLoading = useCallback((key: string) => {
    setLoadingState(prev => ({ ...prev, [key]: false }));
  }, []);

  /**
   * Wrap an async function with loading state management
   * @param key - The operation identifier
   * @param fn - The async function to wrap
   * @returns The wrapped function
   */
  const withLoading = useCallback(
    <T extends any[], R>(key: string, fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R> => {
        startLoading(key);
        try {
          return await fn(...args);
        } finally {
          stopLoading(key);
        }
      };
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

export default useLoading; 