import { format, subDays, addHours, startOfDay, addSeconds } from 'date-fns';
import { actualVehicles } from './mockData';

export interface BatteryDisconnectionEvent {
  id: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  startLocation: string;
  endLocation: string;
}

const generateDisconnectionData = (): BatteryDisconnectionEvent[] => {
  const data: BatteryDisconnectionEvent[] = [];
  let eventCounter = 0;

  actualVehicles.forEach(vehicle => {
    // 30% chance a vehicle has disconnection events
    if (Math.random() < 0.3) {
      const numEvents = Math.floor(Math.random() * 4) + 1; // 1-4 events
      for (let i = 0; i < numEvents; i++) {
        const day = subDays(new Date(), Math.floor(Math.random() * 30)); // Within the last 30 days
        const startTime = addHours(startOfDay(day), Math.random() * 20);
        const durationSeconds = Math.floor(Math.random() * 3600 * 3 + 300); // 5 mins to 3 hours
        const endTime = addSeconds(startTime, durationSeconds);

        data.push({
          id: `bde-${eventCounter++}`,
          vehicleId: vehicle.id,
          date: format(day, 'yyyy-MM-dd'),
          startTime: format(startTime, 'yyyy-MM-dd HH:mm:ss'),
          endTime: format(endTime, 'yyyy-MM-dd HH:mm:ss'),
          duration: durationSeconds,
          startLocation: `Site ${String.fromCharCode(65 + (i % 5))}, Sector ${i + 1}`,
          endLocation: `Near Warehogfgfuse ${i + 2}`,
        });
      }
    }
  });

  return data;
};

export const batteryDisconnectionData = generateDisconnectionData();