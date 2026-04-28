export interface GeofenceShape {
  id: number;
  name: string;
  type: 'polygon' | 'circle';
  paths?: { lat: number; lng: number }[]; // For polygon
  center?: { lat: number; lng: number }; // For circle
  radius?: number; // For circle, in meters
  machines: string[];
  isActive: boolean;
}

export const geofenceMapData: GeofenceShape[] = [
  {
    id: 1,
    name: 'Fence 1 - Mumbai Site',
    type: 'polygon',
    paths: [
      { lat: 19.076, lng: 72.8777 },
      { lat: 19.079, lng: 72.881 },
      { lat: 19.073, lng: 72.882 },
      { lat: 19.071, lng: 72.878 },
    ],
    machines: ['VIO-001', 'V-002'],
    isActive: true,
  },
  {
    id: 2,
    name: 'Fence 2 - Delhi Quarry',
    type: 'circle',
    center: { lat: 28.7041, lng: 77.1025 },
    radius: 1500,
    machines: ['C-003'],
    isActive: true,
  },
  {
    id: 3,
    name: 'Fence 3 - Bangalore Project',
    type: 'polygon',
    paths: [
        { lat: 12.9716, lng: 77.5946 },
        { lat: 12.975, lng: 77.600 },
        { lat: 12.970, lng: 77.602 },
        { lat: 12.968, lng: 77.595 },
    ],
    machines: ['SV-004'],
    isActive: true,
  },
  {
    id: 4,
    name: 'Fence 4 - Chennai Port',
    type: 'circle',
    center: { lat: 13.0827, lng: 80.2707 },
    radius: 2000,
    machines: ['VIO-005'],
    isActive: false,
  },
];