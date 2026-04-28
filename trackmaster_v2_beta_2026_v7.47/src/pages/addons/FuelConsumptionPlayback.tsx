import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { actualVehicles, fuelFillingDetails, fuelTheftDetails } from '@/data/mockData';
import { routeData } from '@/data/routeData';
import { parseISO, isWithinInterval, startOfDay, endOfDay, differenceInSeconds, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Loader } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { calculateBearing } from '@/lib/map-utils';
import { useTheme } from '@/components/theme-provider';

import FuelPlaybackControlPanel from '@/components/page/addons/fuel-playback/FuelPlaybackControlPanel';
import FuelPlaybackChart from '@/components/page/addons/fuel-playback/FuelPlaybackChart';
import FuelPlaybackMap from '@/components/page/addons/fuel-playback/FuelPlaybackMap';
import FuelPlaybackTimeline from '@/components/page/addons/fuel-playback/FuelPlaybackTimeline';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const FuelConsumptionPlayback = () => {
  const { menuPosition } = useTheme();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(actualVehicles[0]?.id ?? null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const animationFrameId = useRef<number>();
  const playbackStartTime = useRef<number>(0);
  const lastPausedTime = useRef<number>(0);
  const prevIsPlaying = useRef(false);

  const playbackData = useMemo(() => {
    if (!selectedVehicle || !dateRange?.from) return null;

    const vehicleInfo = actualVehicles.find(v => v.id === selectedVehicle);
    if (!vehicleInfo) return null;

    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    const pathPoints = routeData
      .filter(trip => trip.vehicleId === selectedVehicle && isWithinInterval(parseISO(trip.date), { start, end }))
      .flatMap(trip => trip.path)
      .map(p => ({ ...p, type: 'path', timestamp: parseISO(p.timestamp).getTime() }));

    const fillingEvents = fuelFillingDetails
      .filter(e => e.vehicleId === selectedVehicle && isWithinInterval(parseISO(e.date), { start, end }))
      .map(e => ({
        timestamp: parseISO(e.beforeFillingDate).getTime(),
        type: 'event',
        event: { type: 'filling', amount: e.filling, beforeLevel: e.beforeFilling, afterLevel: e.afterFilling, timestamp: parseISO(e.beforeFillingDate).getTime(), location: e.fillingStation },
      }));

    const theftEvents = fuelTheftDetails
      .filter(e => e.vehicleId === selectedVehicle && isWithinInterval(parseISO(e.date), { start, end }))
      .map(e => ({
        timestamp: parseISO(e.beforeDrainDate).getTime(),
        type: 'event',
        event: { type: 'drainage', amount: e.drainage, beforeLevel: e.beforeDrain, afterLevel: e.afterDrain, timestamp: parseISO(e.beforeDrainDate).getTime(), location: e.drainageLocation },
      }));

    const timeline = [...pathPoints, ...fillingEvents, ...theftEvents]
      .sort((a, b) => a.timestamp - b.timestamp);

    if (timeline.length < 2) return null;

    let currentFuel = vehicleInfo.fuelTankCapacity * 0.8;
    let cumulativeDistance = 0;
    let totalFuelConsumed = 0;
    const processedData: any[] = [];
    let lastKnownCoords = { lat: 0, lng: 0 };

    for (const point of timeline) {
        if ((point as any).type === 'path') {
            lastKnownCoords = { lat: (point as any).lat, lng: (point as any).lng };
            break;
        }
    }

    for (let i = 0; i < timeline.length; i++) {
      const point = timeline[i] as any;
      const timestamp = new Date(point.timestamp);

      if (point.type === 'path') {
        lastKnownCoords = { lat: point.lat, lng: point.lng };
      }

      if (i > 0) {
        const prevPoint = timeline[i - 1] as any;
        const prevTimestamp = new Date(prevPoint.timestamp);
        const timeDeltaSeconds = differenceInSeconds(timestamp, prevTimestamp);
        const timeDeltaHours = timeDeltaSeconds / 3600;

        if (prevPoint.type === 'path' && prevPoint.speed > 0) {
          cumulativeDistance += prevPoint.speed * timeDeltaHours;
          const consumptionRate = 1.5 + (prevPoint.speed / 20);
          const consumed = consumptionRate * timeDeltaHours;
          currentFuel -= consumed;
          totalFuelConsumed += consumed;
        }
      }

      if (point.type === 'event') {
        if (point.event.type === 'filling') currentFuel = Math.min(vehicleInfo.fuelTankCapacity, currentFuel + point.event.amount);
        else if (point.event.type === 'drainage') currentFuel -= point.event.amount;
      }
      
      currentFuel = Math.max(0, currentFuel);

      processedData.push({
        time: format(timestamp, 'HH:mm'),
        timestamp: timestamp.getTime(),
        speed: point.speed ?? 0,
        engineStatus: point.engineStatus,
        distance: parseFloat(cumulativeDistance.toFixed(2)),
        fuel: parseFloat(currentFuel.toFixed(2)),
        location: point.location,
        event: point.type === 'event' ? point.event : null,
        lat: point.lat ?? lastKnownCoords.lat,
        lng: point.lng ?? lastKnownCoords.lng,
      });
    }

    const startTime = processedData[0].timestamp;
    const endTime = processedData[processedData.length - 1].timestamp;
    const duration = (endTime - startTime) / 1000;

    return {
      chartData: processedData,
      path: processedData.filter(p => p.lat && p.lng),
      events: processedData.filter(p => p.event).map(p => ({ ...p.event, lat: p.lat, lng: p.lng })),
      startTime,
      endTime,
      duration,
      totalDistance: cumulativeDistance,
      totalFuelConsumed: totalFuelConsumed,
      totalFilling: fillingEvents.reduce((sum, e) => sum + e.event.amount, 0),
      totalTheft: theftEvents.reduce((sum, e) => sum + e.event.amount, 0),
    };
  }, [selectedVehicle, dateRange]);

  const currentDataPoint = useMemo(() => {
    if (!playbackData) return null;
    const targetTime = playbackData.startTime + playbackTime * 1000;
    for (let i = 0; i < playbackData.chartData.length - 1; i++) {
      const p1 = playbackData.chartData[i];
      const p2 = playbackData.chartData[i + 1];
      if (targetTime >= p1.timestamp && targetTime <= p2.timestamp) {
        const ratio = (p2.timestamp - p1.timestamp) === 0 ? 0 : (targetTime - p1.timestamp) / (p2.timestamp - p1.timestamp);
        const interpolate = (key: string) => p1[key] + (p2[key] - p1[key]) * ratio;
        
        let bearing = 0;
        if (p1.lat !== p2.lat || p1.lng !== p2.lng) {
            bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        } else if (i > 0) {
            const prevP1 = playbackData.chartData[i-1];
            if (prevP1.lat !== p1.lat || prevP1.lng !== p1.lng) {
                bearing = calculateBearing(prevP1.lat, prevP1.lng, p1.lat, p1.lng);
            }
        }

        return {
          ...p1,
          fuel: interpolate('fuel'),
          speed: interpolate('speed'),
          distance: interpolate('distance'),
          lat: interpolate('lat'),
          lng: interpolate('lng'),
          bearing,
        };
      }
    }
    return playbackData.chartData[playbackData.chartData.length - 1];
  }, [playbackData, playbackTime]);

  useEffect(() => {
    if (isPlaying && !prevIsPlaying.current && map && currentDataPoint) {
      map.setZoom(25);
      map.setCenter({ lat: currentDataPoint.lat, lng: currentDataPoint.lng });
    }
    prevIsPlaying.current = isPlaying;
  }, [isPlaying, map, currentDataPoint]);

  const animate = useCallback(() => {
    const now = performance.now();
    const elapsedTime = (now - playbackStartTime.current) / 1000;
    const newPlaybackTime = lastPausedTime.current + elapsedTime * playbackSpeed;
    
    if (!playbackData || newPlaybackTime > playbackData.duration) {
      setIsPlaying(false);
      setPlaybackTime(playbackData?.duration || 0);
      return;
    }
    setPlaybackTime(newPlaybackTime);
    animationFrameId.current = requestAnimationFrame(animate);
  }, [playbackSpeed, playbackData]);

  useEffect(() => {
    if (isPlaying) {
      lastPausedTime.current = playbackTime;
      playbackStartTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, animate]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    lastPausedTime.current = 0;
  }, [playbackData]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries} loadingElement={<div className="flex items-center justify-center h-full"><Loader className="animate-spin" /></div>}>
      <div className="flex h-full w-full p-4 gap-4">
        <div className="w-[300px] flex-shrink-0 h-full">
          <FuelPlaybackControlPanel
            selectedVehicle={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            selectedDateRange={dateRange}
            onDateRangeChange={setDateRange}
            summary={playbackData}
          />
        </div>
        <div
          className="flex-1 relative flex flex-col overflow-hidden rounded-lg border bg-card"
        >
          {playbackData ? (
            <>
              <ResizablePanelGroup direction="vertical" className="flex-1" key={menuPosition}>
                <ResizablePanel defaultSize={50}>
                  <FuelPlaybackChart chartData={playbackData.chartData} currentTime={playbackData.startTime + playbackTime * 1000} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50}>
                  <FuelPlaybackMap
                    path={playbackData.path}
                    events={playbackData.events}
                    markerPosition={currentDataPoint ? { lat: currentDataPoint.lat, lng: currentDataPoint.lng } : null}
                    vehicleType={actualVehicles.find(v => v.id === selectedVehicle)?.type || ''}
                    currentBearing={currentDataPoint?.bearing || 0}
                    onLoad={setMap}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
              <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
                <FuelPlaybackTimeline
                  startTime={playbackData.startTime}
                  endTime={playbackData.endTime}
                  currentTime={playbackTime}
                  isPlaying={isPlaying}
                  speed={playbackSpeed}
                  currentData={currentDataPoint}
                  onPlayPause={() => setIsPlaying(!isPlaying)}
                  onSpeedChange={setPlaybackSpeed}
                  onSliderChange={(time) => { setIsPlaying(false); setPlaybackTime(time); }}
                  path={playbackData.chartData}
                  onSpeedSelectOpenChange={() => {}}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-semibold">Select a Trip</h3>
                <p>Choose a vehicle and date to begin playback.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
};

export default FuelConsumptionPlayback;