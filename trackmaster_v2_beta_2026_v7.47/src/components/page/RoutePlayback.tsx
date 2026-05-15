import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { parseISO, differenceInSeconds, parse, format } from 'date-fns';

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

  // ================= PLAYBACK =================

  useEffect(() => {
    const loadPlaybackData = async () => {
      try {
        if (!selectedVehicle || !selectedDate) return;

        const date = format(selectedDate, 'yyyy-MM-dd');

        const url = `${API_BASE_URL}/VehicleStatus/GetPlaybackData?bbid=${selectedVehicle}&date=${date}`;

        console.log('Playback API URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status} ${response.statusText}`
          );
        }

        const text = await response.text();

        const data = text ? JSON.parse(text) : null;

        if (!data || !data.data || !Array.isArray(data.data)) {
          resetPlaybackStats();
          return;
        }

        if (data.data.length === 0) {
          resetPlaybackStats();
          return;
        }

        // ================= FULL PATH =================

        const processedPath = data.data.map((item: any) => ({
          lat: Number(item.latitude),
          lng: Number(item.longitude),
          location: item.location,
          speed: Number(item.speed || 0),
          timestamp: formatISO(new Date(item.datadate)),
          engineStatus:
            String(item.acignition).toUpperCase() === 'ON'
              ? 'ON'
              : 'OFF',
          distance: Number(item.distance || 0),
        }));

        processedPath.sort(
          (
            a: (typeof processedPath)[0],
            b: (typeof processedPath)[0]
          ) =>
            parseISO(a.timestamp).getTime() -
            parseISO(b.timestamp).getTime()
        );

        // ================= MOVING PATH =================

        const processedMovingPath = data.movingData.map((item: any) => ({
          lat: Number(item.latitude),
          lng: Number(item.longitude),
          location: item.location,
          speed: Number(item.speed || 0),
          timestamp: formatISO(new Date(item.datadate)),
          engineStatus:
            String(item.acignition).toUpperCase() === 'ON'
              ? 'ON'
              : 'OFF',
          distance: Number(item.distance || 0),
        }));

        processedMovingPath.sort(
          (
            a: (typeof processedMovingPath)[0],
            b: (typeof processedMovingPath)[0]
          ) =>
            parseISO(a.timestamp).getTime() -
            parseISO(b.timestamp).getTime()
        );

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

          // ================= TIME CALCULATIONS =================

          if (next) {
            const diff = differenceInSeconds(
              parseISO(next.timestamp),
              parseISO(current.timestamp)
            );

            if (diff > 0) {
              const speed = Number(current.speed || 0);

              const engineStatus = String(
                current.engineStatus
              ).toUpperCase();

              // ================= DRIVING =================

              if (speed > 0) {
                drivingSeconds += diff;
              }

              // ================= IDLING =================

              if (
                speed === 0 &&
                engineStatus === 'ON'
              ) {
                idlingSeconds += diff;
              }

              // ================= STOPPAGE =================

              if (speed === 0) {
                stoppageSeconds += diff;
              }
            }
          }

          // ================= DISTANCE =================

          const speed = Number(current.speed || 0);

          const currentDistance = Number(
            current.distance || 0
          );

          // START MOVEMENT

          if (speed > 0 && flag === false) {
            if (i === 0) {
              sdist = currentDistance;
            } else {
              sdist = Number(
                processedPath[i - 1]?.distance || 0
              );
            }

            flag = true;
          }

          // CONTINUE MOVEMENT

          else if (speed > 0 && flag === true) {
            edist = currentDistance;
          }

          // STOP MOVEMENT

          else if (speed <= 0 && flag === true) {
            edist = currentDistance;

            const tripDistance = Number(
              (edist - sdist).toFixed(1)
            );

            if (
              tripDistance > 0 &&
              tripDistance < 500
            ) {
              totalDistanceValue += tripDistance;
            }

            flag = false;
          }
        }

        // HANDLE LAST RUNNING SESSION

        if (flag === true) {
          const tripDistance = Number(
            (edist - sdist).toFixed(1)
          );

          if (
            tripDistance > 0 &&
            tripDistance < 500
          ) {
            totalDistanceValue += tripDistance;
          }
        }

        // ================= FINAL VALUES =================

        setTotalDistance(
          totalDistanceValue > 0
            ? Number(totalDistanceValue.toFixed(2))
            : 0
        );

        setDrivingTime(drivingSeconds / 60);

        setTotalIdlingTime(idlingSeconds / 60);

        setTotalStoppageTime(stoppageSeconds / 60);

        // ================= PLAYBACK DATA =================
        // TIMELINE SAME AS DRIVING TIME

        const startTime =
          processedMovingPath[0]?.timestamp ||
          processedPath[0].timestamp;

        const endTime =
          processedMovingPath[
            processedMovingPath.length - 1
          ]?.timestamp ||
          processedPath[processedPath.length - 1]
            .timestamp;

        const playbackDuration = drivingSeconds;

        setPlaybackData({
          path: processedPath,
          movingPath: processedMovingPath,
          startTime,
          endTime,
          duration: playbackDuration,
        });

        // ================= RESET =================

        setPlaybackTime(0);

        setIsPlaying(false);

        lastPausedTime.current = 0;
      } catch (error) {
        console.error('Playback API Error:', error);

        resetPlaybackStats();
      }
    };

    const resetPlaybackStats = () => {
      setPlaybackData(null);

      setTotalDistance(0);

      setDrivingTime(0);

      setTotalIdlingTime(0);

      setTotalStoppageTime(0);
    };

    loadPlaybackData();
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
      <div className="flex h-full w-full bg-muted/40">
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