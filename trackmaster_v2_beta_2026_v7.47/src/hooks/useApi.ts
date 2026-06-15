import { API_BASE_URL } from '@/config/Api';
import { useState, useEffect, useCallback } from 'react';
import type { LiveVehicleStatus, VehicleStatus } from '@/types';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { downloadReport } from "@/lib/utils";
import { boolean } from 'zod';

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

    return vehicles.map((v: any) => ({
      label: v.vehName,
      value: v.bbid,
    }));

  }, [custId]);

  return useApi<VehicleOption[]>(apiCall);
}

// ==============================
// RAW VEHICLE LIST HOOK (for CreateFence filtering)
// ==============================
type RawVehicle = {
  vehName: string;
  bbid: string;
  type: string;
};

export function useRawVehicleList() {

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

    return data?.data || [];

  }, [custId]);

  return useApi<RawVehicle[]>(apiCall);
}

// ==============================
// VEHICLE TYPES HOOK
// ==============================
type VehicleTypeOption = {
  id: number;
  typeName: string;
};

export function useVehicleTypes() {

  const apiCall = useCallback(async () => {

    const res = await fetch(
      `${API_BASE_URL}/Dashboard/GetAllVehicleTypes`
    );

    const text = await res.text();

    if (!text) return [];

    const data = JSON.parse(text);

    return data?.data || [];

  }, []);

  return useApi<VehicleTypeOption[]>(apiCall);
}

// ==============================
// VEHICLE STATUS & LIVE STATUS HOOK
// ==============================

type GetVehicleStatusParams = {
  pageName: string;
  CustId?: number;
  requestModel?: DataTableRequestModel;
  Status?: string | null;
};
const getVehicleStatus = (
  speed: number,
  overspeed: number,
  lastUpdated: string,
  ignitionStatus: boolean
): string => {
  const hoursDiff =
    (new Date().getTime() - new Date(lastUpdated).getTime()) /
    (1000 * 60 * 60);

    debugger
  switch (true) {
    case hoursDiff > 6:
      return 'Unreachable';

    case speed > 0 &&
      speed >= overspeed &&
      ignitionStatus ===true:
      return 'High Speed';

    case speed > 0 &&
      speed < overspeed &&
      ignitionStatus === true:
      return 'Moving';

    case speed <= 0 &&
      ignitionStatus === true:
      return 'Ignition On';

    case speed <= 0 &&
      ignitionStatus === false:
      return 'Parked';

    case speed > 0 &&
      ignitionStatus === false:
      return 'Towed';

    default:
      return 'Unknown';
  }
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

  const url = `${API_BASE_URL}/Reports/GetLiveStatus?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch vehicle data");
  }

  const result = await response.json();

  debugger
  return result.data.map((item: any) => ({

    id: item.bbid,
    vehicleNo: item.vehName,
    type: item.type || 'Other',
    model: item.model || '',
      
    // status: item.vehicleStatus as VehicleStatus,

    status: getVehicleStatus(
      Number(item.speed),
      Number(item.overspeed ?? 60),
      item.lastUpdated,
        item.ignitionStatus
    ) as VehicleStatus,

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
    GPSFix: item.hasfix,
    battery: item.vehBattery,
    gpsDeviceBattery: item.deviceBattery,
    alerts: 0,
    errors: 0,
    alertDetails: [],
    errorDetails: [],
    distance: 0,
    fuelLevel: item.remainingFuelLevel || 0,
    fuelLiters: 0,
    fuelTankCapacity: 0,
    engineTemp: 0,
    hydraulicTemp: 0,
    acStatus: item.acSignal,
    ignitionStatus: item.ignitionStatus,
    totalRecords: item.totalRecords || 0,
    driverName: item.driverName || '',
    mob_no: item.mob_no || '',

  }));
};


// ==============================
// EXCEL PDF & EXCEL DOWNLOAD HOOK
// ==============================

export const useReportDownload = (
  endpoint: string,
  requestModel: any,
  extraParams?: Record<string, string>
) => {
  const exportExcel = async () => {
    await downloadReport(
      endpoint,
      requestModel,
      "Excel",
      extraParams
    );
  };

  const exportPdf = async () => {
    await downloadReport(
      endpoint,
      requestModel,
      "Pdf",
      extraParams
    );
  };

  return {
    exportExcel,
    exportPdf,
  };
};
//===========================================



