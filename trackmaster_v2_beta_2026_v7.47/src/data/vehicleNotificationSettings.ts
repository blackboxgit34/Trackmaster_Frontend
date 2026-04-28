import { actualVehicles } from './mockData';

// --- Common Alert Types ---
export const alertKeys = [
  'ignition',
  'battery',
  'overSpeed',
  'overStoppage',
  'fuelLid',
  'milkLid',
  'geofence',
] as const;

type AlertSettings = Record<typeof alertKeys[number], boolean>;

// --- SMS Settings ---
export interface SmsAlertSetting {
  id: string; // vehicle id
  vehicleName: string;
  alertOnMNo: string;
  overStoppageMin: number;
  overSpeedLimit: number;
  alerts: AlertSettings;
}

export const smsSettingsData: SmsAlertSetting[] = actualVehicles.slice(0, 20).map((vehicle, index) => ({
  id: vehicle.id,
  vehicleName: vehicle.name,
  alertOnMNo: `99155372${String(index).padStart(2, '0')}`,
  overStoppageMin: 30 + (index % 5) * 5,
  overSpeedLimit: 60 + (index % 4) * 10,
  alerts: {
    ignition: Math.random() > 0.5,
    battery: Math.random() > 0.3,
    overSpeed: Math.random() > 0.2,
    overStoppage: Math.random() > 0.4,
    fuelLid: Math.random() > 0.8,
    milkLid: Math.random() > 0.9,
    geofence: Math.random() > 0.1,
  },
}));

// --- In-App Settings ---
export interface InAppAlertSetting {
  id: string;
  vehicleName: string;
  alerts: AlertSettings;
}

export const inAppSettingsData: InAppAlertSetting[] = actualVehicles.slice(0, 20).map((vehicle) => ({
  id: vehicle.id,
  vehicleName: vehicle.name,
  alerts: {
    ignition: Math.random() > 0.2,
    battery: Math.random() > 0.2,
    overSpeed: Math.random() > 0.2,
    overStoppage: Math.random() > 0.2,
    fuelLid: Math.random() > 0.2,
    milkLid: Math.random() > 0.2,
    geofence: Math.random() > 0.2,
  },
}));

// --- Email Settings ---
export interface EmailAlertSetting {
  id: string;
  vehicleName: string;
  alertOnEmail: string;
  alerts: AlertSettings;
}

export const emailSettingsData: EmailAlertSetting[] = actualVehicles.slice(0, 20).map((vehicle, index) => ({
  id: vehicle.id,
  vehicleName: vehicle.name,
  alertOnEmail: `user${index}@example.com`,
  alerts: {
    ignition: Math.random() > 0.6,
    battery: Math.random() > 0.6,
    overSpeed: Math.random() > 0.6,
    overStoppage: Math.random() > 0.6,
    fuelLid: Math.random() > 0.6,
    milkLid: Math.random() > 0.6,
    geofence: Math.random() > 0.6,
  },
}));

// --- WhatsApp Settings ---
export interface WhatsAppAlertSetting {
  id: string;
  vehicleName: string;
  alertOnWhatsAppNo: string;
  alerts: AlertSettings;
}

export const whatsAppSettingsData: WhatsAppAlertSetting[] = actualVehicles.slice(0, 20).map((vehicle, index) => ({
  id: vehicle.id,
  vehicleName: vehicle.name,
  alertOnWhatsAppNo: `98765432${String(index).padStart(2, '0')}`,
  alerts: {
    ignition: Math.random() > 0.7,
    battery: Math.random() > 0.7,
    overSpeed: Math.random() > 0.7,
    overStoppage: Math.random() > 0.7,
    fuelLid: Math.random() > 0.7,
    milkLid: Math.random() > 0.7,
    geofence: Math.random() > 0.7,
  },
}));