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
  workingHours: number;
  idlingHours: number;
  fuelConsumed: number;
  gsmSignal: number;
  deviceSignal: number;
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
  sensorStatus?: 'ok' | 'disconnected' | 'dirt_error';
  acStatus: 'On' | 'Off';
  ignitionStatus: 'On' | 'Off';
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