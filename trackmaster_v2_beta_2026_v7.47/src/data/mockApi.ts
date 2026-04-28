import { liveStatusData } from './mockData';
import type { LiveVehicleStatus } from '@/types';

const SIMULATED_DELAY = 800; // ms

export const getLiveStatusData = (): Promise<LiveVehicleStatus[]> => {
  console.log('Fetching live status data...');
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Live status data fetched.');
      resolve(liveStatusData as LiveVehicleStatus[]);
    }, SIMULATED_DELAY);
  });
};