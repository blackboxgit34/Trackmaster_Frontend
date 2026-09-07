import type { VehicleStatus } from '@/types';

export const getIconUrl = (type: string, _status: VehicleStatus) => {
  const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
  return `/icons/vehicles/${typeSlug}/icon.svg`;
};

// Returns the path to the PNG image in the public folder
export const getVehiclePngUrl = (type: string) => {
  const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
  return `/vehicle-images/${typeSlug}.png`;
};

export const getMarkerIcon = (type: string, status: VehicleStatus) => {
  const iconUrl = getIconUrl(type, status);
  return {
    url: iconUrl,
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
    case 'Breakdown': return 'bg-gray-500';
    case 'Unreachable': return 'bg-red-500';
    case 'Battery Disconnect': return 'bg-rose-500';
    case 'Towed': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

export const getStatusStrokeColor = (status: VehicleStatus) => {
  switch (status) {
    case 'Moving': return 'text-green-500';
    case 'Parked': return 'text-yellow-500';
    case 'Ignition On': return 'text-sky-500';
    case 'Idle': return 'text-teal-500';
    case 'High Speed': return 'text-orange-500';
    case 'Breakdown': return 'text-gray-500';
    case 'Unreachable': return 'text-red-500';
    case 'Battery Disconnect': return 'text-rose-500';
    case 'Towed': return 'text-purple-500';
    default: return 'text-gray-500';
  }
};

export const getStatusColorHex = (status: VehicleStatus) => {
  switch (status) {
    case 'Moving': return '#22c55e';
    case 'Parked': return '#eab308';
    case 'Ignition On': return '#0ea5e9';
    case 'Idle': return '#14b8a6';
    case 'High Speed': return '#f97316';
    case 'Breakdown': return '#6b7280';
    case 'Unreachable': return '#ef4444';
    case 'Battery Disconnect': return '#f43f5e';
    case 'Towed': return '#a855f7';
    default: return '#6b7280';
  }
};

export const getClusterBucket = (count: number) => {
  if (count < 10) return count;
  if (count < 50) return Math.floor(count / 10) * 10; // 10, 20, 30, 40
  if (count < 100) return 50; // 50+
  if (count < 500) return 100; // 100+
  if (count < 1000) return 500; // 500+
  return 1000;
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

export const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;
  const distance = (a: number, b: number) => (Math.PI / 180) * (a - b);
  const RADIUS_OF_EARTH_IN_KM = 6371;

  const dLat = distance(lat2, lat1);
  const dLon = distance(lon2, lon1);

  const lat1Rad = toRadian(lat1);
  const lat2Rad = toRadian(lat2);

  const a = Math.pow(Math.sin(dLat / 2), 2) + Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.asin(Math.sqrt(a));

  return RADIUS_OF_EARTH_IN_KM * c;
};

const minimalDotCache = new Map<string, string>();
export const getMinimalDotUrl = (status: VehicleStatus) => {
  if (!minimalDotCache.has(status)) {
    const color = getStatusColorHex(status);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88" width="32" height="32">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25" />
    </filter>
  </defs>
  <circle cx="61.44" cy="61.44" r="57" fill="#ffffff" filter="url(#shadow)" />
  <circle cx="61.44" cy="61.44" r="50" fill="${color}" />
  <path d="M61.44 28 L87 82 L61.44 72 L35 82 Z" fill="#ffffff" />
</svg>`;
    minimalDotCache.set(status, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }
  return minimalDotCache.get(status)!;
};

export const createCustomMarkerIcon = (
  color: string,
  label: string,
  type: 'start' | 'end' | 'waypoint' | 'halt' = 'waypoint'
) => {
  let svgContent = '';

  if (type === 'start') {
    svgContent = `
      <svg fill="#21c700" viewBox="-3 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="#21c700" stroke-width="0.00024000000000000003"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="m8.075 23.52c-6.811-9.878-8.075-10.891-8.075-14.52 0-4.971 4.029-9 9-9s9 4.029 9 9c0 3.629-1.264 4.64-8.075 14.516-.206.294-.543.484-.925.484s-.719-.19-.922-.48l-.002-.004zm.925-10.77c2.07 0 3.749-1.679 3.749-3.75s-1.679-3.75-3.75-3.75-3.75 1.679-3.75 3.75c0 2.071 1.679 3.75 3.75 3.75z"></path></g></svg>
    `;
  } else if (type === 'end') {
    svgContent = `
      <svg fill="#ff0000" viewBox="-3 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="#ff0000" stroke-width="0.00024000000000000003"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="m8.075 23.52c-6.811-9.878-8.075-10.891-8.075-14.52 0-4.971 4.029-9 9-9s9 4.029 9 9c0 3.629-1.264 4.64-8.075 14.516-.206.294-.543.484-.925.484s-.719-.19-.922-.48l-.002-.004zm.925-10.77c2.07 0 3.749-1.679 3.749-3.75s-1.679-3.75-3.75-3.75-3.75 1.679-3.75 3.75c0 2.071 1.679 3.75 3.75 3.75z"></path></g></svg>
    `;
  } else if (type === 'halt') {
    svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
        <defs>
          <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <rect x="2" y="1" width="20" height="20" rx="4.5" fill="#d97706" filter="url(#sh)"/>
        <rect x="3.5" y="2.5" width="17" height="17" rx="3.5" fill="#f59e0b"/>
        <polygon points="12,29 7,20 17,20" fill="#d97706"/>
        <circle cx="12" cy="11" r="6" fill="#ffffff"/>
        <text x="12" y="14" font-size="8" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle" fill="#b45309">${label}</text>
      </svg>
    `;
  } else {
    svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
        <defs>
          <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18C24 5.373 18.627 0 12 0z" fill="#2563eb" filter="url(#sh)"/>
        <path d="M12 1.5C6.201 1.5 1.5 6.201 1.5 12c0 8.1 10.5 16.2 10.5 16.2S22.5 20.1 22.5 12C22.5 6.201 17.799 1.5 12 1.5z" fill="#3b82f6"/>
        <circle cx="12" cy="11.5" r="6" fill="#ffffff"/>
        <text x="12" y="14.5" font-size="8.5" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle" fill="#1d4ed8">${label}</text>
      </svg>
    `;
  }

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`,
    scaledSize: typeof google !== 'undefined' ? new google.maps.Size(24, 30) : undefined,
    anchor: typeof google !== 'undefined' ? new google.maps.Point(12, 30) : undefined,
  };
};