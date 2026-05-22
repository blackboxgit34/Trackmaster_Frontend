import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { parseISO, parse, format } from 'date-fns';
import { fetchAndCalculatePlaybackData } from '@/lib/playback-utils';

import { Loader, Calendar as CalendarIcon } from 'lucide-react';

import PlaybackSidebar from './playback/PlaybackSidebar';
import PlaybackMap from './playback/PlaybackMap';
import PlaybackTimeline from './playback/PlaybackTimeline';

import { calculateBearing } from '@/lib/map-utils';

import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

import { Calendar } from '../ui/calendar';
import { VehicleCombobox } from '../VehicleCombobox';

import { API_BASE_URL } from '@/config/Api';
import { formatISO } from 'date-fns';
import '@/css/print.css';
const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const RoutePlayback = () => {
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalIdlingTime, setTotalIdlingTime] = useState(0);
  const [totalStoppageTime, setTotalStoppageTime] = useState(0);
  const [drivingTime, setDrivingTime] = useState(0);

  const [searchParams] = useSearchParams();

  const vehicleFromUrl = searchParams.get('vehicle');
  const dateFromUrl = searchParams.get('date');

  const [vehicles, setVehicles] = useState<{ label: string; value: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (dateFromUrl) {
      try {
        return parse(dateFromUrl, 'yyyy-MM-dd', new Date());
      } catch {
        return new Date();
      }
    }

    return new Date();
  });

  const [playbackData, setPlaybackData] = useState<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showIdleStops, setShowIdleStops] = useState(true);

  const [showNormalStops, setShowNormalStops] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);

  const animationFrameId = useRef<number>();
  const playbackStartTime = useRef<number>(0);
  const lastPausedTime = useRef<number>(0);

  // ================= VEHICLES =================

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');

        const custId = auth.custId;

        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );

        const data = await response.json();

        const formattedVehicles = (data.data || []).map((v: any) => ({
          label: v.vehName,
          value: v.bbid,
        }));

        setVehicles(formattedVehicles);

        if (formattedVehicles.length > 0) {
          setSelectedVehicle(vehicleFromUrl || formattedVehicles[0].value);
        }
      } catch (error) {
        console.error('Vehicle API Error', error);
      }
    };

    loadVehicles();
  }, []);

  // ================= PLAYBACK =================

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const stats = await fetchAndCalculatePlaybackData(selectedVehicle!, selectedDate!);
        if (!cancelled) {
          setTotalDistance(stats.totalDistance);
          setDrivingTime(stats.drivingTime);
          setTotalIdlingTime(stats.totalIdlingTime);
          setTotalStoppageTime(stats.totalStoppageTime);
          setPlaybackData(stats.playbackData);
          setPlaybackTime(0);
          setIsPlaying(false);
          lastPausedTime.current = 0;
        }
      } catch (error) {
        if (!cancelled) {
          setPlaybackData(null);
          setTotalDistance(0);
          setDrivingTime(0);
          setTotalIdlingTime(0);
          setTotalStoppageTime(0);
        }
        console.error('Playback API Error:', error);
      }
    }
    if (selectedVehicle && selectedDate) {
      load();
    } else {
      setPlaybackData(null);
      setTotalDistance(0);
      setDrivingTime(0);
      setTotalIdlingTime(0);
      setTotalStoppageTime(0);
    }
    return () => {
      cancelled = true;
    };
  }, [selectedVehicle, selectedDate, vehicles]);

  // ================= CURRENT POINT =================

  const currentDataPoint = useMemo(() => {
    if (!playbackData?.movingPath?.length) return null;

    let accumulated = 0;

    for (let i = 0; i < playbackData.movingPath.length - 1; i++) {
      const p1 = playbackData.movingPath[i];
      const p2 = playbackData.movingPath[i + 1];

      const t1 = parseISO(p1.timestamp).getTime();
      const t2 = parseISO(p2.timestamp).getTime();

      const segmentSeconds = (t2 - t1) / 1000;

      // ONLY MOVING SEGMENTS
      const isMovingSegment =
        Number(p1.speed) > 0 &&
        Number(p2.speed) > 0;

      if (!isMovingSegment || segmentSeconds <= 0) {
        continue;
      }

      // FOUND CURRENT PLAYBACK SEGMENT
      if (
        playbackTime >= accumulated &&
        playbackTime <= accumulated + segmentSeconds
      ) {
        const localTime = playbackTime - accumulated;

        const ratio =
          segmentSeconds === 0
            ? 0
            : localTime / segmentSeconds;

        const interpolate = (
          key: keyof typeof p1
        ) =>
          (p1[key] as number) +
          ((p2[key] as number) -
            (p1[key] as number)) *
          ratio;

        let bearing = 0;

        if (
          p1.lat !== p2.lat ||
          p1.lng !== p2.lng
        ) {
          bearing = calculateBearing(
            p1.lat,
            p1.lng,
            p2.lat,
            p2.lng
          );
        }

        return {
          ...p1,
          lat: interpolate('lat'),
          lng: interpolate('lng'),
          speed: interpolate('speed'),
          distance: interpolate('distance'),
          bearing,
        };
      }

      accumulated += segmentSeconds;
    }

    return playbackData.movingPath[
      playbackData.movingPath.length - 1
    ];
  }, [playbackData, playbackTime]);
  // ================= PLAYBACK CONTROLS =================

  const updatePosition = useCallback((time: number) => {
    setPlaybackTime(time);
  }, []);

  const animate = useCallback(() => {
    const now = performance.now();

    const elapsedTime =
      (now - playbackStartTime.current) / 1000;

    const newPlaybackTime =
      lastPausedTime.current + elapsedTime * playbackSpeed;

    if (!playbackData || newPlaybackTime > playbackData.duration) {
      setIsPlaying(false);

      updatePosition(playbackData?.duration || 0);

      return;
    }

    updatePosition(newPlaybackTime);

    animationFrameId.current =
      requestAnimationFrame(animate);
  }, [playbackSpeed, playbackData, updatePosition]);

  useEffect(() => {
    if (isPlaying) {
      lastPausedTime.current = playbackTime;

      playbackStartTime.current = performance.now();

      animationFrameId.current =
        requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, animate]);

  const handleSliderChange = (time: number) => {
    setIsPlaying(false);
    updatePosition(time);
  };

  const vehicleType = useMemo(() => {
    return 'car';
  }, []);

  const handlePrint = () => {

    const appSidebar =
      document.querySelector('aside');

    const appHeader =
      document.querySelector('header');

    if (appSidebar) {
      (appSidebar as HTMLElement).style.display =
        'none';
    }

    if (appHeader) {
      (appHeader as HTMLElement).style.display =
        'none';
    }

    document.body.classList.add('printing');

    setTimeout(() => {

      window.print();

      document.body.classList.remove('printing');

      if (appSidebar) {
        (appSidebar as HTMLElement).style.display =
          '';
      }

      if (appHeader) {
        (appHeader as HTMLElement).style.display =
          '';
      }

    }, 500);
  };
  const handleExportExcel = async () => {
    try {
      if (!selectedVehicle || !selectedDate) return;

      const date = format(selectedDate, 'yyyy-MM-dd');

      const url =
        `${API_BASE_URL}/VehicleStatus/GetPlaybackData` +
        `?bbid=${selectedVehicle}` +
        `&date=${date}` +
        `&downloadType=Excel`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download excel');
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download url
      const downloadUrl = window.URL.createObjectURL(blob);

      // Create temp anchor
      const link = document.createElement('a');

      link.href = downloadUrl;

      link.download =
        `RoutePlayback_${selectedVehicle}_${date}.xlsx`;

      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Export Excel Error:', error);
    }
  };
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin" />
        </div>
      }
    >
      <div className="flex h-full w-full bg-muted/40 print-area">
        {playbackData ? (
          <PlaybackSidebar
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            vehicleName={
              vehicles.find(v => v.value === selectedVehicle)?.label ||
              selectedVehicle ||
              ''
            }
            totalDistance={totalDistance}
            drivingTime={drivingTime}
            totalStoppageTime={totalStoppageTime}
            totalIdling={totalIdlingTime}
            path={playbackData.path}
            onPrint={handlePrint}
            onExportExcel={handleExportExcel}
          />
        ) : (
          <div className="w-[350px] flex-shrink-0 bg-card border-r flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center gap-2">
              <VehicleCombobox
                vehicles={vehicles}
                value={selectedVehicle || ''}
                onChange={setSelectedVehicle}
                className="w-full"
              />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {selectedDate
                      ? format(selectedDate, 'dd MMM yyyy')
                      : 'Select Date'}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
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
                tripPath={playbackData.movingPath}
                fullPath={playbackData.path}
                markerPosition={
                  currentDataPoint
                    ? {
                      lat: currentDataPoint.lat,
                      lng: currentDataPoint.lng,
                    }
                    : null
                }
                vehicleType={vehicleType}
                showFences={false}
                showPois={false}
                showLabels={true}
                showStoppages={true}
                showIdleStops={showIdleStops}
                showNormalStops={showNormalStops}
                currentBearing={currentDataPoint?.bearing || 0}
                isPlaying={isPlaying}
              />

              <PlaybackTimeline
                duration={playbackData.duration}
                currentTime={playbackTime}
                isPlaying={isPlaying}
                speed={playbackSpeed}
                currentData={currentDataPoint}
                startDistance={
                  playbackData.movingPath[0]?.distance || 0
                }
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSpeedChange={setPlaybackSpeed}
                onSliderChange={handleSliderChange}
              />
              <div className="absolute bottom-24 left-4 z-50 bg-white rounded-lg shadow-lg p-4 flex flex-col gap-3 min-w-[220px]">

                {/* ================= IDLE STOPS ================= */}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Idle Stops
                  </span>

                  <button
                    onClick={() =>
                      setShowIdleStops(!showIdleStops)
                    }
                    className={`px-3 py-1 rounded text-white text-xs transition-all duration-200 ${showIdleStops
                      ? 'bg-[#f97216]'
                      : 'bg-gray-400'
                      }`}
                  >
                    {showIdleStops ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* ================= NORMAL STOPS ================= */}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Normal Stops
                  </span>

                  <button
                    onClick={() =>
                      setShowNormalStops(!showNormalStops)
                    }
                    className={`px-3 py-1 rounded text-white text-xs transition-all duration-200 ${showNormalStops
                      ? 'bg-[#3b82f6]'
                      : 'bg-gray-400'
                      }`}
                  >
                    {showNormalStops ? 'ON' : 'OFF'}
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="flex items-center justify-cent  er h-full">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-semibold">No Trip Data</h3>

                <p>
                  No trips recorded for this vehicle on the selected date.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
};

export default RoutePlayback;