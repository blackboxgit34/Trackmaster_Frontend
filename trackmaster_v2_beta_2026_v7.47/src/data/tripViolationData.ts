export type ViolationType = 
  | 'route_deviation'
  | 'missed_waypoint'
  | 'missed_halt'
  | 'halt_exceeded'
  | 'unauthorized_stop'
  | 'overspeeding'
  | 'schedule_delay'
  | 'curfew_violation';

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ViolationStatus = 'open' | 'investigating' | 'resolved' | 'acknowledged';

export interface WaypointInfo {
  id: string;
  name: string;
  expectedTime: string;
  actualTime?: string;
  status: 'passed' | 'missed' | 'pending';
  lat: number;
  lng: number;
}

export interface HaltInfo {
  id: string;
  name: string;
  allowedDurationMin: number;
  actualDurationMin: number;
  status: 'normal' | 'exceeded' | 'missed' | 'unauthorized';
  lat: number;
  lng: number;
}

export interface TripViolation {
  id: string;
  tripId: string;
  routeName: string;
  vehicleId: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  violationType: ViolationType;
  title: string;
  details: string;
  location: string;
  coords: { lat: number; lng: number };
  timestamp: string;
  durationMinutes?: number;
  severity: ViolationSeverity;
  status: ViolationStatus;
  assignedRoutePath?: { lat: number; lng: number }[];
  actualRoutePath?: { lat: number; lng: number }[];
  waypoints?: WaypointInfo[];
  halts?: HaltInfo[];
  speedLimit?: number;
  maxRecordedSpeed?: number;
  deviationDistanceKm?: number;
}

export const violationTypeLabels: Record<ViolationType, { label: string; icon: string; description: string }> = {
  route_deviation: {
    label: 'Route Deviation',
    icon: 'NavigationOff',
    description: 'Vehicle drifted away from assigned corridor or geofenced polyline route.',
  },
  missed_waypoint: {
    label: 'Missed Waypoint',
    icon: 'MapPinOff',
    description: 'Vehicle bypassed mandatory checkpoint without registering arrival.',
  },
  missed_halt: {
    label: 'Missed Halt',
    icon: 'OctagonAlert',
    description: 'Designated rest stop, checkpoint, or delivery halt was skipped.',
  },
  halt_exceeded: {
    label: 'Halt Limit Exceeded',
    icon: 'Hourglass',
    description: 'Vehicle stayed at designated halt longer than allowed threshold.',
  },
  unauthorized_stop: {
    label: 'Unauthorized Stoppage',
    icon: 'Ban',
    description: 'Unplanned stoppage recorded outside designated halt zones.',
  },
  overspeeding: {
    label: 'Route Speeding',
    icon: 'Zap',
    description: 'Exceeded prescribed speed limit for the designated route segment.',
  },
  schedule_delay: {
    label: 'Schedule Delay',
    icon: 'ClockAlert',
    description: 'Delayed departure or ETA overrun beyond buffer limits.',
  },
  curfew_violation: {
    label: 'Curfew / Night Driving',
    icon: 'Moon',
    description: 'Vehicle in motion during restricted night hours (11 PM - 5 AM).',
  },
};

export const sampleTripViolations: TripViolation[] = [
  {
    id: 'VIO-1001',
    tripId: 'TRIP-9021',
    routeName: 'Mumbai Warehouse to North Distribution Center',
    vehicleId: 'MH-02-AX-1011',
    vehicleNo: 'MH-02-AX-1011',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98765 43210',
    violationType: 'route_deviation',
    title: 'Severe Off-Corridor Route Deviation',
    details: 'Vehicle drifted 4.2 km off NH48 corridor near Thane Bypass for 48 minutes.',
    location: 'Thane Bypass, NH48 Exit 12',
    coords: { lat: 19.2183, lng: 72.9781 },
    timestamp: '2026-07-29 14:22',
    durationMinutes: 48,
    severity: 'critical',
    status: 'open',
    deviationDistanceKm: 4.2,
    assignedRoutePath: [
      { lat: 19.0760, lng: 72.8777 },
      { lat: 19.1200, lng: 72.8900 },
      { lat: 19.1700, lng: 72.9100 },
      { lat: 19.2288, lng: 72.8540 },
    ],
    actualRoutePath: [
      { lat: 19.0760, lng: 72.8777 },
      { lat: 19.1200, lng: 72.8900 },
      { lat: 19.1850, lng: 72.9650 }, // Off-route detour
      { lat: 19.2183, lng: 72.9781 },
      { lat: 19.2288, lng: 72.8540 },
    ],
    waypoints: [
      { id: 'WP-1', name: 'Start: Main Warehouse', expectedTime: '10:00 AM', actualTime: '10:05 AM', status: 'passed', lat: 19.0760, lng: 72.8777 },
      { id: 'WP-2', name: 'Checkpoint Alpha (Thane)', expectedTime: '11:15 AM', actualTime: undefined, status: 'missed', lat: 19.1700, lng: 72.9100 },
      { id: 'WP-3', name: 'Dest: North Dist. Center', expectedTime: '01:30 PM', actualTime: '02:45 PM', status: 'passed', lat: 19.2288, lng: 72.8540 },
    ],
    halts: [
      { id: 'HLT-1', name: 'Food Court Halt 1', allowedDurationMin: 30, actualDurationMin: 25, status: 'normal', lat: 19.1200, lng: 72.8900 },
      { id: 'HLT-2', name: 'Unscheduled Highway Stop', allowedDurationMin: 0, actualDurationMin: 48, status: 'unauthorized', lat: 19.2183, lng: 72.9781 },
    ],
  },
  {
    id: 'VIO-1002',
    tripId: 'TRIP-9024',
    routeName: 'East Side Depot to West Gate Terminal',
    vehicleId: 'VOL-002',
    vehicleNo: 'MH-04-CB-4492',
    driverName: 'Suresh Patil',
    driverPhone: '+91 98220 11982',
    violationType: 'missed_waypoint',
    title: 'Skipped Mandatory Checkpoint B',
    details: 'Driver bypassed Waypoint #2 (Western Highway Toll) without stopping or scanning entry.',
    location: 'Western Highway Toll Plaza (Km 18)',
    coords: { lat: 19.1020, lng: 72.8650 },
    timestamp: '2026-07-29 11:05',
    severity: 'high',
    status: 'investigating',
    waypoints: [
      { id: 'WP-10', name: 'East Side Depot Gate', expectedTime: '10:15 AM', actualTime: '10:15 AM', status: 'passed', lat: 19.0785, lng: 72.9080 },
      { id: 'WP-11', name: 'Western Highway Toll (Mandatory)', expectedTime: '11:00 AM', actualTime: undefined, status: 'missed', lat: 19.1020, lng: 72.8650 },
      { id: 'WP-12', name: 'West Gate Terminal', expectedTime: '11:45 AM', actualTime: '11:40 AM', status: 'passed', lat: 19.1176, lng: 72.8388 },
    ],
  },
  {
    id: 'VIO-1003',
    tripId: 'TRIP-9030',
    routeName: 'Central Office to Client Site B',
    vehicleId: 'BLR-003',
    vehicleNo: 'MH-12-RS-7721',
    driverName: 'Vikram Singh',
    driverPhone: '+91 97110 55432',
    violationType: 'halt_exceeded',
    title: 'Halt Limit Exceeded by 55 Minutes',
    details: 'Vehicle overstayed at Rest Stop 2 for 85 minutes (Allowed limit: 30 minutes).',
    location: 'Highway Plaza Rest Area',
    coords: { lat: 19.0150, lng: 72.8250 },
    timestamp: '2026-07-29 13:10',
    durationMinutes: 85,
    severity: 'high',
    status: 'open',
    halts: [
      { id: 'HLT-10', name: 'Highway Plaza Rest Area', allowedDurationMin: 30, actualDurationMin: 85, status: 'exceeded', lat: 19.0150, lng: 72.8250 },
    ],
  },
  {
    id: 'VIO-1004',
    tripId: 'TRIP-8845',
    routeName: 'Delhi Quarry to Depot North',
    vehicleId: 'DEL-005',
    vehicleNo: 'DL-01-GA-3310',
    driverName: 'Amit Sharma',
    driverPhone: '+91 99100 88234',
    violationType: 'overspeeding',
    title: 'Route Speed Limit Exceeded (88 km/h in 50 km/h Zone)',
    details: 'Sustained overspeeding at 88 km/h for 12 continuous minutes on urban expressway segment.',
    location: 'Outer Ring Road, Delhi Sec-14',
    coords: { lat: 28.7120, lng: 77.1080 },
    timestamp: '2026-07-29 09:40',
    durationMinutes: 12,
    severity: 'critical',
    status: 'acknowledged',
    speedLimit: 50,
    maxRecordedSpeed: 88,
  },
  {
    id: 'VIO-1005',
    tripId: 'TRIP-8910',
    routeName: 'Bangalore Metro Project Line 2',
    vehicleId: 'KA-008',
    vehicleNo: 'KA-05-MJ-9912',
    driverName: 'Anand Vardhan',
    driverPhone: '+91 98450 12345',
    violationType: 'unauthorized_stop',
    title: 'Unauthorized Extended Stoppage',
    details: 'Vehicle stopped in non-designated zone along Silk Board flyover for 40 minutes.',
    location: 'Near Silk Board Flyover, Bangalore',
    coords: { lat: 12.9175, lng: 77.6238 },
    timestamp: '2026-07-29 15:50',
    durationMinutes: 40,
    severity: 'medium',
    status: 'resolved',
    halts: [
      { id: 'HLT-20', name: 'Flyover Shoulder Unscheduled Stop', allowedDurationMin: 0, actualDurationMin: 40, status: 'unauthorized', lat: 12.9175, lng: 77.6238 },
    ],
  },
  {
    id: 'VIO-1006',
    tripId: 'TRIP-8700',
    routeName: 'Mumbai Port Hub to Bhiwandi Logistics Park',
    vehicleId: 'MH-04-JK-8820',
    vehicleNo: 'MH-04-JK-8820',
    driverName: 'Mahesh Jadhav',
    driverPhone: '+91 98920 33411',
    violationType: 'curfew_violation',
    title: 'Night Curfew Movement Violation',
    details: 'Trip movement detected between 01:15 AM and 03:40 AM, violating company night curfew policy.',
    location: 'Bhiwandi Highway Crossing',
    coords: { lat: 19.2812, lng: 73.0489 },
    timestamp: '2026-07-29 02:15',
    durationMinutes: 145,
    severity: 'critical',
    status: 'open',
  },
  {
    id: 'VIO-1007',
    tripId: 'TRIP-9112',
    routeName: 'Pune Industrial Area to Mumbai Docks',
    vehicleId: 'PUN-004',
    vehicleNo: 'MH-14-BT-3091',
    driverName: 'Ganesh Shinde',
    driverPhone: '+91 97630 44910',
    violationType: 'missed_halt',
    title: 'Missed Mandatory Inspection Halt',
    details: 'Driver bypassed mandatory safety inspection halt at Khalapur Toll Plaza.',
    location: 'Khalapur Toll Plaza',
    coords: { lat: 18.8350, lng: 73.2840 },
    timestamp: '2026-07-29 08:30',
    severity: 'medium',
    status: 'investigating',
    halts: [
      { id: 'HLT-30', name: 'Khalapur Toll Inspection Stop', allowedDurationMin: 15, actualDurationMin: 0, status: 'missed', lat: 18.8350, lng: 73.2840 },
    ],
  },
  {
    id: 'VIO-1008',
    tripId: 'TRIP-9150',
    routeName: 'Ahmedabad Highway Express Courier',
    vehicleId: 'GUJ-002',
    vehicleNo: 'GJ-01-ZZ-5501',
    driverName: 'Prakash Patel',
    driverPhone: '+91 98980 77123',
    violationType: 'schedule_delay',
    title: 'Trip Dispatch Schedule Delay (> 2.5 Hours)',
    details: 'Trip scheduled for 06:00 AM dispatch started at 08:35 AM due to driver late reporting.',
    location: 'Ahmedabad Central Hub Gate 4',
    coords: { lat: 23.0225, lng: 72.5714 },
    timestamp: '2026-07-29 08:35',
    durationMinutes: 155,
    severity: 'low',
    status: 'resolved',
  },
];
