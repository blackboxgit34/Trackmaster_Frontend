export interface Poi {
  id: string;
  poiName: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export const poiData: Poi[] = [
  { id: '1', poiName: 'Main Warehouse', latitude: 19.0760, longitude: 72.8777, radius: 500 },
  { id: '2', poiName: 'North Distribution Center', latitude: 19.2288, longitude: 72.8540, radius: 1000 },
  { id: '3', poiName: 'South Hub', latitude: 18.9220, longitude: 72.8347, radius: 750 },
  { id: '4', poiName: 'East Side Depot', latitude: 19.0785, longitude: 72.9080, radius: 600 },
  { id: '5', poiName: 'West Gate Terminal', latitude: 19.1176, longitude: 72.8388, radius: 800 },
  { id: '6', poiName: 'Centrgdfgdfsdfsdfsdfgfal Office', latitude: 19.0213, longitude: 72.8424, radius: 300 },
  { id: '7', poiName: 'Service Center', latitude: 19.1300, longitude: 72.8250, radius: 450 },
  { id: '8', poiName: 'Client Site A', latitude: 19.0910, longitude: 72.8880, radius: 1200 },
  { id: '9', poiName: 'Client Site B', latitude: 18.9990, longitude: 72.8100, radius: 900 },
  { id: '10', poiName: 'Airport Cargo', latitude: 19.0896, longitude: 72.8656, radius: 1500 },
  { id: '11', poiName: 'Port Authority', latitude: 18.9300, longitude: 72.8300, radius: 2000 },
  { id: '12', poiName: 'Rail Yard', latitude: 19.0400, longitude: 72.8600, radius: 1800 },
];