import { actualVehicles } from './mockData';

export interface CrewMember {
  id: string;
  type: string; // e.g. "Driver", "Conductor"
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  conductorName: string | null;
}

export const crewData: CrewMember[] = [
  {
    id: 'crew-1',
    type: 'Driver',
    vehicleId: actualVehicles[0].id,
    vehicleName: actualVehicles[0].name,
    driverName: 'Ramesh Kumar',
    conductorName: 'Suresh Singh',
  },
  {
    id: 'crew-2',
    type: 'Driver',
    vehicleId: actualVehicles[1].id,
    vehicleName: actualVehicles[1].name,
    driverName: 'Vijay Patel',
    conductorName: null,
  },
  {
    id: 'crew-3',
    type: 'Conductor',
    vehicleId: actualVehicles[2].id,
    vehicleName: actualVehicles[2].name,
    driverName: 'Anil Sharma',
    conductorName: 'Manoj Verma',
  },
  {
    id: 'crew-4',
    type: 'Driver',
    vehicleId: actualVehicles[3].id,
    vehicleName: actualVehicles[3].name,
    driverName: 'Sunil Gupta',
    conductorName: 'Rajesh Reddy',
  },
];