import { useState, useEffect, useCallback } from 'react';

export function useApi<T>(apiCall: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    apiCall()
      .then(result => {
        setData(result);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiCall]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}