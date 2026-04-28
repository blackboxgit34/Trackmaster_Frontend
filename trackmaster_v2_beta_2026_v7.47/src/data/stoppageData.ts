import { format, differenceInSeconds } from 'date-fns';
import { actualVehicles } from './mockData';
import { routeData } from './routeData';

export interface StoppageDetail {
  id: string;
  startDate: string;
  stopDate: string;
  location: string;
  duration: number; // in seconds
  ignitionOn: boolean;
  poiLocation: string | null;
  afterIdlingStatus: 'Vehicle Moved' | 'Ignition switch Off';
}

export interface StoppageData {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  stoppageCount: number;
  totalStoppageTime: number; // in seconds
  details: StoppageDetail[];
}

const generateStoppageData = (): StoppageData[] => {
  const data: StoppageData[] = [];

  actualVehicles.forEach(vehicle => {
    const vehicleTrips = routeData.filter(trip => trip.vehicleId === vehicle.id);
    const details: StoppageDetail[] = [];
    let stoppageCounter = 0;

    vehicleTrips.forEach(trip => {
      let stopStart: { timestamp: string; location?: string; } | null = null;
      let wasIgnitionOn = false;

      trip.path.forEach((point, index) => {
        if (point.speed === 0 && !stopStart) {
          stopStart = { timestamp: point.timestamp, location: point.location };
          wasIgnitionOn = point.engineStatus === 'ON';
        } else if (point.speed > 0 && stopStart) {
          const start = new Date(stopStart.timestamp);
          const end = new Date(trip.path[index - 1].timestamp);
          const duration = differenceInSeconds(end, start);

          if (duration > 60) { // Only count stops longer than a minute
            details.push({
              id: `${vehicle.id}-stop-${stoppageCounter++}`,
              startDate: format(start, 'yyyy-MM-dd HH:mm:ss'),
              stopDate: format(end, 'yyyy-MM-dd HH:mm:ss'),
              location: stopStart.location || 'Unknown Location',
              duration,
              ignitionOn: wasIgnitionOn,
              poiLocation: null,
              afterIdlingStatus: Math.random() > 0.5 ? 'Vehicle Moved' : 'Ignition switch Off',
            });
          }
          stopStart = null;
          wasIgnitionOn = false;
        } else if (point.speed === 0 && stopStart && point.engineStatus === 'ON') {
          wasIgnitionOn = true;
        }
      });
    });

    if (details.length > 0) {
      data.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        driverName: vehicle.driver,
        stoppageCount: details.length,
        totalStoppageTime: details.reduce((sum, d) => sum + d.duration, 0),
        details,
      });
    }
  });

  return data;
};

export const stoppageAnalysisData = generateStoppageData();