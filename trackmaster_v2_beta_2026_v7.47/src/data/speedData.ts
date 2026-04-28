import { format, addMinutes, startOfDay } from 'date-fns';
import { actualVehicles, consolidatedReportTableData } from './mockData';

export interface SpeedEvent {
  id: string;
  dateTime: string;
  location: string;
  speed: number; // km/h
  duration: number; // in seconds
}

export interface VehicleSpeedSummary {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  overspeedCount: number;
  maxSpeed: number;
  avgSpeed: number;
  totalOverspeedDuration: number; // in seconds
  details: SpeedEvent[];
}

const OVER_SPEED_LIMIT = 80; // km/h

const generateSpeedData = (): VehicleSpeedSummary[] => {
  const speedData: VehicleSpeedSummary[] = [];

  actualVehicles.forEach(vehicle => {
    const vehicleRecords = consolidatedReportTableData.filter(r => r.vehicleId === vehicle.id);
    if (vehicleRecords.length === 0) return;

    const details: SpeedEvent[] = [];
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedReadingCount = 0;

    vehicleRecords.forEach(record => {
      const numEvents = Math.floor(Math.random() * 5) + 1; // 1-5 events per day
      for (let i = 0; i < numEvents; i++) {
        const speed = Math.floor(Math.random() * 60 + 40); // 40-100 km/h
        totalSpeed += speed;
        speedReadingCount++;
        if (speed > maxSpeed) maxSpeed = speed;
        
        const eventDate = new Date(record.date);
        const eventTime = addMinutes(startOfDay(eventDate), Math.random() * 12 * 60);
        details.push({
          id: `${record.id}-speed-${i}`,
          dateTime: format(eventTime, 'yyyy-MM-dd HH:mm'),
          location: record.location,
          speed: speed,
          duration: Math.floor(Math.random() * 240 + 60),
        });
      }
    });

    if (details.length > 0) {
      const overspeedEvents = details.filter(d => d.speed > OVER_SPEED_LIMIT);
      const overspeedCount = overspeedEvents.length;
      const totalOverspeedDuration = overspeedEvents.reduce((sum, d) => sum + d.duration, 0);

      speedData.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        driverName: vehicle.driver,
        overspeedCount,
        maxSpeed,
        avgSpeed: speedReadingCount > 0 ? parseFloat((totalSpeed / speedReadingCount).toFixed(1)) : 0,
        totalOverspeedDuration,
        details: details.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
      });
    }
  });

  return speedData;
};

export const speedAnalysisData = generateSpeedData();