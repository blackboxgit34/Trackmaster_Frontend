import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoogleMap, Polyline, Marker, OverlayView } from '@react-google-maps/api';
import {
  Clock,
  MapPin,
  User,
  Gauge,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Maximize2,
  Layers,
  Copy,
  Check,
  Truck,
  AlertTriangle,
  Plus,
  Minus,
  Loader2,
  Route,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { API_BASE_URL } from '@/config/Api';

export interface SpeedLogDetail {
  id?: string | number;
  dateTime: string;
  location: string;
  latitude: number;
  longitude: number;
  speed: number;
  duration?: number | string;
  km?: number | string;
}

export interface OverspeedModalData {
  vehicleId: string;
  vehicleName: string;
  driverName?: string | null;
  overSpeedVal: number;
  selectedDetail: SpeedLogDetail;
  allDetails: SpeedLogDetail[];
}

interface OverspeedRouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OverspeedModalData | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const cleanMapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  scrollwheel: true,
  gestureHandling: 'greedy',
  disableDoubleClickZoom: false,
};

const parseDetailDate = (dateStr: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
};

const OverspeedRouteMapDialog: React.FC<OverspeedRouteMapDialogProps> = ({
  open,
  onOpenChange,
  data,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activePoint, setActivePoint] = useState<SpeedLogDetail | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [copied, setCopied] = useState(false);

  // Sync activePoint when data opens or changes
  useEffect(() => {
    if (data?.selectedDetail) {
      setActivePoint(data.selectedDetail);
    }
  }, [data]);

  const threshold = data?.overSpeedVal && data.overSpeedVal > 0 ? data.overSpeedVal : 60;

  // Chronologically sorted valid coordinate points
  const validPoints = useMemo(() => {
    if (!data?.allDetails || data.allDetails.length === 0) return [];
    return [...data.allDetails]
      .filter(
        (p) =>
          typeof p.latitude === 'number' &&
          typeof p.longitude === 'number' &&
          p.latitude !== 0 &&
          p.longitude !== 0 &&
          !isNaN(p.latitude) &&
          !isNaN(p.longitude)
      )
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime() || 0;
        const timeB = new Date(b.dateTime).getTime() || 0;
        return timeA - timeB;
      });
  }, [data?.allDetails]);

  // Find all overspeed points in the log
  const overspeedPoints = useMemo(() => {
    return validPoints.filter((p) => p.speed > threshold);
  }, [validPoints, threshold]);

  // Current active overspeed index among all overspeed events
  const currentOverspeedIndex = useMemo(() => {
    if (!activePoint) return -1;
    return overspeedPoints.findIndex(
      (p) =>
        p.dateTime === activePoint.dateTime &&
        p.latitude === activePoint.latitude &&
        p.longitude === activePoint.longitude
    );
  }, [overspeedPoints, activePoint]);

  // =========================================================================================
  // AUTHENTIC GPS PLAYBACK TRACK FETCHING & DUAL-COLOR ROUTE HIGHLIGHTING
  // =========================================================================================
  const [playbackPoints, setPlaybackPoints] = useState<{
    lat: number;
    lng: number;
    speed: number;
    dateTime: string;
    location?: string;
  }[]>([]);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const activeDate = useMemo(() => {
    return activePoint ? parseDetailDate(activePoint.dateTime) : null;
  }, [activePoint]);

  const activeDateStr = useMemo(() => {
    return activeDate ? format(activeDate, 'yyyy-MM-dd') : null;
  }, [activeDate]);

  // Fetch full continuous GPS track from playback API for the vehicle & date
  useEffect(() => {
    if (!open || !data?.vehicleId || !activeDateStr) {
      setPlaybackPoints([]);
      return;
    }

    let isCancelled = false;
    const fetchPlayback = async () => {
      setIsLoadingTrack(true);
      try {
        const url = `${API_BASE_URL}/VehicleStatus/GetPlaybackData?bbid=${data.vehicleId}&date=${activeDateStr}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const json = text ? JSON.parse(text) : null;
        const rawPoints = Array.isArray(json?.data) ? json.data : [];

        if (isCancelled) return;

        if (rawPoints.length > 0) {
          const mapped = rawPoints
            .map((item: any) => ({
              lat: Number(item.latitude),
              lng: Number(item.longitude),
              speed: Number(item.speed || 0),
              dateTime: item.datadate || item.dateTime || '',
              location: item.location || '',
            }))
            .filter(
              (p: any) =>
                !isNaN(p.lat) &&
                !isNaN(p.lng) &&
                p.lat !== 0 &&
                p.lng !== 0
            );

          mapped.sort((a: any, b: any) => {
            const tA = new Date(a.dateTime).getTime() || 0;
            const tB = new Date(b.dateTime).getTime() || 0;
            return tA - tB;
          });

          setPlaybackPoints(mapped);
        } else {
          setPlaybackPoints([]);
        }
      } catch (err) {
        console.error('Failed to load playback data for overspeed path:', err);
        if (!isCancelled) {
          setPlaybackPoints([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTrack(false);
        }
      }
    };

    fetchPlayback();

    return () => {
      isCancelled = true;
    };
  }, [open, data?.vehicleId, activeDateStr]);

  // Sliced display points around the active event's timestamp
  const displayPoints = useMemo(() => {
    if (playbackPoints.length >= 2) {
      if (!activeDate) return playbackPoints;
      const targetTime = activeDate.getTime();
      const WINDOW_MS = 25 * 60 * 1000; // 25 minutes before and after

      let windowed = playbackPoints.filter((p) => {
        const t = new Date(p.dateTime).getTime();
        return !isNaN(t) && Math.abs(t - targetTime) <= WINDOW_MS;
      });

      // If fewer than 15 points in the 25-min window, grab at least 35 points around the closest point
      if (windowed.length < 15 && playbackPoints.length > 0) {
        let closestIdx = 0;
        let minDiff = Infinity;
        playbackPoints.forEach((p, idx) => {
          const t = new Date(p.dateTime).getTime();
          const diff = Math.abs(t - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });

        const startIdx = Math.max(0, closestIdx - 35);
        const endIdx = Math.min(playbackPoints.length, closestIdx + 36);
        windowed = playbackPoints.slice(startIdx, endIdx);
      }

      if (windowed.length >= 2) {
        return windowed;
      }
      return playbackPoints;
    }

    // Fallback to table points if playback track is not available
    return validPoints.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      speed: p.speed,
      dateTime: p.dateTime,
      location: p.location,
    }));
  }, [playbackPoints, activeDate, validPoints]);

  // Continuous route segments grouped by speed status (Normal Blue vs Overspeed Red)
  const routeSegments = useMemo(() => {
    if (displayPoints.length < 2) return [];

    const segments: {
      path: { lat: number; lng: number }[];
      isOverspeed: boolean;
      maxSpeed: number;
    }[] = [];

    let currentPath: { lat: number; lng: number }[] = [];
    let currentIsOver = false;
    let currentMaxSpeed = 0;

    for (let i = 0; i < displayPoints.length - 1; i++) {
      const p1 = displayPoints[i];
      const p2 = displayPoints[i + 1];
      const isOver = p1.speed > threshold || p2.speed > threshold;
      const maxSpd = Math.max(p1.speed, p2.speed);

      if (currentPath.length === 0) {
        currentPath = [
          { lat: p1.lat, lng: p1.lng },
          { lat: p2.lat, lng: p2.lng },
        ];
        currentIsOver = isOver;
        currentMaxSpeed = maxSpd;
      } else if (currentIsOver === isOver) {
        currentPath.push({ lat: p2.lat, lng: p2.lng });
        currentMaxSpeed = Math.max(currentMaxSpeed, maxSpd);
      } else {
        segments.push({
          path: currentPath,
          isOverspeed: currentIsOver,
          maxSpeed: currentMaxSpeed,
        });
        currentPath = [
          { lat: p1.lat, lng: p1.lng },
          { lat: p2.lat, lng: p2.lng },
        ];
        currentIsOver = isOver;
        currentMaxSpeed = maxSpd;
      }
    }

    if (currentPath.length > 1) {
      segments.push({
        path: currentPath,
        isOverspeed: currentIsOver,
        maxSpeed: currentMaxSpeed,
      });
    }

    return segments;
  }, [displayPoints, threshold]);

  // Active point's exact position on the authentic GPS path
  const activeSnappedPos = useMemo(() => {
    if (!activePoint) return null;
    if (displayPoints.length > 0 && activeDate) {
      const t = activeDate.getTime();
      let closest = displayPoints[0];
      let minDiff = Infinity;
      displayPoints.forEach((p) => {
        const ptTime = new Date(p.dateTime).getTime();
        const diff = Math.abs(ptTime - t);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      });
      // Snap to closest GPS breadcrumb if within 3 minutes of the recorded log
      if (minDiff < 3 * 60 * 1000) {
        return { lat: closest.lat, lng: closest.lng };
      }
    }
    return {
      lat: activePoint.latitude,
      lng: activePoint.longitude,
    };
  }, [activePoint, displayPoints, activeDate]);

  // Overspeed violation points along the currently displayed path
  const displayedOverspeedPoints = useMemo(() => {
    return displayPoints.filter((p) => p.speed > threshold);
  }, [displayPoints, threshold]);

  // Pixel-perfect SVG marker icon with exact tip anchor at (14, 34)
  const activeMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    const isOver = activePoint && activePoint.speed > threshold;
    const fillColor = isOver ? '#DC2626' : '#2563EB';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 34" width="28" height="34">
        <defs>
          <filter id="p-sh" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.8 14 20 14 20s14-10.2 14-20c0-7.73-6.27-14-14-14z" fill="${fillColor}" stroke="#ffffff" stroke-width="1.8" filter="url(#p-sh)"/>
        <circle cx="14" cy="13" r="5" fill="#ffffff"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(28, 34),
      anchor: new window.google.maps.Point(14, 34),
    };
  }, [activePoint, threshold]);

  // Map center determination
  const defaultCenter = useMemo(() => {
    if (activeSnappedPos && activeSnappedPos.lat !== 0 && activeSnappedPos.lng !== 0) {
      return activeSnappedPos;
    }
    if (displayPoints.length > 0) {
      return { lat: displayPoints[0].lat, lng: displayPoints[0].lng };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [activeSnappedPos, displayPoints]);

  const fitAllBounds = useCallback(() => {
    if (!mapRef.current || displayPoints.length === 0) return;
    if (displayPoints.length === 1) {
      mapRef.current.setCenter({
        lat: displayPoints[0].lat,
        lng: displayPoints[0].lng,
      });
      mapRef.current.setZoom(16);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    displayPoints.forEach((p) => {
      bounds.extend({ lat: p.lat, lng: p.lng });
    });
    mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [displayPoints]);

  const centerOnActive = useCallback(() => {
    if (!mapRef.current || !activeSnappedPos) return;
    mapRef.current.panTo(activeSnappedPos);
    mapRef.current.setZoom(17);
  }, [activeSnappedPos]);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (activeSnappedPos && activeSnappedPos.lat !== 0 && activeSnappedPos.lng !== 0) {
        map.setCenter(activeSnappedPos);
        map.setZoom(16);
      } else if (displayPoints.length > 0) {
        fitAllBounds();
      }
    },
    [activeSnappedPos, displayPoints, fitAllBounds]
  );

  // Auto-fit or pan when display points change
  useEffect(() => {
    if (mapRef.current && displayPoints.length > 1) {
      fitAllBounds();
    } else if (mapRef.current && activeSnappedPos) {
      mapRef.current.panTo(activeSnappedPos);
      mapRef.current.setZoom(16);
    }
  }, [displayPoints, fitAllBounds, activeSnappedPos]);

  const toggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
    setMapType(nextType);
    if (mapRef.current) {
      mapRef.current.setMapTypeId(nextType);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const cur = mapRef.current.getZoom() || 16;
      mapRef.current.setZoom(Math.min(cur + 1, 21));
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const cur = mapRef.current.getZoom() || 16;
      mapRef.current.setZoom(Math.max(cur - 1, 1));
    }
  };

  const handleNavigateOverspeed = (direction: 'next' | 'prev') => {
    if (overspeedPoints.length === 0) return;
    let nextIdx = 0;
    if (direction === 'next') {
      nextIdx = currentOverspeedIndex >= overspeedPoints.length - 1 ? 0 : currentOverspeedIndex + 1;
    } else {
      nextIdx = currentOverspeedIndex <= 0 ? overspeedPoints.length - 1 : currentOverspeedIndex - 1;
    }
    const nextPoint = overspeedPoints[nextIdx];
    if (nextPoint) {
      setActivePoint(nextPoint);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: nextPoint.latitude, lng: nextPoint.longitude });
        mapRef.current.setZoom(17);
      }
    }
  };

  const handleCopyLocation = () => {
    if (activePoint?.location) {
      const cleanLoc = activePoint.location.replace(/<[^>]*>/g, '').trim();
      navigator.clipboard.writeText(cleanLoc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!data) return null;

  const currentSpeed = activePoint ? activePoint.speed : 0;
  const isCurrentOverspeed = currentSpeed > threshold;
  const speedDiff = currentSpeed - threshold;

  // Clean Driver name formatting to never show "undefined" or "null"
  const rawDriver = data.driverName?.trim();
  const hasValidDriver = rawDriver && rawDriver !== 'undefined' && rawDriver !== 'null' && rawDriver !== '';
  const displayDriver = hasValidDriver ? rawDriver : null;

  const maxRecordedSpeed = Math.max(...validPoints.map((p) => p.speed), currentSpeed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[94vw] h-[86vh] p-0 flex flex-col overflow-hidden bg-background border shadow-2xl rounded-2xl">
        {/* ========================================================
            CLEAN, MINIMAL HEADER
        ======================================================== */}
        <DialogHeader className="px-5 py-3.5 border-b bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border',
                  isCurrentOverspeed
                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900'
                    : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'
                )}
              >
                {isCurrentOverspeed ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base font-bold text-foreground">
                    {data.vehicleName}
                  </DialogTitle>
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                    {data.vehicleId}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {displayDriver && (
                    <>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {displayDriver}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    Limit: <strong className="text-foreground">{threshold} km/h</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {overspeedPoints.length} Overspeed Event{overspeedPoints.length === 1 ? '' : 's'}
                  </span>
                  <span>•</span>
                  <span>
                    Max: <strong className="text-foreground">{maxRecordedSpeed} km/h</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Top Status Pill (Clean & Non-distracting) */}
            <div className="self-start sm:self-center">
              {isCurrentOverspeed ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                  <span>Overspeeding ({currentSpeed} km/h)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 text-xs font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Normal Speed ({currentSpeed} km/h)</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            MAP DISPLAY AREA (Clean & Modern)
        ======================================================== */}
        <div className="flex-1 relative w-full h-full bg-slate-50 dark:bg-slate-900">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={16}
            options={cleanMapOptions}
            onLoad={handleMapLoad}
          >
            {/* 1. Normal Speed Polyline (Clean Blue) */}
            {routeSegments
              .filter((seg) => !seg.isOverspeed)
              .map((seg, idx) => (
                <Polyline
                  key={`norm-seg-${idx}`}
                  path={seg.path}
                  options={{
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                    zIndex: 2,
                  }}
                />
              ))}

            {/* 2. Overspeeding Route Polyline (Clean Solid Red, no blurry double glow) */}
            {routeSegments
              .filter((seg) => seg.isOverspeed)
              .map((seg, idx) => (
                <Polyline
                  key={`over-seg-${idx}`}
                  path={seg.path}
                  options={{
                    strokeColor: '#EF4444',
                    strokeOpacity: 1.0,
                    strokeWeight: 5,
                    zIndex: 10,
                  }}
                />
              ))}

            {/* 3. Start (A) and End (B) Route Markers */}
            {displayPoints.length > 1 && (
              <>
                <Marker
                  position={{
                    lat: displayPoints[0].lat,
                    lng: displayPoints[0].lng,
                  }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    scale: 8,
                    fillColor: '#16A34A',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  label={{
                    text: 'A',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: '10px',
                  }}
                  title="Route Start"
                />
                <Marker
                  position={{
                    lat: displayPoints[displayPoints.length - 1].lat,
                    lng: displayPoints[displayPoints.length - 1].lng,
                  }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    scale: 8,
                    fillColor: '#EF4444',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  label={{
                    text: 'B',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: '10px',
                  }}
                  title="Route End"
                />
              </>
            )}

            {/* 4. Violation Points along Route */}
            {displayedOverspeedPoints.map((point, idx) => {
              const isSelected =
                activeSnappedPos &&
                Math.abs(activeSnappedPos.lat - point.lat) < 0.0001 &&
                Math.abs(activeSnappedPos.lng - point.lng) < 0.0001;

              return (
                <Marker
                  key={`os-dot-${idx}`}
                  position={{ lat: point.lat, lng: point.lng }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    scale: isSelected ? 6.5 : 4.5,
                    fillColor: '#EF4444',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: isSelected ? 2.5 : 1.5,
                  }}
                  title={`${point.speed} km/h - ${point.dateTime}`}
                  onClick={() => {
                    setActivePoint({
                      id: idx,
                      dateTime: point.dateTime,
                      location: point.location || '',
                      latitude: point.lat,
                      longitude: point.lng,
                      speed: point.speed,
                    });
                  }}
                />
              );
            })}

            {/* 5. Selected Event Marker (Pixel-perfect anchor tip sitting directly on the line) */}
            {activeSnappedPos && activeSnappedPos.lat !== 0 && activeSnappedPos.lng !== 0 && (
              <>
                <Marker
                  position={activeSnappedPos}
                  icon={activeMarkerIcon}
                  zIndex={100}
                  onClick={centerOnActive}
                />

                {/* Floating Speed Tag Badge directly above pin */}
                <OverlayView
                  position={activeSnappedPos}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    style={{
                      position: 'absolute',
                      transform: 'translate(-50%, -46px)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-md border border-white/20">
                      {isCurrentOverspeed ? (
                        <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />
                      ) : (
                        <Gauge className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                      )}
                      <span>{activePoint ? activePoint.speed : 0} km/h</span>
                    </div>
                  </div>
                </OverlayView>
              </>
            )}
          </GoogleMap>

          {/* ========================================================
              MINIMAL TOP CONTROLS (Top-Left)
          ======================================================== */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border shadow-sm rounded-lg p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium gap-1 text-slate-700 dark:text-slate-200"
                      onClick={centerOnActive}
                    >
                      <Crosshair className="h-3.5 w-3.5 text-blue-600" />
                      <span>Center</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Focus on selected event</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {validPoints.length > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium gap-1 text-slate-700 dark:text-slate-200"
                        onClick={fitAllBounds}
                      >
                        <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                        <span>Fit</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit route to map</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <div className="w-px h-3.5 bg-border mx-0.5" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 px-2 text-xs font-medium gap-1 text-slate-700 dark:text-slate-200',
                        mapType === 'hybrid' && 'bg-slate-100 dark:bg-slate-800'
                      )}
                      onClick={toggleMapType}
                    >
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span>{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle map view</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="w-px h-3.5 bg-border mx-0.5" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-700 dark:text-slate-200"
                      onClick={handleZoomIn}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom in (+)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-700 dark:text-slate-200"
                      onClick={handleZoomOut}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom out (-)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* ========================================================
              CLEAN INLINE LEGEND (Top-Right)
          ======================================================== */}
          <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border shadow-sm rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-3 z-10">
            {isLoadingTrack && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-[11px]">Loading GPS Track...</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-full bg-red-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Overspeed (&gt;{threshold})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Normal (≤{threshold})
              </span>
            </div>
          </div>

          {/* Dedicated Floating Zoom Widget (Bottom-Right) */}
          <div className="absolute bottom-3 right-3 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border shadow-sm rounded-lg overflow-hidden z-10">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors border-b"
              title="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              title="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            CLEAN, MODERN BOTTOM DASHBOARD STRIP
        ======================================================== */}
        <div className="px-5 py-3.5 bg-card border-t shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Speed & Metrics Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-3xl font-extrabold tabular-nums tracking-tight leading-none',
                    isCurrentOverspeed ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                  )}
                >
                  {currentSpeed}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">km/h</span>
              </div>

              {isCurrentOverspeed ? (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                  +{speedDiff} km/h over limit
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  Within limit
                </span>
              )}

              {/* Time */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {activeDate ? format(activeDate, 'HH:mm:ss, dd MMM yyyy') : activePoint?.dateTime || '-'}
                </span>
              </div>

              {/* Duration of Overspeeding */}
              {activePoint?.duration !== undefined && activePoint?.duration !== '' && (
                <>
                  <div className="hidden md:block w-px h-6 bg-border mx-1" />
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Duration: <strong className="text-foreground">{String(activePoint.duration)}</strong></span>
                  </div>
                </>
              )}

              {/* Distance / KM */}
              {activePoint?.km !== undefined && activePoint?.km !== '' && (
                <>
                  <div className="hidden md:block w-px h-6 bg-border mx-1" />
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Route className="h-3.5 w-3.5 text-blue-500" />
                    <span>Distance: <strong className="text-foreground">{typeof activePoint.km === 'number' ? `${activePoint.km.toFixed(1)} km` : String(activePoint.km)}</strong></span>
                  </div>
                </>
              )}
            </div>

            {/* Recorded Location (Middle) */}
            <div className="flex-1 max-w-lg min-w-0 flex items-center gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <div
                className="truncate text-foreground font-medium"
                title={activePoint?.location?.replace(/<[^>]*>/g, '') || ''}
                dangerouslySetInnerHTML={{ __html: activePoint?.location || 'N/A' }}
              />
              <button
                onClick={handleCopyLocation}
                className="text-slate-400 hover:text-foreground shrink-0 transition-colors p-1"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Stepper Navigation (Right) */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {overspeedPoints.length > 0 && currentOverspeedIndex >= 0
                  ? `Event ${currentOverspeedIndex + 1} of ${overspeedPoints.length}`
                  : `${overspeedPoints.length} Violations`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-medium gap-1"
                  disabled={overspeedPoints.length <= 1}
                  onClick={() => handleNavigateOverspeed('prev')}
                  title="Previous overspeed event"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-medium gap-1"
                  disabled={overspeedPoints.length <= 1}
                  onClick={() => handleNavigateOverspeed('next')}
                  title="Next overspeed event"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OverspeedRouteMapDialog;
