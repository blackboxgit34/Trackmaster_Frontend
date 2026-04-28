import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { routeData } from '@/data/routeData';
import { actualVehicles } from '@/data/mockData';
import { parseISO, isWithinInterval, startOfDay, endOfDay, differenceInSeconds, parse, format } from 'date-fns';
import { Loader } from 'lucide-react';
import PlaybackSidebar from './playback/PlaybackSidebar';
import PlaybackMap from './playback/PlaybackMap';
import PlaybackTimeline from './playback/PlaybackTimeline';
import { calculateBearing } from '@/lib/map-utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { VehicleCombobox } from '../VehicleCombobox';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const RoutePlayback = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const dateFromUrl = searchParams.get('date');

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(vehicleFromUrl || actualVehicles[0]?.id || null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (dateFromUrl) {
      try {
        return parse(dateFromUrl, 'yyyy-MM-dd', new Date());
      } catch (e) { console.error("Invalid date in URL", e); }
    }
    return new Date();
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);

  const animationFrameId = useRef<number>();
  const playbackStartTime = useRef<number>(0);
  const lastPausedTime = useRef<number>(0);

  const { playbackData, summary } = useMemo(() => {
    if (!selectedVehicle || !selectedDate) return { playbackData: null, summary: null };
    
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const tripsInRange = routeData
        .filter(trip => trip.vehicleId === selectedVehicle && isWithinInterval(parseISO(trip.date), { start, end }))
        .sort((a, b) => parseISO(a.path[0].timestamp).getTime() - parseISO(b.path[0].timestamp).getTime());

    if (tripsInRange.length === 0) return { playbackData: null, summary: null };

    const vehicleInfo = actualVehicles.find(v => v.id === selectedVehicle);
    const tankCapacity = vehicleInfo?.fuelTankCapacity || 300;

    const combinedPath = tripsInRange.flatMap(trip => trip.path);
    if (combinedPath.length === 0) return { playbackData: null, summary: null };

    let currentFuel = tankCapacity * 0.8;
    let cumulativeDistance = 0;
    const processedPath: any[] = [];
    let totalStoppages = 0;
    let totalIdlingSeconds = 0;
    let totalStoppageSeconds = 0;

    for (let i = 0; i < combinedPath.length; i++) {
      const point = combinedPath[i];
      if (i > 0) {
        const prevPoint = combinedPath[i-1];
        const timeDeltaSeconds = differenceInSeconds(parseISO(point.timestamp), parseISO(prevPoint.timestamp));
        const timeDeltaHours = timeDeltaSeconds / 3600;
        if (prevPoint.speed > 0) {
          cumulativeDistance += prevPoint.speed * timeDeltaHours;
          const consumptionRate = 5 + (prevPoint.speed / 10);
          currentFuel -= consumptionRate * timeDeltaHours;
        }
        if (prevPoint.speed === 0) {
          totalStoppageSeconds += timeDeltaSeconds;
          if (prevPoint.engineStatus === 'ON') {
            totalIdlingSeconds += timeDeltaSeconds;
          }
          if (i > 1 && combinedPath[i-2].speed > 0) { // Start of a stop
            totalStoppages++;
          }
        }
      }
      processedPath.push({
        ...point,
        distance: cumulativeDistance,
        fuel: Math.max(0, currentFuel),
        fuelPercentage: Math.round(Math.max(0, currentFuel) / tankCapacity * 100),
      });
    }

    const startTime = processedPath[0].timestamp;
    const endTime = processedPath[processedPath.length - 1].timestamp;
    const duration = differenceInSeconds(parseISO(endTime), parseISO(startTime));
    const drivingTimeSeconds = duration - totalStoppageSeconds;

    return {
      playbackData: { path: processedPath, startTime, endTime, duration },
      summary: {
        vehicleName: vehicleInfo?.name || selectedVehicle,
        totalDistance: cumulativeDistance,
        totalDuration: duration / 60, // in minutes
        totalStoppages,
        totalIdling: totalIdlingSeconds / 60, // in minutes
        totalStoppageTime: totalStoppageSeconds / 60,
        drivingTime: drivingTimeSeconds / 60,
      }
    };
  }, [selectedVehicle, selectedDate]);

  const currentDataPoint = useMemo(() => {
    if (!playbackData) return null;
    const tripStart = parseISO(playbackData.path[0].timestamp).getTime();
    const targetTime = tripStart + playbackTime * 1000;

    for (let i = 0; i < playbackData.path.length - 1; i++) {
      const p1 = playbackData.path[i];
      const p2 = playbackData.path[i + 1];
      const t1 = parseISO(p1.timestamp).getTime();
      const t2 = parseISO(p2.timestamp).getTime();

      if (targetTime >= t1 && targetTime <= t2) {
        const ratio = (t2 - t1) === 0 ? 0 : (targetTime - t1) / (t2 - t1);
        const interpolate = (key: keyof typeof p1) => (p1[key] as number) + ((p2[key] as number) - (p1[key] as number)) * ratio;
        
        let bearing = 0;
        if (p1.lat !== p2.lat || p1.lng !== p2.lng) {
            bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        } else if (i > 0) {
            const prevP1 = playbackData.path[i-1];
            if (prevP1.lat !== p1.lat || prevP1.lng !== p1.lng) {
                bearing = calculateBearing(prevP1.lat, prevP1.lng, p1.lat, p1.lng);
            }
        }

        return { ...p1, lat: interpolate('lat'), lng: interpolate('lng'), speed: interpolate('speed'), fuel: interpolate('fuel'), fuelPercentage: interpolate('fuelPercentage'), bearing, distance: interpolate('distance') };
      }
    }
    return playbackData.path[playbackData.path.length - 1];
  }, [playbackData, playbackTime]);

  const updatePosition = useCallback((time: number) => {
    setPlaybackTime(time);
  }, []);

  const animate = useCallback(() => {
    const now = performance.now();
    const elapsedTime = (now - playbackStartTime.current) / 1000;
    const newPlaybackTime = lastPausedTime.current + elapsedTime * playbackSpeed;
    
    if (!playbackData || newPlaybackTime > playbackData.duration) {
      setIsPlaying(false);
      updatePosition(playbackData?.duration || 0);
      return;
    }
    updatePosition(newPlaybackTime);
    animationFrameId.current = requestAnimationFrame(animate);
  }, [playbackSpeed, playbackData, updatePosition]);

  useEffect(() => {
    if (isPlaying) {
      lastPausedTime.current = playbackTime;
      playbackStartTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
    return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
  }, [isPlaying, animate]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    lastPausedTime.current = 0;
  }, [playbackData]);

  const handleSliderChange = (time: number) => {
    setIsPlaying(false);
    updatePosition(time);
  };

  const vehicleType = useMemo(() => {
    if (!selectedVehicle) return 'mini-excavator';
    const vehicle = actualVehicles.find(m => m.id === selectedVehicle);
    return vehicle?.type.toLowerCase().replace(/\s+/g, '-') || 'mini-excavator';
  }, [selectedVehicle]);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={<div className="flex items-center justify-center h-full"><Loader className="animate-spin" /></div>}
    >
      <div className="flex h-full w-full bg-muted/40">
        {summary && playbackData ? (
          <PlaybackSidebar
            selectedVehicle={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            vehicleName={summary.vehicleName}
            totalDistance={summary.totalDistance}
            drivingTime={summary.drivingTime}
            totalStoppageTime={summary.totalStoppageTime}
            totalIdling={summary.totalIdling}
            path={playbackData.path}
          />
        ) : (
          <div className="w-[350px] flex-shrink-0 bg-card border-r flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center gap-2">
              <VehicleCombobox vehicles={actualVehicles.map(v => ({id: v.id, name: v.name}))} value={selectedVehicle || ''} onChange={setSelectedVehicle} className="w-full" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Select Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <p>No trip data found for the selected vehicle and date.</p>
            </div>
          </div>
        )}
        <div className="flex-1 relative bg-muted">
          {playbackData ? (
            <>
              <PlaybackMap
                tripPath={playbackData.path}
                markerPosition={currentDataPoint ? { lat: currentDataPoint.lat, lng: currentDataPoint.lng } : null}
                vehicleType={vehicleType}
                showFences={false}
                showPois={false}
                showLabels={true}
                showStoppages={true}
                currentBearing={currentDataPoint?.bearing || 0}
                isPlaying={isPlaying}
              />
              <PlaybackTimeline
                startTime={playbackData.startTime}
                endTime={playbackData.endTime}
                currentTime={playbackTime}
                isPlaying={isPlaying}
                speed={playbackSpeed}
                currentData={currentDataPoint}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSpeedChange={setPlaybackSpeed}
                onSliderChange={handleSliderChange}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-semibold">No Trip Data</h3>
                <p>No trips recorded for this vehicle on the selected date.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
};

export default RoutePlayback;