export interface Geofence {
  id: string;
  fenceName: string;
  vehicleNo: string;
  createdOn: string;
  fenceId: string;
  bbid: string;
}

export const geofenceData: Geofence[] = [
  {
    id: '1',
    fenceName: 'Mumbai Site A',
    vehicleNo: 'VIO-001',
    createdOn: '2024-09-10 10:30 AM',
    fenceId: 'GF-MUM-01',
    bbid: 'BBID-12345',
  },
  {
    id: '2',
    fenceName: 'Delhi Quarry',
    vehicleNo: 'V-002',
    createdOn: '2024-09-09 02:15 PM',
    fenceId: 'GF-DEL-02',
    bbid: 'BBID-12346',
  },
  {
    id: '3',
    fenceName: 'Bangalore Project',
    vehicleNo: 'C-003',
    createdOn: '2024-09-09 11:00 AM',
    fenceId: 'GF-BLR-03',
    bbid: 'BBID-12347',
  },
  {
    id: '4',
    fenceName: 'Chennai Port',
    vehicleNo: 'SV-004',
    createdOn: '2024-09-08 05:45 PM',
    fenceId: 'GF-CHN-04',
    bbid: 'BBID-12348',
  },
  {
    id: '5',
    fenceName: 'Kolkata Flyover',
    vehicleNo: 'VIO-005',
    createdOn: '2024-09-08 09:00 AM',
    fenceId: 'GF-KOL-05',
    bbid: 'BBID-12349',
  },
  {
    id: '6',
    fenceName: 'Hyderabad Airport',
    vehicleNo: 'V-006',
    createdOn: '2024-09-07 03:20 PM',
    fenceId: 'GF-HYD-06',
    bbid: 'BBID-12350',
  },
  {
    id: '7',
    fenceName: 'Pune Industrial Park',
    vehicleNo: 'C-007',
    createdOn: '2024-09-07 10:10 AM',
    fenceId: 'GF-PUN-07',
    bbid: 'BBID-12351',
  },
  {
    id: '8',
    fenceName: 'Ahmedabad Smart City',
    vehicleNo: 'SV-008',
    createdOn: '2024-09-06 06:00 PM',
    fenceId: 'GF-AMD-08',
    bbid: 'BBID-12352',
  },
  {
    id: '9',
    fenceName: 'Mumbai Site B',
    vehicleNo: 'VIO-009',
    createdOn: '2024-09-06 01:00 PM',
    fenceId: 'GF-MUM-09',
    bbid: 'BBID-12353',
  },
  {
    id: '10',
    fenceName: 'Delhi Warehouse',
    vehicleNo: 'V-010',
    createdOn: '2024-09-05 08:30 AM',
    fenceId: 'GF-DEL-10',
    bbid: 'BBID-12354',
  },
];