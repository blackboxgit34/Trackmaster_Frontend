export interface MovementStoppageEvent {
  type: 'movement' | 'stoppage';
  startTime: string;
  endTime: string;
  duration: number; // seconds
  startLocation: string;
  endLocation: string;
}

export interface VehicleMovementStoppageData {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  totalDistance: number; // km
  events: MovementStoppageEvent[];
}

export const movementStoppageData: VehicleMovementStoppageData[] = [
  {
    vehicleId: 'TR-001',
    vehicleName: 'CH01CZ2876',
    driverName: 'Ramesh Kumar',
    totalDistance: 133.40,
    events: [
      {
        type: 'stoppage',
        startTime: '17/Jan/2026 12:04:55 AM',
        endTime: '17/Jan/2026 09:31:48 AM',
        duration: 34013,
        startLocation: 'N/A',
        endLocation: '0.14 Km E of Govt Model High School Sector 34 (Chandigarh)',
      },
      {
        type: 'movement',
        startTime: '17/Jan/2026 09:31:58 AM',
        endTime: '17/Jan/2026 09:41:28 AM',
        duration: 570,
        startLocation: '0.12 Km E of Govt Model High School Sector 34 (Chandigarh)',
        endLocation: '0.06 Km E of Furniture Market Chowk Badheri, Sector 53 (Chandigarh)',
      },
      {
        type: 'stoppage',
        startTime: '17/Jan/2026 09:41:28 AM',
        endTime: '17/Jan/2026 09:42:40 AM',
        duration: 72,
        startLocation: '0.06 Km E of Furniture Market Chowk Badheri, Sector 53 (Chandigarh)',
        endLocation: '0.06 Km E of Furniture Market Chowk Badheri, Sector 53 (Chandigarh)',
      },
      {
        type: 'movement',
        startTime: '17/Jan/2026 09:42:50 AM',
        endTime: '17/Jan/2026 10:05:01 AM',
        duration: 1331,
        startLocation: '0.03 Km E of Furniture Market Chowk (Chandigarh)',
        endLocation: '0.51 Km S of Morinda Rd Goshlan Punjab (Punjab)',
      },
      {
        type: 'stoppage',
        startTime: '17/Jan/2026 10:05:01 AM',
        endTime: '17/Jan/2026 10:10:03 AM',
        duration: 302,
        startLocation: '0.51 Km S of Morinda Rd Goshlan Punjab (Punjab)',
        endLocation: '0.51 Km S of Morinda Rd Goshlan Punjab (Punjab)',
      },
      {
        type: 'movement',
        startTime: '17/Jan/2026 10:10:13 AM',
        endTime: '17/Jan/2026 10:25:25 AM',
        duration: 912,
        startLocation: '0.46 Km S of Morinda Rd Goshlan Punjab (Punjab)',
        endLocation: '0.02 Km N of Chandigarh Rd, Rupnagar (Punjab)',
      },
      {
        type: 'stoppage',
        startTime: '17/Jan/2026 10:25:25 AM',
        endTime: '17/Jan/2026 10:27:01 AM',
        duration: 96,
        startLocation: '0.02 Km N of Chandigarh Rd, Rupnagar (Punjab)',
        endLocation: '0.02 Km N of Chandigarh Rd, Rupnagar (Punjab)',
      },
      {
        type: 'movement',
        startTime: '17/Jan/2026 10:27:11 AM',
        endTime: '17/Jan/2026 10:36:31 AM',
        duration: 560,
        startLocation: '0.01 Km W of 12, Chandigarh Rd, Police Lines, Power Colony, Rupnagar, Punjab 140001, India (Punjab)',
        endLocation: '0 Km S of CANAL POST SML ISUZU, Ropar (Punjab)',
      },
    ],
  },
  {
    vehicleId: 'TP-002',
    vehicleName: 'Tata Tipper #2',
    driverName: 'Suresh Patel',
    totalDistance: 88.5,
    events: [
      {
        type: 'movement',
        startTime: '18/Jan/2026 08:00:00 AM',
        endTime: '18/Jan/2026 09:30:00 AM',
        duration: 5400,
        startLocation: 'Site B',
        endLocation: 'Site C',
      },
      {
        type: 'stoppage',
        startTime: '18/Jan/2026 09:30:00 AM',
        endTime: '18/Jan/2026 10:00:00 AM',
        duration: 1800,
        startLocation: 'Site C',
        endLocation: 'Site C',
      },
    ],
  },
];