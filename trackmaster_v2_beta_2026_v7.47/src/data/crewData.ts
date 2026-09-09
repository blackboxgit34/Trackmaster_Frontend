import { actualVehicles } from './mockData';

export interface CrewMember {
  id: string;
  type: 'Driver' | 'Conductor';
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  conductorName: string | null;
  mobile?: string;
  licenseNo?: string;
  status?: 'Available' | 'On Duty' | 'On Leave';
  experience?: string;
}

export const crewData: CrewMember[] = [
  {
    id: 'crew-1',
    type: 'Driver',
    vehicleId: actualVehicles[0]?.id || 'MH-02-AX-1001',
    vehicleName: actualVehicles[0]?.name || 'Tata Prima (MH-02-AX-1001)',
    driverName: 'Ramesh Kumar',
    conductorName: 'Suresh Singh',
    mobile: '+91 98765 43210',
    licenseNo: 'DL-042019001234',
    status: 'On Duty',
    experience: '8 Years',
  },
  {
    id: 'crew-2',
    type: 'Driver',
    vehicleId: actualVehicles[1]?.id || 'DL-01-GA-1002',
    vehicleName: actualVehicles[1]?.name || 'Ashok Leyland (DL-01-GA-1002)',
    driverName: 'Vijay Patel',
    conductorName: null,
    mobile: '+91 98220 11982',
    licenseNo: 'DL-042019005678',
    status: 'Available',
    experience: '6 Years',
  },
  {
    id: 'crew-3',
    type: 'Conductor',
    vehicleId: actualVehicles[2]?.id || 'KA-05-MJ-1003',
    vehicleName: actualVehicles[2]?.name || 'Volvo FMX (KA-05-MJ-1003)',
    driverName: 'Anil Sharma',
    conductorName: 'Manoj Verma',
    mobile: '+91 99100 88234',
    licenseNo: 'DL-042018004321',
    status: 'On Duty',
    experience: '10 Years',
  },
  {
    id: 'crew-4',
    type: 'Driver',
    vehicleId: actualVehicles[3]?.id || 'GJ-01-ZZ-1004',
    vehicleName: actualVehicles[3]?.name || 'Mahindra Blazo (GJ-01-ZZ-1004)',
    driverName: 'Sunil Gupta',
    conductorName: 'Rajesh Reddy',
    mobile: '+91 98450 12345',
    licenseNo: 'DL-042021008765',
    status: 'Available',
    experience: '4 Years',
  },
  {
    id: 'crew-5',
    type: 'Driver',
    vehicleId: 'N/A',
    vehicleName: 'Unassigned',
    driverName: 'Suresh Patel',
    conductorName: null,
    mobile: '+91 98920 33411',
    licenseNo: 'DL-042017006543',
    status: 'Available',
    experience: '7 Years',
  },
  {
    id: 'crew-6',
    type: 'Driver',
    vehicleId: 'N/A',
    vehicleName: 'Unassigned',
    driverName: 'Vijay Singh',
    conductorName: null,
    mobile: '+91 97110 55432',
    licenseNo: 'DL-042020009876',
    status: 'On Leave',
    experience: '5 Years',
  },
  {
    id: 'crew-7',
    type: 'Driver',
    vehicleId: 'N/A',
    vehicleName: 'Unassigned',
    driverName: 'Sanjay Yadav',
    conductorName: null,
    mobile: '+91 98980 77123',
    licenseNo: 'DL-042022003456',
    status: 'Available',
    experience: '3 Years',
  },
  {
    id: 'crew-8',
    type: 'Driver',
    vehicleId: 'N/A',
    vehicleName: 'Unassigned',
    driverName: 'Deepak Chauhan',
    conductorName: null,
    mobile: '+91 98111 22334',
    licenseNo: 'DL-042016007890',
    status: 'Available',
    experience: '11 Years',
  },
];