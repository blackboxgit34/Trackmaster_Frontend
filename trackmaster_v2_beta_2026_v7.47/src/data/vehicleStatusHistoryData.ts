import { format, subMinutes } from 'date-fns';
import { actualVehicles } from './mockData';

export type VehicleStatus = 'Moving' | 'Parked' | 'Idle' | 'Ignition On' | 'Unreachable' | 'Breakdown';

export interface VehicleStatusEvent {
  id: string;
  dateTime: string;
  location: string;
  speed: number;
  status: VehicleStatus;
}

export interface VehicleStatusHistory {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  events: VehicleStatusEvent[];
}

const now = new Date();
const locations = ['Mumbai Site A', 'Delhi Quarry', 'Bangalore Project', 'Chennai Port', 'Kolkata Flyover'];
const statuses: VehicleStatus[] = ['Moving', 'Parked', 'Idle', 'Ignition On'];

const generateEvents = (vehicleId: string, count: number): VehicleStatusEvent[] => {
  const events: VehicleStatusEvent[] = [];
  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    events.push({
      id: `${vehicleId}-event-${i}`,
      dateTime: format(subMinutes(now, i * 90 + Math.random() * 30), 'yyyy-MM-dd HH:mm'),
      location: locations[i % locations.length],
      speed: status === 'Moving' ? Math.floor(Math.random() * 60) + 20 : 0,
      status,
    });
  }
  return events;
};

export const vehicleStatusHistoryData: VehicleStatusHistory[] = actualVehicles.slice(0, 25).map((vehicle) => ({
  vehicleId: vehicle.id,
  vehicleName: vehicle.name,
  driverName: vehicle.driver,
  events: generateEvents(vehicle.id, Math.floor(Math.random() * 5) + 3), // 3 to 7 events per vehicle
}));