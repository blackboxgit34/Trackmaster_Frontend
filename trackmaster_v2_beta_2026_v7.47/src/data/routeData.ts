import { subDays, format, addMinutes, addSeconds } from 'date-fns';
import { actualVehicles } from './mockData';

export interface TripPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  engineStatus: 'ON' | 'OFF';
  location?: string;
}

export interface Trip {
  tripId: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  distance: number; // in km
  duration: number; // in minutes
  path: TripPoint[];
}

// Helper to generate a simple, somewhat realistic trip path
const generateTrip = (
  tripId: string,
  vehicleId: string,
  startDate: Date,
  startLat: number,
  startLng: number,
  points: number,
  totalMinutes: number,
  locationName: string
): Trip => {
  const path: TripPoint[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  let currentTime = startDate;
  let isStopped = false;
  let stopEndTime = startDate;

  const timeStepSeconds = (totalMinutes * 60) / points;

  for (let i = 0; i < points; i++) {
    let speed = 0;
    let engineStatus: 'ON' | 'OFF' = 'OFF';

    if (currentTime < stopEndTime) {
      isStopped = true;
    } else {
      isStopped = false;
      // Chance to start a new stop
      if (i > 10 && i < points - 10 && Math.random() < 0.05) {
        isStopped = true;
        let stopDurationSeconds;
        if (Math.random() < 0.25) { // 25% of stops are long stops
            // Long stop: 20 to 45 minutes
            stopDurationSeconds = (Math.random() * 25 + 20) * 60; 
        } else {
            // Short stop: 1 to 10 minutes
            stopDurationSeconds = (Math.random() * 9 + 1) * 60;
        }
        stopEndTime = addSeconds(currentTime, stopDurationSeconds);
      }
    }

    if (isStopped) {
      speed = 0;
      // 70% chance of idle stop (engine on), 30% chance of normal stop (engine off)
      engineStatus = Math.random() > 0.3 ? 'ON' : 'OFF';
    } else {
      // Simulate speed: start slow, speed up, then slow down towards the end
      const progress = i / (points - 1);
      speed = Math.round(Math.sin(progress * Math.PI) * 35 + Math.random() * 5);
      engineStatus = 'ON';
    }
    
    // Start and end at 0 speed
    if (i === 0 || i === points - 1) {
      speed = 0;
      engineStatus = 'OFF';
    }

    path.push({
      lat: currentLat,
      lng: currentLng,
      timestamp: currentTime.toISOString(),
      speed,
      engineStatus,
      location: locationName,
    });

    // Move the vehicle slightly if not stopped
    if (speed > 0) {
      currentLat += (Math.random() - 0.5) * 0.0005;
      currentLng += (Math.random() - 0.5) * 0.0005;
    }
    currentTime = addSeconds(currentTime, timeStepSeconds);
  }

  const endDate = path[path.length - 1].timestamp;

  return {
    tripId,
    vehicleId,
    date: format(startDate, 'yyyy-MM-dd'),
    startTime: format(startDate, 'HH:mm'),
    endTime: format(new Date(endDate), 'HH:mm'),
    distance: parseFloat((points * 0.05).toFixed(2)), // Approximate distance
    duration: totalMinutes,
    path,
  };
};

const today = new Date();
const yesterday = subDays(today, 1);

const vehicle1 = actualVehicles[0].id;
const vehicle2 = actualVehicles[1].id;
const vehicle3 = actualVehicles[2].id;
const carVehicle = actualVehicles.find(v => v.type === 'Car')?.id || actualVehicles[6].id;

export const routeData: Trip[] = [
  // More detailed trip for TR-001 (Tata Prima)
  generateTrip('trip-today-tr001', vehicle1, new Date(new Date(today).setHours(8, 0, 0)), 19.076, 72.8777, 500, 600, 'Mumbai-Pune Route'),
  // Trips for vehicle1
  generateTrip('trip-1', vehicle1, addMinutes(new Date(new Date(today).setHours(9, 5, 0)), 0), 19.076, 72.8777, 150, 45, 'Mumbai Site A'),
  generateTrip('trip-2', vehicle1, addMinutes(new Date(new Date(today).setHours(11, 30, 0)), 0), 19.08, 72.88, 200, 70, 'Mumbai Site A'),
  generateTrip('trip-3', vehicle1, addMinutes(new Date(new Date(today).setHours(15, 0, 0)), 0), 19.07, 72.87, 100, 30, 'Mumbai Site A'),
  generateTrip('trip-4', vehicle1, addMinutes(new Date(new Date(yesterday).setHours(10, 0, 0)), 0), 19.075, 72.875, 250, 90, 'Mumbai Site A'),

  // Trips for vehicle2
  generateTrip('trip-5', vehicle2, addMinutes(new Date(new Date(today).setHours(8, 15, 0)), 0), 28.7041, 77.1025, 180, 60, 'Delhi Quarry'),
  generateTrip('trip-6', vehicle2, addMinutes(new Date(new Date(today).setHours(14, 45, 0)), 0), 28.71, 77.11, 220, 80, 'Delhi Quarry'),
  generateTrip('trip-7', vehicle2, addMinutes(new Date(new Date(yesterday).setHours(9, 0, 0)), 0), 28.70, 77.10, 300, 120, 'Delhi Quarry'),
  generateTrip('trip-8', vehicle2, addMinutes(new Date(new Date(yesterday).setHours(16, 0, 0)), 0), 28.705, 77.105, 50, 15, 'Delhi Quarry'),
  
  // Trips for vehicle3
  generateTrip('trip-9', vehicle3, addMinutes(new Date(new Date(today).setHours(10, 20, 0)), 0), 12.9716, 77.5946, 160, 55, 'Bangalore Metro Project'),

  // Trips for Car
  generateTrip('trip-car-1', carVehicle, addMinutes(new Date(new Date(today).setHours(8, 30, 0)), 0), 19.1136, 72.8697, 300, 45, 'Andheri East'),
  generateTrip('trip-car-2', carVehicle, addMinutes(new Date(new Date(today).setHours(18, 15, 0)), 0), 19.0596, 72.8295, 400, 60, 'Bandra West'),
];