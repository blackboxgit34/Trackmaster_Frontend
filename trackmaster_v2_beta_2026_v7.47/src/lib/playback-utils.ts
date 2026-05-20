import { API_BASE_URL } from '@/config/Api';
import { formatISO, parseISO, differenceInSeconds, format } from 'date-fns';

export interface PlaybackStats {
  totalDistance: number;
  drivingTime: number;
  totalIdlingTime: number;
  totalStoppageTime: number;
  playbackData: {
    path: any[];
    movingPath: any[];
    startTime: string;
    endTime: string;
    duration: number;
  } | null;
}

export async function fetchAndCalculatePlaybackData(selectedVehicle: string, selectedDate: Date): Promise<PlaybackStats> {
  if (!selectedVehicle || !selectedDate) {
    return {
      totalDistance: 0,
      drivingTime: 0,
      totalIdlingTime: 0,
      totalStoppageTime: 0,
      playbackData: null,
    };
  }

  const date = format(selectedDate, 'yyyy-MM-dd');
  const url = `${API_BASE_URL}/VehicleStatus/GetPlaybackData?bbid=${selectedVehicle}&date=${date}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
    return {
      totalDistance: 0,
      drivingTime: 0,
      totalIdlingTime: 0,
      totalStoppageTime: 0,
      playbackData: null,
    };
  }

  // ================= FULL PATH =================
  const processedPath = data.data.map((item: any) => ({
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    location: item.location,
    speed: Number(item.speed || 0),
    timestamp: formatISO(new Date(item.datadate)),
    engineStatus: String(item.acignition).toUpperCase() === 'ON' ? 'ON' : 'OFF',
    distance: Number(item.distance || 0),
  }));

  processedPath.sort((a: any, b: any) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

  // ================= MOVING PATH =================
  const processedMovingPath = (data.movingData || []).map((item: any) => ({
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    location: item.location,
    speed: Number(item.speed || 0),
    timestamp: formatISO(new Date(item.datadate)),
    engineStatus: String(item.acignition).toUpperCase() === 'ON' ? 'ON' : 'OFF',
    distance: Number(item.distance || 0),
  }));

  processedMovingPath.sort((a: any, b: any) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

  // ================= DISTANCE / DRIVING / IDLING / STOPPAGE =================
  let drivingSeconds = 0;
  let idlingSeconds = 0;
  let stoppageSeconds = 0;
  let totalDistanceValue = 0;
  let flag = false;
  let sdist = 0;
  let edist = 0;

  for (let i = 0; i < processedPath.length; i++) {
    const current = processedPath[i];
    const next = processedPath[i + 1];
    if (next) {
      const diff = differenceInSeconds(parseISO(next.timestamp), parseISO(current.timestamp));
      if (diff > 0) {
        const speed = Number(current.speed || 0);
        const engineStatus = String(current.engineStatus).toUpperCase();
        if (speed > 0) {
          drivingSeconds += diff;
        }
        if (speed === 0 && engineStatus === 'ON') {
          idlingSeconds += diff;
        }
        if (speed === 0) {
          stoppageSeconds += diff;
        }
      }
    }
    const speed = Number(current.speed || 0);
    const currentDistance = Number(current.distance || 0);
    if (speed > 0 && flag === false) {
      if (i === 0) {
        sdist = currentDistance;
      } else {
        sdist = Number(processedPath[i - 1]?.distance || 0);
      }
      flag = true;
    } else if (speed > 0 && flag === true) {
      edist = currentDistance;
    } else if (speed <= 0 && flag === true) {
      edist = currentDistance;
      const tripDistance = Number((edist - sdist).toFixed(1));
      if (tripDistance > 0 && tripDistance < 500) {
        totalDistanceValue += tripDistance;
      }
      flag = false;
    }
  }
  if (flag === true) {
    const tripDistance = Number((edist - sdist).toFixed(1));
    if (tripDistance > 0 && tripDistance < 500) {
      totalDistanceValue += tripDistance;
    }
  }

  const startTime = processedMovingPath[0]?.timestamp || processedPath[0].timestamp;
  const endTime = processedMovingPath[processedMovingPath.length - 1]?.timestamp || processedPath[processedPath.length - 1].timestamp;
  const playbackDuration = drivingSeconds;

  return {
    totalDistance: totalDistanceValue > 0 ? Number(totalDistanceValue.toFixed(2)) : 0,
    drivingTime: drivingSeconds / 60,
    totalIdlingTime: idlingSeconds / 60,
    totalStoppageTime: stoppageSeconds / 60,
    playbackData: {
      path: processedPath,
      movingPath: processedMovingPath,
      startTime,
      endTime,
      duration: playbackDuration,
    },
  };
}
