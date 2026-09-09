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
  tripCount?: number;
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
  fuel: number,
  tripCount: number = 1
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
    tripCount,
    path: [], // Path data is not used in the table, can be empty
  };
};

// Base mock trips
const baseMockTrips: TripReportData[] = [
  // --- Vehicle MH-02-AX-1001: Has a clear round trip and a one-way trip ---
  createTrip('trip-1', 'MH-02-AX-1001', '1', '2', addHours(startOfDay(now), 8), 60, 15, 25.5, 5.1),
  createTrip('trip-2', 'MH-02-AX-1001', '2', '1', addHours(startOfDay(now), 14), 65, 20, 26.1, 5.2),
  createTrip('trip-3', 'MH-02-AX-1001', '1', '3', addHours(startOfDay(subDays(now, 1)), 9), 45, 10, 18.0, 3.8),
  createTrip('trip-3b', 'MH-02-AX-1001', '3', '1', addHours(startOfDay(subDays(now, 1)), 16), 50, 12, 18.5, 3.9),

  // --- Vehicle DL-01-GA-1002: Multiple round trips ---
  createTrip('trip-4', 'DL-01-GA-1002', '6', '7', addHours(startOfDay(now), 7), 90, 30, 45.0, 8.5),
  createTrip('trip-5', 'DL-01-GA-1002', '7', '6', addHours(startOfDay(now), 13), 95, 25, 45.8, 8.7),
  createTrip('trip-6', 'DL-01-GA-1002', '6', '7', addHours(startOfDay(subDays(now, 1)), 8), 88, 28, 44.5, 8.4),
  createTrip('trip-7', 'DL-01-GA-1002', '7', '6', addHours(startOfDay(subDays(now, 1)), 15), 92, 32, 46.2, 8.8),
  createTrip('trip-7b', 'DL-01-GA-1002', '1', '2', addHours(startOfDay(subDays(now, 3)), 8), 62, 14, 25.0, 5.0),
  createTrip('trip-7c', 'DL-01-GA-1002', '2', '1', addHours(startOfDay(subDays(now, 3)), 15), 68, 18, 26.0, 5.2),

  // --- Vehicle KA-05-MJ-1003 ---
  createTrip('trip-8', 'KA-05-MJ-1003', '4', '5', addHours(startOfDay(now), 10), 55, 10, 22.0, 4.4),
  createTrip('trip-8b', 'KA-05-MJ-1003', '5', '4', addHours(startOfDay(now), 17), 58, 15, 22.5, 4.5),
  createTrip('trip-9', 'KA-05-MJ-1003', '8', '9', addHours(startOfDay(subDays(now, 2)), 11), 70, 15, 35.0, 6.9),
  createTrip('trip-9b', 'KA-05-MJ-1003', '1', '2', addHours(startOfDay(subDays(now, 4)), 9), 60, 15, 25.5, 5.1),

  // --- Vehicle GJ-01-ZZ-1004 ---
  createTrip('trip-10', 'GJ-01-ZZ-1004', '1', '2', addHours(startOfDay(now), 6), 60, 10, 25.0, 5.0),
  createTrip('trip-11', 'GJ-01-ZZ-1004', '2', '3', addHours(startOfDay(now), 9), 40, 5, 15.0, 3.0),
  createTrip('trip-12', 'GJ-01-ZZ-1004', '2', '1', addHours(startOfDay(now), 18), 65, 20, 25.5, 5.1),
  createTrip('trip-13', 'GJ-01-ZZ-1004', '1', '2', addHours(startOfDay(subDays(now, 5)), 7), 58, 12, 24.8, 4.9),
  createTrip('trip-14', 'GJ-01-ZZ-1004', '2', '1', addHours(startOfDay(subDays(now, 5)), 16), 64, 18, 25.2, 5.1),

  // --- Vehicle RJ-14-TC-1005 ---
  createTrip('trip-15', 'RJ-14-TC-1005', '1', '2', addHours(startOfDay(now), 9), 63, 14, 25.8, 5.2),
  createTrip('trip-16', 'RJ-14-TC-1005', '2', '1', addHours(startOfDay(now), 16), 67, 19, 26.4, 5.3),
  createTrip('trip-17', 'RJ-14-TC-1005', '3', '4', addHours(startOfDay(subDays(now, 1)), 10), 75, 20, 31.2, 6.2),

  // --- Vehicle UP-16-AB-1006 ---
  createTrip('trip-18', 'UP-16-AB-1006', '5', '6', addHours(startOfDay(now), 8), 85, 22, 38.5, 7.5),
  createTrip('trip-19', 'UP-16-AB-1006', '6', '5', addHours(startOfDay(now), 15), 90, 25, 39.0, 7.8),
  createTrip('trip-20', 'UP-16-AB-1006', '1', '2', addHours(startOfDay(subDays(now, 2)), 8), 61, 15, 25.4, 5.1),
  createTrip('trip-21', 'UP-16-AB-1006', '2', '1', addHours(startOfDay(subDays(now, 2)), 14), 66, 17, 25.9, 5.2),

  // --- Vehicle MH-04-CB-1016 ---
  createTrip('trip-22', 'MH-04-CB-1016', '1', '2', addHours(startOfDay(subDays(now, 1)), 8), 59, 12, 25.1, 5.0),
  createTrip('trip-23', 'MH-04-CB-1016', '2', '1', addHours(startOfDay(subDays(now, 1)), 14), 62, 16, 25.6, 5.1),
  createTrip('trip-24', 'MH-04-CB-1016', '6', '7', addHours(startOfDay(subDays(now, 3)), 9), 92, 26, 45.2, 8.6),
  createTrip('trip-25', 'MH-04-CB-1016', '7', '6', addHours(startOfDay(subDays(now, 3)), 16), 94, 28, 45.6, 8.8),
];

export const tripReportData: TripReportData[] = baseMockTrips;