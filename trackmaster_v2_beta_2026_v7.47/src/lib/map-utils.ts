import type { VehicleStatus } from '@/types';

export const getIconUrl = (type: string, _status: VehicleStatus) => {
  const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
  
  // Always use the single 'icon.png' for each vehicle type, ignoring status.
  // The user will replace the placeholder files with actual PNGs.
  return `/icons/vehicles/${typeSlug}/icon.png`;
};

export const getMarkerIcon = (type: string, status: VehicleStatus) => {
  const iconUrl = getIconUrl(type, status);
  return {
    url: iconUrl,
    // By removing scaledSize and anchor, the icon will be displayed
    // at its original resolution and anchored at its bottom-center.
  };
};

export const getStopMarkerIconUrl = (stopType: 'idle' | 'normal') => {
  if (stopType === 'idle') {
    return '/icons/stoppage/idle-stop.svg';
  }
  return '/icons/stoppage/normal-stop.svg';
};

export const getStatusColor = (status: VehicleStatus) => {
  switch (status) {
    case 'Moving': return 'bg-green-500';
    case 'Parked': return 'bg-yellow-500';
    case 'Ignition On': return 'bg-sky-500';
    case 'Idle': return 'bg-teal-500';
    case 'High Speed': return 'bg-orange-500';
    case 'Breakdown': return 'bg-red-500';
    case 'Battery Disconnect': return 'bg-orange-500';
    case 'Towed': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

export const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRadians = (deg: number) => deg * Math.PI / 180;
  const toDegrees = (rad: number) => rad * 180 / Math.PI;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLngRad = toRadians(lng2 - lng1);

  const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);
  
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);
  
  return (bearingDeg + 360) % 360; // Normalize to 0-360
};