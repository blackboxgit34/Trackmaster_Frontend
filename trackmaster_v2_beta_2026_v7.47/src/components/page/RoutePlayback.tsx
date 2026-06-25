import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { API_BASE_URL } from '@/config/Api';
import { parseISO, differenceInSeconds, parse, format, formatISO } from 'date-fns';
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
import { Switch } from '@/components/ui/switch';
import { Settings2, Clock, FastForward, MapPin } from 'lucide-react';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

interface VehicleOption {
  id: string;
  name: string;
  type?: string;
}

interface ProcessedPoint {
  lat: number;
  lng: number;
  location: string;
  speed: number;
  timestamp: string;
  engineStatus: string;
  distance: number;
}

interface Stoppage {
  start: ProcessedPoint;
  end: ProcessedPoint;
  type: 'idle' | 'normal';
  points: ProcessedPoint[];
  duration: number;
  center: { lat: number; lng: number };
}

interface PlaybackData {
  path: ProcessedPoint[];
  startTime: string;
  endTime: string;
  duration: number;
  stoppages: Stoppage[];
}

interface Summary {
  vehicleName: string;
  totalDistance: number;
  totalDuration: number;
  totalStoppages: number;
  totalIdling: number;
  totalStoppageTime: number;
  drivingTime: number;
}

const RoutePlayback = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const dateFromUrl = searchParams.get('date');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // ─── Vehicle list from API ───────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = auth.custId;
        if (!custId) return;

        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        // Adapt to whatever shape the API returns; adjust field names as needed
        const list: VehicleOption[] = (data?.data || data || []).map((v: any) => ({
          id: String(v.bbid ?? v.id ?? v.vehicleId),
          name: String(v.vehicleName ?? v.name ?? v.bbid),
          type: v.vehicleType ?? v.type ?? '',
        }));
        setVehicles(list);
      } catch (err) {
        console.error('Failed to load vehicle list:', err);
      } finally {
        setVehiclesLoading(false);
      }
    };
    loadVehicles();
  }, []);

  // ─── Selection state ─────────────────────────────────────────────────────
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(vehicleFromUrl || null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (dateFromUrl) {
      try { return parse(dateFromUrl, 'yyyy-MM-dd', new Date()); } catch { /* ignore */ }
    }
    return new Date();
  });

  // Once vehicles load, default to first if nothing selected
  useEffect(() => {
    if (!selectedVehicle && vehicles.length > 0) {
      setSelectedVehicle(vehicles[0].id);
    }
  }, [vehicles, selectedVehicle]);

  // ─── Playback API fetch ───────────────────────────────────────────────────
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!selectedVehicle || !selectedDate) return;

    const fetchPlayback = async () => {
      setDataLoading(true);
      setPlaybackData(null);
      setSummary(null);
      setPlaybackTime(0);
      lastPausedTime.current = 0;
      setIsPlaying(false);

      try {
        const date = format(selectedDate, 'yyyy-MM-dd');
        const url = `${API_BASE_URL}/VehicleStatus/GetPlaybackData?bbid=${selectedVehicle}&date=${date}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
          setDataLoading(false);
          return;
        }

        // ── Build processedPath ──────────────────────────────────────────
        const processedPath: ProcessedPoint[] = data.data.map((item: any) => ({
          lat: Number(item.latitude),
          lng: Number(item.longitude),
          location: item.location ?? '',
          speed: Number(item.speed || 0),
          timestamp: formatISO(new Date(item.datadate)),
          engineStatus: String(item.acignition).toUpperCase() === 'ON' ? 'ON' : 'OFF',
          distance: Number(item.distance || 0),
        }));

        processedPath.sort(
          (a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
        );

        // ── Stats (distance / driving / idling / stoppage) ───────────────
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
              const speed = current.speed;
              const engineOn = current.engineStatus === 'ON';
              if (speed > 0) drivingSeconds += diff;
              if (speed === 0 && engineOn) idlingSeconds += diff;
              if (speed === 0) stoppageSeconds += diff;
            }
          }
          const currentDistance = current.distance;
          if (current.speed > 0 && !flag) {
            sdist = i === 0 ? currentDistance : processedPath[i - 1]?.distance ?? 0;
            flag = true;
          } else if (current.speed > 0 && flag) {
            edist = currentDistance;
          } else if (current.speed <= 0 && flag) {
            edist = currentDistance;
            const tripDist = Number((edist - sdist).toFixed(1));
            if (tripDist > 0 && tripDist < 500) totalDistanceValue += tripDist;
            flag = false;
          }
        }
        if (flag) {
          const tripDist = Number((edist - sdist).toFixed(1));
          if (tripDist > 0 && tripDist < 500) totalDistanceValue += tripDist;
        }

        // ── Unified stoppages (for map markers + sidebar) ────────────────
        const unifiedStoppages: Stoppage[] = [];
        let currentStop: any = null;
        let totalStoppages = 0;
        let totalStoppageSecondsForCount = 0;
        let totalIdlingSecondsForCount = 0;

        for (let i = 1; i < processedPath.length; i++) {
          const point = processedPath[i];
          if (point.speed === 0) {
            if (!currentStop) {
              currentStop = { start: point, end: point, type: point.engineStatus === 'ON' ? 'idle' : 'normal', points: [point] };
            } else {
              currentStop.end = point;
              currentStop.points.push(point);
              if (point.engineStatus === 'ON' && currentStop.type === 'normal') currentStop.type = 'idle';
            }
          } else {
            if (currentStop) {
              const stopDur = differenceInSeconds(parseISO(currentStop.end.timestamp), parseISO(currentStop.start.timestamp));
              if (stopDur > 60) {
                totalStoppageSecondsForCount += stopDur;
                if (currentStop.type === 'idle') totalIdlingSecondsForCount += stopDur;
                totalStoppages++;
                const avgLat = currentStop.points.reduce((s: number, p: any) => s + p.lat, 0) / currentStop.points.length;
                const avgLng = currentStop.points.reduce((s: number, p: any) => s + p.lng, 0) / currentStop.points.length;
                unifiedStoppages.push({ ...currentStop, duration: stopDur, center: { lat: avgLat, lng: avgLng } });
              }
              currentStop = null;
            }
          }
        }
        if (currentStop) {
          const stopDur = differenceInSeconds(parseISO(currentStop.end.timestamp), parseISO(currentStop.start.timestamp));
          if (stopDur > 60) {
            totalStoppageSecondsForCount += stopDur;
            if (currentStop.type === 'idle') totalIdlingSecondsForCount += stopDur;
            totalStoppages++;
            const avgLat = currentStop.points.reduce((s: number, p: any) => s + p.lat, 0) / currentStop.points.length;
            const avgLng = currentStop.points.reduce((s: number, p: any) => s + p.lng, 0) / currentStop.points.length;
            unifiedStoppages.push({ ...currentStop, duration: stopDur, center: { lat: avgLat, lng: avgLng } });
          }
        }

        const startTime = processedPath[0].timestamp;
        const endTime = processedPath[processedPath.length - 1].timestamp;
        const totalDuration = differenceInSeconds(parseISO(endTime), parseISO(startTime));

        const vehicleInfo = vehicles.find(v => v.id === selectedVehicle);

        setPlaybackData({
          path: processedPath,
          startTime,
          endTime,
          duration: drivingSeconds, // playback duration = driving seconds (matches original logic)
          stoppages: unifiedStoppages,
        });

        setSummary({
          vehicleName: vehicleInfo?.name || selectedVehicle,
          totalDistance: totalDistanceValue > 0 ? Number(totalDistanceValue.toFixed(2)) : 0,
          totalDuration: totalDuration / 60,
          totalStoppages,
          totalIdling: idlingSeconds / 60,
          totalStoppageTime: stoppageSeconds / 60,
          drivingTime: drivingSeconds / 60,
        });
      } catch (err) {
        console.error('Failed to fetch playback data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchPlayback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, selectedDate]);

  // ─── Playback controls ───────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);

  const [showStoppages, setShowStoppages] = useState(true);
  const [showIdleStoppages, setShowIdleStoppages] = useState(true);
  const [skipStoppages, setSkipStoppages] = useState(false);

  const animationFrameId = useRef<number>();
  const playbackStartTime = useRef<number>(0);
  const lastPausedTime = useRef<number>(0);

  const updatePosition = useCallback((time: number) => {
    setPlaybackTime(time);
  }, []);

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
        const ratio = t2 === t1 ? 0 : (targetTime - t1) / (t2 - t1);
        const interp = (key: keyof ProcessedPoint) =>
          (p1[key] as number) + ((p2[key] as number) - (p1[key] as number)) * ratio;

        let bearing = 0;
        if (p1.lat !== p2.lat || p1.lng !== p2.lng) {
          bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        } else if (i > 0) {
          const prev = playbackData.path[i - 1];
          if (prev.lat !== p1.lat || prev.lng !== p1.lng) {
            bearing = calculateBearing(prev.lat, prev.lng, p1.lat, p1.lng);
          }
        }

        return {
          ...p1,
          lat: interp('lat'),
          lng: interp('lng'),
          speed: interp('speed'),
          distance: interp('distance'),
          bearing,
        };
      }
    }
    return { ...playbackData.path[playbackData.path.length - 1], bearing: 0 };
  }, [playbackData, playbackTime]);

  const activeStoppage = useMemo(() => {
    if (!playbackData || !currentDataPoint || currentDataPoint.speed > 0) return null;
    const targetTs = new Date(currentDataPoint.timestamp).getTime();
    return playbackData.stoppages.find((stop) => {
      const startTs = new Date(stop.start.timestamp).getTime();
      const endTs = new Date(stop.end.timestamp).getTime();
      return targetTs >= startTs && targetTs <= endTs;
    }) ?? null;
  }, [playbackData, currentDataPoint]);

  const handleSkipStoppage = useCallback(() => {
    if (!playbackData || !activeStoppage) return;
    const tripStart = new Date(playbackData.startTime).getTime();
    const stopEndTs = new Date(activeStoppage.end.timestamp).getTime();
    const stopEndIndex = playbackData.path.findIndex(
      (p) => new Date(p.timestamp).getTime() === stopEndTs
    );
    let jumpTs = stopEndTs;
    if (stopEndIndex !== -1 && stopEndIndex < playbackData.path.length - 1) {
      jumpTs = new Date(playbackData.path[stopEndIndex + 1].timestamp).getTime();
    }
    const newTime = (jumpTs - tripStart) / 1000;
    if (isPlaying) {
      lastPausedTime.current = newTime;
      playbackStartTime.current = performance.now();
    }
    updatePosition(newTime);
  }, [activeStoppage, playbackData, isPlaying, updatePosition]);

  const animate = useCallback(() => {
    const now = performance.now();
    const elapsed = (now - playbackStartTime.current) / 1000;
    let newTime = lastPausedTime.current + elapsed * playbackSpeed;

    if (!playbackData || newTime > playbackData.duration) {
      setIsPlaying(false);
      updatePosition(playbackData?.duration || 0);
      return;
    }

    if (skipStoppages) {
      const tripStart = new Date(playbackData.startTime).getTime();
      const newTargetTime = tripStart + newTime * 1000;
      const visibleStops = playbackData.stoppages.filter(
        (s) => showIdleStoppages || s.type !== 'idle'
      );
      const activeStop = visibleStops.find((stop) => {
        const startTs = new Date(stop.start.timestamp).getTime();
        const endTs = new Date(stop.end.timestamp).getTime();
        return newTargetTime >= startTs && newTargetTime <= endTs;
      });
      if (activeStop) {
        const stopEndTs = new Date(activeStop.end.timestamp).getTime();
        const stopEndIdx = playbackData.path.findIndex(
          (p) => new Date(p.timestamp).getTime() === stopEndTs
        );
        let jumpTs = stopEndTs;
        if (stopEndIdx !== -1 && stopEndIdx < playbackData.path.length - 1) {
          jumpTs = new Date(playbackData.path[stopEndIdx + 1].timestamp).getTime();
        }
        const jumpTime = (jumpTs - tripStart) / 1000;
        lastPausedTime.current = jumpTime;
        playbackStartTime.current = performance.now();
        newTime = jumpTime;
      }
    }

    updatePosition(newTime);
    animationFrameId.current = requestAnimationFrame(animate);
  }, [playbackSpeed, playbackData, updatePosition, skipStoppages, showIdleStoppages]);

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

  const handleSliderChange = (time: number) => {
    setIsPlaying(false);
    updatePosition(time);
  };

  const vehicleType = useMemo(() => {
    if (!selectedVehicle) return 'mini-excavator';
    const v = vehicles.find(m => m.id === selectedVehicle);
    return v?.type?.toLowerCase().replace(/\s+/g, '-') || 'mini-excavator';
  }, [selectedVehicle, vehicles]);

  // ─── Loading states ───────────────────────────────────────────────────────
  if (!isLoaded || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-muted/40">
      {/* Sidebar */}
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
          unifiedStoppages={playbackData.stoppages}
        />
      ) : (
        <div className="w-[350px] flex-shrink-0 bg-card border-r flex flex-col h-full overflow-hidden p-4">
          <div className="flex items-center gap-2">
            <VehicleCombobox
              vehicles={vehicles.map(v => ({ id: v.id, name: v.name }))}
              value={selectedVehicle || ''}
              onChange={setSelectedVehicle}
              className="w-full"
            />
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
            {dataLoading ? (
              <Loader className="animate-spin" />
            ) : (
              <p>No trip data found for the selected vehicle and date.</p>
            )}
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative bg-muted">
        {dataLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="animate-spin text-muted-foreground" />
          </div>
        ) : playbackData ? (
          <>
            <PlaybackMap
              tripPath={playbackData.path}
              markerPosition={currentDataPoint ? { lat: currentDataPoint.lat, lng: currentDataPoint.lng } : null}
              vehicleType={vehicleType}
              showFences={false}
              showPois={false}
              showLabels={true}
              showStoppages={showStoppages}
              currentBearing={currentDataPoint?.bearing || 0}
              isPlaying={isPlaying}
              unifiedStoppages={playbackData.stoppages.filter(
                (s) => showIdleStoppages || s.type !== 'idle'
              )}
              activeStoppage={activeStoppage}
              onSkipStoppage={handleSkipStoppage}
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

            {/* Settings popover */}
            <div className="absolute top-4 right-4 z-10">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-10 h-10 rounded-xl shadow-lg border-2 bg-background hover:bg-background/90 border-transparent text-foreground"
                  >
                    <Settings2 className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 mr-4 p-4 shadow-xl border-border/50 rounded-xl" align="end">
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Settings2 className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold tracking-tight text-sm">Playback Preferences</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <label htmlFor="show-stoppages" className="text-sm font-medium cursor-pointer leading-none">
                              Show All Stoppages
                            </label>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-6 leading-tight">
                            Display markers for all vehicle stop events along the route.
                          </p>
                        </div>
                        <Switch id="show-stoppages" checked={showStoppages} onCheckedChange={setShowStoppages} />
                      </div>

                      <div className={`flex items-center justify-between gap-4 transition-opacity ${!showStoppages ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <label htmlFor="show-idle" className="text-sm font-medium cursor-pointer leading-none">
                              Show Idle Stops
                            </label>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-6 leading-tight">
                            Include stops where the engine was left running.
                          </p>
                        </div>
                        <Switch
                          id="show-idle"
                          checked={showIdleStoppages}
                          onCheckedChange={setShowIdleStoppages}
                          disabled={!showStoppages}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <FastForward className="w-4 h-4 text-muted-foreground" />
                            <label htmlFor="skip-stoppages" className="text-sm font-medium cursor-pointer leading-none">
                              Auto-skip Stoppages
                            </label>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-6 leading-tight">
                            Automatically fast-forward through stoppage times.
                          </p>
                        </div>
                        <Switch id="skip-stoppages" checked={skipStoppages} onCheckedChange={setSkipStoppages} />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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
  );
};

export default RoutePlayback;