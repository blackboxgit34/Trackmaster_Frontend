import { API_BASE_URL } from '@/config/Api';
import { useState, useEffect, useCallback } from 'react';
import type { LiveVehicleStatus, VehicleStatus } from '@/types';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';

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

type GetVehicleStatusParams = {
  pageName: string;
  CustId?: number;
  requestModel?: DataTableRequestModel;
};
export const getVehicleStatusList = async ({
  pageName,
  CustId,
  requestModel,
}: GetVehicleStatusParams): Promise<LiveVehicleStatus[]> => {

  let params = new URLSearchParams({
    pagename: pageName,
  });

  // If request model exists → append all model params
  if (requestModel) {
    Object.entries(requestModel).forEach(([key, value]) => {
      params.append(key, String(value ?? ""));
    });
  }

  // If only userId is passed
  if (CustId) {
    params.append("CustId", String(CustId));
  }

  const url = `${API_BASE_URL}/VehicleStatus/GetvehicleStatusList?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch vehicle data");
  }

  const result = await response.json();
debugger
  return result.data.map((item: any) => ({
    
    id: item.vehName,
    vehicleNo: item.vehName,
    type: item.type || 'Other',
    model: item.model || '',
    status: item.vehicleStatus as VehicleStatus,
    lat: Number(item.lat),
    lng: Number(item.lng),
    speed: Number(item.speed),
    location: item.location || '',
    lastUpdated: item.lastUpdated || '',
    bbid: item.bbid || '',
    workingHours: 0,
    idlingHours: 12.5,
    fuelConsumed: 0,
    gsmSignal: item.gsmSignal,
    deviceSignal: item.gpsAntConStatus,
    GPSFix: item.gpsFix,
    battery:  item.vehBattery,
    gpsDeviceBattery:  item.deviceBattery,
    alerts: 0,
    errors: 0,
    alertDetails: [],
    errorDetails: [],
    distance: 0,
    fuelLevel: 0,
    fuelLiters: 0,
    fuelTankCapacity: 0,
    engineTemp: 0,
    hydraulicTemp: 0,
    acStatus: 'Off',
    ignitionStatus: item.IgnitionStatus,
  }));
};

