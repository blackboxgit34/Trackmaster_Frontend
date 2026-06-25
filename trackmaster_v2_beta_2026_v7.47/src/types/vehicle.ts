export type VehicleStatus = 'Moving' | 'Parked' | 'Unreachable' | 'Breakdown' | 'Ignition On' | 'Battery Disconnect' | 'High Speed' | 'Towed' | 'Idle';

export interface LiveVehicleStatus {
  id: string;
  type: string;
  vehicleNo: string;
  model: string;
  status: VehicleStatus;
  lastUpdated: string;
  location: string;
  lat: number;
  lng: number;
  bbid: string;
  workingHours: number;
  idlingHours: number;
  stoppageTime: number;
  fuelConsumed?: number;
  gsmSignal: number;
  deviceSignal: number;
  GPSFix: number;
  battery: number;
  gpsDeviceBattery: number;
  alerts: number;
  errors: number;
  alertDetails: string[];
  errorDetails: string[];
  speed: number;
  distance: number;
  fuelLevel: number;
  fuelLiters: number;
  fuelTankCapacity: number;
  engineTemp: number;
  hydraulicTemp: number;
  sensorStatus: 'ok' | 'disconnected' | 'dirt_error';
  acStatus: true |  false;
  ignitionStatus: true |  false;
  driverName: string;
  mob_no: string;
  totalRecords: number;
  addons: {
    fuel: 'working' | 'error' | 'uninstalled';
    temp: 'working' | 'error' | 'uninstalled';
    ac: 'working' | 'error' | 'uninstalled';
    door: 'working' | 'error' | 'uninstalled';
    lid: 'working' | 'error' | 'uninstalled';
    immobilizer: 'working' | 'error' | 'uninstalled';
  };
  latLongHistory?: {
    lat: number;
    lng: number;
  }[];

}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  model: string;
  make: string;
  driver: string | null;
  odometer: number;
  status: 'In Use' | 'Inactive';
  blackbox: boolean;
  remarks: string;
  fuelTankCapacity: number;
}

//========= for Speed Analysis =============
export interface SpeedEvent {
  id: string;
  dateTime: string;
  location: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  duration: number; // in seconds
}

export interface VehicleSpeedSummary {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  overspeedCount: number;
  totalOverspeedDuration: number; // in seconds
   maxSpeed: number;
  avgSpeed: number;
   overSpeedVal: number;
  details: SpeedEvent[];
}
export interface locationOnMap {
  id: string;
  vehicle: string;
  dateTime: string;
  driverName: string;
  // type: string;
  // status:VehicleStatus;
  lat: number;
  lng: number;
  speed: number;
   latLongHistory?: {
    lat: number;
    lng: number;
  }[];
}
//=============================================