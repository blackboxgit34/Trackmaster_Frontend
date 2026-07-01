import { useState, useCallback, useEffect, useMemo, Fragment, memo, useRef } from 'react';
import { GoogleMap, Marker, OverlayView, Polygon, Circle } from '@react-google-maps/api';
import useSupercluster from 'use-supercluster';
import type { LiveVehicleStatus, VehicleStatus } from '@/types';
import { Button } from '../ui/button';
import { poiData } from '@/data/poiData';
import { geofenceMapData } from '@/data/geofenceMapData';
import { actualVehicles } from '@/data/mockData';
import { getStatusColor, getIconUrl, calculateHaversineDistance, getStatusStrokeColor, getStatusColorHex, getClusterBucket, getVehiclePngUrl, getMinimalDotUrl } from '@/lib/map-utils';
import { cn } from '@/lib/utils';
import { User, Phone, MapPin, Copy, X, Fuel, Thermometer, Signal, Battery, MessageCircle, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/SettingsContext';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const noLabelsStyle = [
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
];

const formatIdling = (hoursDecimal: number) => {
  if (!hoursDecimal || hoursDecimal === 0) return '0m';
  const hrs = Math.floor(hoursDecimal);
  const mins = Math.round((hoursDecimal - hrs) * 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const getMockMobile = (driverName: string | null | undefined) => {
  if (!driverName) return '';
  let hash = 0;
  for (let i = 0; i < driverName.length; i++) {
    hash = driverName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const num = Math.abs(hash).toString().substring(0, 8).padEnd(8, '0');
  return `+9198${num}`;
};

const getStatusBadgeClasses = (status: string) => {
  const styles: Record<string, string> = {
    Moving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Parked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Ignition On': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    Unreachable: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
    'Battery Disconnect': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    Breakdown: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'High Speed': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    Towed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    Idle: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  };
  return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
};



const VehiclePopup = memo(({
  activeVehicle,
  nearbyPoi,
  onClose,
  onViewTelemetry,
  isMinimal
}: {
  activeVehicle: LiveVehicleStatus,
  nearbyPoi: any,
  onClose: () => void,
  onViewTelemetry: (id: string) => void,
  isMinimal: boolean
}) => {
  const { toast } = useToast();

  const handleCopy = async (text: string, label: string) => { /* unchanged */ };

  const driverName = activeVehicle.driverName ?? null;
  // const driverPhone = activeVehicle. ?? null;

  const isFuelLow = activeVehicle.fuelLevel <= 20;
  const isTempHigh = activeVehicle.engineTemp > 95;
  const isBatteryLow = activeVehicle.battery <= 20;

  const transformOffset = isMinimal ? 'calc(-100% - 32px)' : 'calc(-100% - 56px)';

  return (
    <div style={{ position: 'absolute', transform: `translate(-50%, ${transformOffset})`, zIndex: 100 }}>
      <div className="relative w-[300px] sm:w-[320px] max-w-[90vw] bg-background text-foreground flex flex-col font-sans rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-2 right-2 p-1 bg-muted/50 hover:bg-muted rounded-full z-10 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>

        {/* HEADER: Vehicle & Status */}
        <div className="p-3 border-b pr-8">
          <div className="flex justify-between items-start gap-2">

            {/* Vehicle Icon & Details */}
            <div className="flex items-start gap-2.5 overflow-hidden flex-1">
              <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden p-1">
                <img
                  src={getVehiclePngUrl(activeVehicle.type)}
                  alt={activeVehicle.type}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=200&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0 pt-0.5">
                <h3 className="text-[15px] font-bold truncate leading-none mb-1.5 pr-4" title={activeVehicle.vehicleNo}>
                  {activeVehicle.vehicleNo}
                </h3>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  <span className="font-medium text-foreground/70">{activeVehicle.type}</span> • {activeVehicle.model}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                  ID: <span className="font-mono">{activeVehicle.id}</span>
                </p>
              </div>
            </div>

            {/* Status & Speed */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap",
                getStatusBadgeClasses(activeVehicle.status)
              )}>
                {activeVehicle.status}
              </span>
              <div className="text-xl font-bold leading-none mt-1">
                {activeVehicle.speed} <span className="text-[10px] font-semibold text-muted-foreground">km/h</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center mt-2.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", getStatusColor(activeVehicle.status))}></span>
              Updated: {activeVehicle.lastUpdated}
            </span>
          </div>
        </div>

        {/* MIDDLE: Operations & Driver */}
        <div className="p-3 space-y-2 border-b">

          {/* Driver Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="truncate">
                {driverName ? (
                  <p className="text-[11px] font-semibold truncate leading-none">{driverName}</p>
                ) : (
                  <p className="text-[11px] font-semibold text-red-500 leading-none">Unassigned</p>
                )}
              </div>
              {/* <div className="truncate">
                {activeVehicleDetails?.driver ? (
                  <p className="text-[11px] font-semibold truncate leading-none">{activeVehicleDetails.driver}</p>
                ) : (
                  <p className="text-[11px] font-semibold text-red-500 leading-none">Unassigned</p>
                )}
              </div> */}
            </div>
            {/* {driverPhone && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="outline" className="h-6 w-6 rounded-full border-blue-500/30 text-blue-600 hover:bg-blue-50" asChild>
                  <a href={`tel:${driverPhone}`}><Phone className="w-3 h-3" /></a>
                </Button>
                <Button size="icon" variant="outline" className="h-6 w-6 rounded-full border-green-500/30 text-green-600 hover:bg-green-50" asChild>
                  <a href={`https://wa.me/${driverPhone.replace('+', '')}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3 h-3" /></a>
                </Button>
              </div>
            )} */}
          </div>

          {/* Quick Stats inline */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
            <span>Dist: <strong className="text-foreground">{activeVehicle.distance.toFixed(1)} km</strong></span>
            <span>Idle: <strong className="text-foreground">{formatIdling(activeVehicle.idlingHours)}</strong></span>
          </div>

          {/* Location Info (Single Line) */}
          <div className="flex items-center gap-1.5 text-xs bg-muted/20 p-1.5 rounded">
            <MapPin className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span className="truncate flex-1" title={activeVehicle.location}>{activeVehicle.location}</span>
            <div className="flex gap-0.5 shrink-0">
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopy(activeVehicle.location, 'Location')} title="Copy Location">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5" asChild title="View on Google Maps">
                <a href={`https://www.google.com/maps/search/?api=1&query=${activeVehicle.lat},${activeVehicle.lng}`} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-3 w-3 text-blue-500" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* DIAGNOSTICS (Inline Row) */}
        <div className="flex justify-between items-center text-[11px] font-semibold px-4 py-2 border-b bg-muted/5">
          <span className={cn("flex items-center gap-1", isFuelLow ? "text-red-500" : "text-muted-foreground")} title="Fuel Level">
            <Fuel className="w-3 h-3 text-orange-500" /> {activeVehicle.fuelLevel}Ltr.
          </span>
          <span className={cn("flex items-center gap-1", isTempHigh ? "text-red-500" : "text-muted-foreground")} title="Engine Temp">
            <Thermometer className="w-3 h-3 text-red-500" /> {activeVehicle.engineTemp}°
          </span>
          <span className={cn("flex items-center gap-1", isBatteryLow ? "text-red-500" : "text-muted-foreground")} title="Battery Level">
            <Battery className="w-3 h-3 text-green-500" /> {activeVehicle.battery}%
          </span>
          <span className="flex items-center gap-1 text-muted-foreground" title="GSM Signal">
            <Signal className="w-3 h-3 text-blue-500" /> {activeVehicle.gsmSignal}
          </span>
        </div>

        {/* ACTIONS */}
        <div className="p-2 flex gap-2">
          <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={() => onViewTelemetry(activeVehicle.id)}>
            Telemetry
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" asChild>
            <Link to={`/vehicle-status/route-playback?vehicle=${activeVehicle.vehicleNo}`}>
              Playback
            </Link>
          </Button>
        </div>

      </div>
      {/* Pointer triangle */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border-b border-r border-border transform rotate-45 z-0" />
    </div>
  );
});
VehiclePopup.displayName = 'VehiclePopup';


// --- Main Map Component ---
interface MapComponentProps {
  machines: LiveVehicleStatus[];
  selectedMachineId: string | null;
  onMarkerClick: (machineId: string) => void;
  showLabels: boolean;
  autoZoom: boolean;
  showPois: boolean;
  showFences: boolean;
  onMapLoad: (map: google.maps.Map) => void;
}

const AnimatedVehicleMarker = memo(({
  vehicle,
  isActive,
  isMapMovingRef,
  onClick,
  activeFrames,
  rippleFrame,
  minimal
}: {
  vehicle: LiveVehicleStatus;
  isActive: boolean;
  isMapMovingRef: React.MutableRefObject<boolean>;
  onClick: (id: string) => void;
  activeFrames?: string[];
  rippleFrame?: number;
  minimal: boolean;
}) => {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const haloRef = useRef<google.maps.Marker | null>(null);

  const [position, setPosition] = useState({ lat: vehicle.lat, lng: vehicle.lng });
  const isAnimatingRef = useRef(false);
  const rafIdRef = useRef<number>();
  const lastUpdateRef = useRef(performance.now());
  const prevTargetRef = useRef({ lat: vehicle.lat, lng: vehicle.lng });

  useEffect(() => {
    const end = { lat: vehicle.lat, lng: vehicle.lng };
    const start = prevTargetRef.current;

    if (start.lat === end.lat && start.lng === end.lng) return;

    prevTargetRef.current = end;

    if (!markerRef.current) {
      setPosition(end);
      return;
    }

    const dist = calculateHaversineDistance(start.lat, start.lng, end.lat, end.lng);
    const now = performance.now();
    const timeDeltaMs = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    const speedKmh = (dist / (Math.max(timeDeltaMs, 1) / 1000 / 3600));

    if (dist > 1.0 || speedKmh > 150) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      markerRef.current.setPosition(end);
      if (haloRef.current) haloRef.current.setPosition(end);
      setPosition(end);
      return;
    }

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    isAnimatingRef.current = true;

    const duration = Math.min(Math.max(timeDeltaMs, 300), 800);
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);

      if (!isMapMovingRef.current) {
        const nextLat = start.lat + (end.lat - start.lat) * progress;
        const nextLng = start.lng + (end.lng - start.lng) * progress;
        const newPos = { lat: nextLat, lng: nextLng };

        markerRef.current?.setPosition(newPos);
        if (haloRef.current) haloRef.current.setPosition(newPos);
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        setPosition(end);
      }
    };
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [vehicle.lat, vehicle.lng]);

  const haloUrl = !minimal && activeFrames && rippleFrame !== undefined ? activeFrames[rippleFrame] : null;

  const iconProps = useMemo(() => {
    if (minimal) {
      return {
        url: getMinimalDotUrl(vehicle.status),
        anchor: new window.google.maps.Point(16, 16),
      };
    }
    return {
      url: getIconUrl(vehicle.type, vehicle.status),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 40),
    };
  }, [minimal, vehicle.status, vehicle.type]);

  return (
    <Fragment>
      {isActive && haloUrl && (
        <Marker
          onLoad={m => { haloRef.current = m; }}
          position={position}
          icon={{
            url: haloUrl,
            anchor: new window.google.maps.Point(32, 52), // Adjusted to perfectly center behind the 40x40 marker
          }}
          zIndex={40}
          optimized={true}
        />
      )}
      <Marker
        onLoad={m => { markerRef.current = m; }}
        position={position}
        icon={iconProps}
        onClick={() => onClick(vehicle.id)}
        zIndex={isActive ? 50 : 20}
       optimized={true}
      />
    </Fragment>
  );
}, (prev, next) => {
  return prev.vehicle.id === next.vehicle.id &&
    prev.vehicle.lat === next.vehicle.lat &&
    prev.vehicle.lng === next.vehicle.lng &&
    prev.vehicle.status === next.vehicle.status &&
    prev.isActive === next.isActive &&
    prev.rippleFrame === next.rippleFrame &&
    prev.minimal === next.minimal;
});

const MapComponent = ({ machines: vehicles, selectedMachineId: selectedVehicleId, onMarkerClick, showLabels, autoZoom, showPois, showFences, onMapLoad }: MapComponentProps) => {
  const { uiSettings } = useSettings();
  const minimalMapIcons = uiSettings?.minimalMapIcons ?? false;

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const isMapMovingRef = useRef(false);

  const [zoom, setZoom] = useState(5);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  const [rippleFrame, setRippleFrame] = useState(0);

  // Phase 2 Stability Refs
  const updateInProgressRef = useRef(false);
  const prevCenterRef = useRef<google.maps.Point | null>(null);
  const prevZoomRef = useRef(5);
  const accumulatedDeltaRef = useRef({ x: 0, y: 0 });
  const lastUpdateTimeRef = useRef(Date.now());
  const priorityQueueRef = useRef<'idle' | 'drag' | null>(null);

  // Ref for debouncing drag/bounds_changed
  const debounceRef = useRef<NodeJS.Timeout>();
  const clusterIconCache = useRef(new Map<number, string>());
  const activeFramesCache = useRef(new Map<string, string[]>());

  const ACTIVE_RIPPLE_FRAMES_COUNT = 10;

  const generateRippleFrames = useCallback((colorHex: string) => {
    const frames = [];
    const size = 64;
    for (let i = 0; i < ACTIVE_RIPPLE_FRAMES_COUNT; i++) {
      const progress = i / ACTIVE_RIPPLE_FRAMES_COUNT;
      const r = 12 + progress * 18;
      const opacity = 1 - progress;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${colorHex}" fill-opacity="${opacity * 0.4}" stroke="${colorHex}" stroke-width="2" stroke-opacity="${opacity * 0.8}" />
          <circle cx="${size / 2}" cy="${size / 2}" r="12" fill="${colorHex}" fill-opacity="0.8" />
        </svg>`;
      frames.push(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }
    return frames;
  }, []);

  const getRippleFrames = useCallback((status: string) => {
    if (!activeFramesCache.current.has(status)) {
      const colorHex = getStatusColorHex(status as any);
      activeFramesCache.current.set(status, generateRippleFrames(colorHex));
    }
    return activeFramesCache.current.get(status)!;
  }, [generateRippleFrames]);

  const getClusterIconProps = useCallback((pointCount: number) => {
    const bucket = getClusterBucket(pointCount);
    let size = Math.min(60, Math.max(36, 30 + (bucket / 500) * 40));
    if (!clusterIconCache.current.has(bucket)) {
      const displayCount = bucket === pointCount ? pointCount : `${bucket}+`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#2563eb" fill-opacity="0.9" stroke="#ffffff" stroke-width="2" />
        <text x="50%" y="50%" font-family="sans-serif" font-size="${size * 0.35}px" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${displayCount}</text>
      </svg>`;
      clusterIconCache.current.set(bucket, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }
    return {
      url: clusterIconCache.current.get(bucket)!,
      anchor: new window.google.maps.Point(size / 2, size / 2)
    };
  }, []);

  useEffect(() => {
    if (!activeMarker) return;

    let frame = 0;
    const interval = setInterval(() => {
      if (!isMapMovingRef.current) {
        frame = (frame + 1) % ACTIVE_RIPPLE_FRAMES_COUNT;
        setRippleFrame(frame);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeMarker]);

  const defaultCenter = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: showLabels ? undefined : noLabelsStyle,
  }), [showLabels]);

  const fenceOptions = useMemo(() => ({ fillColor: '#8B5CF6', fillOpacity: 0.2, strokeColor: '#8B5CF6', strokeOpacity: 1, strokeWeight: 2 }), []);

  const vehicleDetailsMap = useMemo(() => {
    return new Map(actualVehicles.map(v => [v.id, v]));
  }, []);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    onMapLoad(mapInstance);
  }, [onMapLoad]);

  const onUnmount = useCallback(() => setMap(null), []);

  const commitBoundsUpdate = useCallback((newBounds: google.maps.LatLngBounds, newZoom: number) => {
    if (updateInProgressRef.current) return;
    updateInProgressRef.current = true;

    accumulatedDeltaRef.current = { x: 0, y: 0 };
    lastUpdateTimeRef.current = Date.now();
    priorityQueueRef.current = null;

    setZoom(newZoom);
    const ne = newBounds.getNorthEast();
    const sw = newBounds.getSouthWest();
    setBounds([sw.lng(), sw.lat(), ne.lng(), ne.lat()]);

    requestAnimationFrame(() => {
      updateInProgressRef.current = false;
    });
  }, []);

  const checkBoundsThreshold = useCallback(() => {
    if (!map) return;
    const projection = map.getProjection();
    const currentCenterLatLng = map.getCenter();
    if (!projection || !currentCenterLatLng) return;

    const currentCenter = projection.fromLatLngToPoint(currentCenterLatLng);
    const newBounds = map.getBounds();
    const newZoom = map.getZoom() || 5;

    if (!currentCenter || !newBounds) return;

    if (!prevCenterRef.current || prevZoomRef.current !== newZoom) {
      prevCenterRef.current = currentCenter;
      prevZoomRef.current = newZoom;
      commitBoundsUpdate(newBounds, newZoom);
      return;
    }

    const dx = Math.abs(currentCenter.x - prevCenterRef.current.x);
    const dy = Math.abs(currentCenter.y - prevCenterRef.current.y);
    prevCenterRef.current = currentCenter;

    const scale = Math.pow(2, newZoom);
    accumulatedDeltaRef.current.x += dx * scale;
    accumulatedDeltaRef.current.y += dy * scale;

    const PIXEL_THRESHOLD = 50;
    const maxStaleness = 1500;
    const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;

    const exceedsThreshold = accumulatedDeltaRef.current.x > PIXEL_THRESHOLD || accumulatedDeltaRef.current.y > PIXEL_THRESHOLD;
    const isStale = timeSinceLastUpdate > maxStaleness;

    if (exceedsThreshold || (isStale && !isMapMovingRef.current)) {
      commitBoundsUpdate(newBounds, newZoom);
    }
  }, [map, commitBoundsUpdate]);

  const onIdle = useCallback(() => {
    isMapMovingRef.current = false;
    priorityQueueRef.current = 'idle';
    checkBoundsThreshold();
  }, [checkBoundsThreshold]);

  const onZoomChanged = useCallback(() => {
    isMapMovingRef.current = true;
  }, []);

  const onBoundsChanged = useCallback(() => {
    if (!priorityQueueRef.current) {
      priorityQueueRef.current = 'drag';
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkBoundsThreshold();
    }, 200);
  }, [checkBoundsThreshold]);

  const handleDragStart = useCallback(() => {
    setUserInteracted(true);
    isMapMovingRef.current = true;
  }, []);

  const points = useMemo(() => {
    return vehicles.map(vehicle => ({
      type: 'Feature' as const,
      properties: { cluster: false, vehicleId: vehicle.id, vehicle },
      geometry: { type: 'Point' as const, coordinates: [vehicle.lng, vehicle.lat] }
    }));
  }, [vehicles]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || undefined,
    zoom,
    options: { radius: 60, maxZoom: 18 }
  });

  const handleMarkerClick = useCallback((vehicleId: string) => {
    onMarkerClick(vehicleId);
    setActiveMarker(vehicleId);
    setUserInteracted(true);
  }, [onMarkerClick]);

  const handleClusterClick = useCallback((clusterId: number) => {
    if (map && supercluster) {
      const leaves = supercluster.getLeaves(clusterId, Infinity);
      const clusterBounds = new window.google.maps.LatLngBounds();
      leaves.forEach((leaf) => {
        const [lng, lat] = leaf.geometry.coordinates;
        clusterBounds.extend(new window.google.maps.LatLng(lat, lng));
      });
      map.fitBounds(clusterBounds);
      setUserInteracted(true);
    }
  }, [map, supercluster]);

  // Auto-zooming behavior based on vehicles
  useEffect(() => {
    if (map && vehicles.length > 0 && autoZoom && !userInteracted && !selectedVehicleId) {
      const bounds = new window.google.maps.LatLngBounds();
      vehicles.forEach(vehicle => {
        bounds.extend(new window.google.maps.LatLng(vehicle.lat, vehicle.lng));
      });
      map.fitBounds(bounds);
    }
  }, [map, vehicles, autoZoom, userInteracted, selectedVehicleId]);

  useEffect(() => {
    if (autoZoom) setUserInteracted(false);
  }, [autoZoom]);

  useEffect(() => {
    if (map && selectedVehicleId) {
      const vehicle = vehicles.find(m => m.id === selectedVehicleId);
      if (vehicle) {
        const zoomLevel = 16;
        map.setZoom(zoomLevel);
        const projection = map.getProjection();
        if (projection) {
          const scale = Math.pow(2, zoomLevel);
          const centerPoint = projection.fromLatLngToPoint(new window.google.maps.LatLng(vehicle.lat, vehicle.lng));
          if (centerPoint) {
            const offsetPoint = new window.google.maps.Point(
              centerPoint.x,
              centerPoint.y - (150 / scale)
            );
            const offsetLatLng = projection.fromPointToLatLng(offsetPoint);
            if (offsetLatLng) {
              map.panTo(offsetLatLng);
            } else {
              map.panTo({ lat: vehicle.lat, lng: vehicle.lng });
            }
          }
        } else {
          map.panTo({ lat: vehicle.lat, lng: vehicle.lng });
        }
        setActiveMarker(vehicle.id);
        setUserInteracted(true);
      }
    }
  }, [map, selectedVehicleId, vehicles]);

  const activeVehicle = useMemo(() => activeMarker ? vehicles.find(m => m.id === activeMarker) : null, [activeMarker, vehicles]);
  const activeVehicleDetails = useMemo(() => activeVehicle ? vehicleDetailsMap.get(activeVehicle.vehicleNo) : null, [activeVehicle, vehicleDetailsMap]);

  const nearbyPoi = useMemo(() => {
    if (!activeVehicle || !showPois) return null;
    return poiData.find(poi => {
      const distanceKm = calculateHaversineDistance(activeVehicle.lat, activeVehicle.lng, poi.latitude, poi.longitude);
      return distanceKm <= (poi.radius / 1000);
    });
  }, [activeVehicle, showPois]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={onIdle}
      onDragStart={handleDragStart}
      onZoomChanged={onZoomChanged}
      onBoundsChanged={onBoundsChanged}
      options={mapOptions}
    >
      {clusters.map(cluster => {
        const [lng, lat] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount, cluster_id: clusterId } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={{ lat, lng }}
              icon={getClusterIconProps(pointCount)}
              onClick={() => handleClusterClick(clusterId)}
              zIndex={30}
              optimized={true}
            />
          );
        }

        const vehicle = cluster.properties.vehicle as LiveVehicleStatus;
        const isActive = activeMarker === vehicle.id;
        const isRippleEligible = isActive && (vehicle.status === 'Moving' || vehicle.status === 'High Speed');

        return (
          <AnimatedVehicleMarker
            key={`vehicle-${vehicle.id}`}
            vehicle={vehicle}
            isActive={isActive}
            isMapMovingRef={isMapMovingRef}
            onClick={handleMarkerClick}
            activeFrames={isRippleEligible ? getRippleFrames(vehicle.status) : undefined}
            rippleFrame={isRippleEligible ? rippleFrame : undefined}
            minimal={minimalMapIcons}
          />
        );
      })}

      {/* Render POIs */}
      {showPois && zoom > 10 && poiData.map(poi => (
        <Fragment key={`poi-${poi.id}`}>
          <Marker position={{ lat: poi.latitude, lng: poi.longitude }} />
          <OverlayView position={{ lat: poi.latitude, lng: poi.longitude }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div style={{ position: 'absolute', transform: 'translateX(-50%)', bottom: '40px', background: 'rgba(255, 255, 255, 0.9)', padding: '2px 8px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', border: '1px solid rgba(0,0,0,0.1)' }}>
              {poi.poiName}
            </div>
          </OverlayView>
        </Fragment>
      ))}

      {/* Render Fences */}
      {showFences && geofenceMapData.map(fence => {
        if (!fence.isActive) return null;
        if (fence.type === 'polygon' && fence.paths) return <Polygon key={fence.id} paths={fence.paths} options={fenceOptions} />;
        if (fence.type === 'circle' && fence.center && fence.radius) return <Circle key={fence.id} center={fence.center} radius={fence.radius} options={fenceOptions} />;
        return null;
      })}

      {/* Active Vehicle Popup */}
      {activeVehicle && (
        <OverlayView position={{ lat: activeVehicle.lat, lng: activeVehicle.lng }} mapPaneName={OverlayView.FLOAT_PANE}>
          <VehiclePopup
            activeVehicle={activeVehicle}
            activeVehicleDetails={activeVehicleDetails}
            nearbyPoi={nearbyPoi}
            onClose={() => setActiveMarker(null)}
            onViewTelemetry={onMarkerClick}
            isMinimal={minimalMapIcons}
          />
        </OverlayView>
      )}
    </GoogleMap>
  );
};

export default memo(MapComponent);