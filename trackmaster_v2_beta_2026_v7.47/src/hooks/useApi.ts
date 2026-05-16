import { API_BASE_URL } from '@/config/Api';
import { useState, useEffect, useCallback } from 'react';

type VehicleOption = {
  label: string;
  value: string;
};


// ==============================
// COMMON API HOOK
// ==============================
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


// ==============================
// VEHICLE LIST HOOK
// ==============================
export function useVehicleList() {

  const custId =
    JSON.parse(localStorage.getItem("trackmaster-auth") ?? "{}")?.custId;

  const apiCall = useCallback(async () => {

    if (!custId) return [];

    const res = await fetch(
      `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
    );

    const text = await res.text();

    if (!text) return [];

    const data = JSON.parse(text);

    const vehicles = data?.data || [];

    return [
      { label: 'All', value: 'all' },

      ...vehicles.map((v: any) => ({
        label: v.vehName,
        value: v.bbid
      }))
    ];

  }, [custId]);

  return useApi<VehicleOption[]>(apiCall);
}