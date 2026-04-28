import { format, subDays, addHours, startOfDay, addMinutes } from 'date-fns';

export interface TripReportData {
  id: string;
  vehicleId: string;
  startPoiId: string;
  endPoiId: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  stopTime: number; // in minutes
  distance: number; // in km
  fuelConsumed: number; // in liters
  path: { lat: number; lng: number }[];
}

const now = new Date();

// Helper to create a trip object
const createTrip = (
  id: string,
  vehicleId: string,
  startPoi: string,
  endPoi: string,
  startTime: Date,
  duration: number,
  stopTime: number,
  distance: number,
  fuel: number
): TripReportData => {
  const endTime = addMinutes(startTime, duration + stopTime);
  return {
    id,
    vehicleId,
    startPoiId: startPoi,
    endPoiId: endPoi,
    startTime: format(startTime, 'yyyy-MM-dd HH:mm'),
    endTime: format(endTime, 'yyyy-MM-dd HH:mm'),
    duration,
    stopTime,
    distance,
    fuelConsumed: fuel,
    path: [], // Path data is not used in the table, can be empty
  };
};

export const tripReportData: TripReportData[] = [
  // --- Vehicle VIO-001: Has a clear round trip and a one-way trip ---
  // Round Trip: POI 1 <-> POI 2 on the same day
  createTrip('trip-1', 'VIO-001', '1', '2', addHours(startOfDay(now), 8), 60, 15, 25.5, 5.1),
  createTrip('trip-2', 'VIO-001', '2', '1', addHours(startOfDay(now), 14), 65, 20, 26.1, 5.2),
  
  // One-Way Trip: POI 1 -> POI 3 on a different day
  createTrip('trip-3', 'VIO-001', '1', '3', addHours(startOfDay(subDays(now, 1)), 9), 45, 10, 18.0, 3.8),

  // --- Vehicle V-002: Has multiple round trips between the same POIs on different days ---
  // Round Trip 1: POI 6 <-> POI 7
  createTrip('trip-4', 'V-002', '6', '7', addHours(startOfDay(now), 7), 90, 30, 45.0, 8.5),
  createTrip('trip-5', 'V-002', '7', '6', addHours(startOfDay(now), 13), 95, 25, 45.8, 8.7),

  // Round Trip 2: POI 6 <-> POI 7 on the previous day
  createTrip('trip-6', 'V-002', '6', '7', addHours(startOfDay(subDays(now, 1)), 8), 88, 28, 44.5, 8.4),
  createTrip('trip-7', 'V-002', '7', '6', addHours(startOfDay(subDays(now, 1)), 15), 92, 32, 46.2, 8.8),

  // --- Vehicle C-003: Has only one-way trips, should not appear in "Two Way" reports ---
  // One-Way Trip: POI 4 -> POI 5
  createTrip('trip-8', 'C-003', '4', '5', addHours(startOfDay(now), 10), 55, 10, 22.0, 4.4),
  // Another One-Way Trip: POI 8 -> POI 9
  createTrip('trip-9', 'C-003', '8', '9', addHours(startOfDay(subDays(now, 2)), 11), 70, 15, 35.0, 6.9),

  // --- Vehicle SV-004: Has an outbound trip without an immediate return, to test pairing logic ---
  // Outbound trip A -> B
  createTrip('trip-10', 'SV-004', '1', '2', addHours(startOfDay(now), 6), 60, 10, 25.0, 5.0),
  // A different trip B -> C (should not be paired as a return)
  createTrip('trip-11', 'SV-004', '2', '3', addHours(startOfDay(now), 9), 40, 5, 15.0, 3.0),
  // The actual return trip B -> A, much later
  createTrip('trip-12', 'SV-004', '2', '1', addHours(startOfDay(now), 18), 65, 20, 25.5, 5.1),
];