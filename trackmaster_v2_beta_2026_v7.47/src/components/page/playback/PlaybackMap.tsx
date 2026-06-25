import { GoogleMap, Polyline, Marker, Polygon, Circle, OverlayView } from '@react-google-maps/api';
import type { TripPoint } from '@/data/routeData';
import { getStopMarkerIconUrl, getIconUrl } from '@/lib/map-utils';
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { geofenceMapData } from '@/data/geofenceMapData';
import { poiData } from '@/data/poiData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crosshair, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInSeconds } from 'date-fns';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const noLabelsStyle = [
  {
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },
];

interface PlaybackMapProps {
  tripPath: TripPoint[];
  markerPosition: { lat: number; lng: number } | null;
  vehicleType: string;
  showFences: boolean;
  showPois: boolean;
  showLabels: boolean;
  showStoppages: boolean;
  currentBearing: number;
  isPlaying: boolean;
  unifiedStoppages: any[];
  activeStoppage: any | null;
  onSkipStoppage: () => void;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const StaticLayers = React.memo(({ tripPath, showFences, showPois, showStoppages, unifiedStoppages }: any) => {
  const polylineOptions = { strokeColor: '#3B82F6', strokeOpacity: 0.8, strokeWeight: 4 };
  const fenceOptions = { fillColor: '#8B5CF6', fillOpacity: 0.2, strokeColor: '#8B5CF6', strokeOpacity: 1, strokeWeight: 2 };

  return (
    <>
      {tripPath.length > 0 && (
        <>
          <Polyline path={tripPath} options={polylineOptions} />
          <Marker position={tripPath[0]} label="A" />
          <Marker position={tripPath[tripPath.length - 1]} label="B" />
        </>
      )}

      {showStoppages && unifiedStoppages?.map((stop: any, index: number) => (
        <OverlayView key={`stop-${index}`} position={stop.center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <img src={getStopMarkerIconUrl(stop.type)} alt={`${stop.type} stop`} style={{ width: '32px', height: '32px', transform: 'translate(-50%, -100%)', cursor: 'pointer' }} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{stop.type === 'idle' ? 'Idle Stop' : 'Normal Stop'}: {formatDuration(stop.duration)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </OverlayView>
      ))}

      {showFences && geofenceMapData.map((fence) => {
        if (!fence.isActive) return null;
        if (fence.type === 'polygon' && fence.paths) return <Polygon key={fence.id} paths={fence.paths} options={fenceOptions} />;
        if (fence.type === 'circle' && fence.center && fence.radius) return <Circle key={fence.id} center={fence.center} radius={fence.radius} options={fenceOptions} />;
        return null;
      })}

      {showPois && poiData.map((poi) => (
        <React.Fragment key={poi.id}>
          <Marker position={{ lat: poi.latitude, lng: poi.longitude }} />
          <OverlayView position={{ lat: poi.latitude, lng: poi.longitude }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div style={{ position: 'absolute', transform: 'translateX(-50%)', bottom: '40px', background: 'rgba(255, 255, 255, 0.9)', padding: '2px 8px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', border: '1px solid rgba(0,0,0,0.1)' }}>
              {poi.poiName}
            </div>
          </OverlayView>
        </React.Fragment>
      ))}
    </>
  );
});
StaticLayers.displayName = 'StaticLayers';

const PlaybackMap = ({ tripPath, markerPosition, vehicleType, showFences, showPois, showLabels, showStoppages, currentBearing, isPlaying, unifiedStoppages, activeStoppage, onSkipStoppage }: PlaybackMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(false);

  const center = useMemo(() => {
    if (tripPath.length > 0) {
      return { lat: tripPath[0].lat, lng: tripPath[0].lng };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [tripPath]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: true,
    styles: showLabels ? undefined : noLabelsStyle,
  }), [showLabels]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  useEffect(() => {
    if (map && tripPath.length > 0) {
      if (isFollowingVehicle) {
        map.setZoom(16);
        map.setCenter(markerPosition || { lat: tripPath[0].lat, lng: tripPath[0].lng });
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        tripPath.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
        map.fitBounds(bounds);
      }
    }
  }, [map, tripPath]);

  const prevIsPlaying = useRef(isPlaying);
  useEffect(() => {
    if (isPlaying && !prevIsPlaying.current) {
      setIsFollowingVehicle(true);
    }
    prevIsPlaying.current = isPlaying;
  }, [isPlaying]);

  const prevFollowing = useRef(isFollowingVehicle);
  useEffect(() => {
    if (map && isFollowingVehicle && !prevFollowing.current && markerPosition) {
      map.panTo(markerPosition);
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 16) {
        let z = currentZoom;
        const timer = setInterval(() => {
          z += 1;
          map.setZoom(z);
          if (z >= 16) clearInterval(timer);
        }, 120);
      }
    }
    prevFollowing.current = isFollowingVehicle;
  }, [map, isFollowingVehicle, markerPosition]);

  useEffect(() => {
    if (map && markerPosition && isFollowingVehicle) {
      map.setCenter(markerPosition);
    }
  }, [map, markerPosition, isFollowingVehicle]);

  const handleMapDrag = useCallback(() => {
    if (isFollowingVehicle) {
      setIsFollowingVehicle(false);
    }
  }, [isFollowingVehicle]);

  return (
    <div className="relative w-full h-full">
      <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        center={center} 
        zoom={14} 
        options={mapOptions} 
        onLoad={onLoad}
        onDragStart={handleMapDrag}
      >
        <StaticLayers tripPath={tripPath} showFences={showFences} showPois={showPois} showStoppages={showStoppages} unifiedStoppages={unifiedStoppages} />

        {markerPosition && (
          <OverlayView position={markerPosition} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', width: '56px', height: '56px' }}>
              {isPlaying && (
                <>
                  <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" />
                  <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" style={{ animationDelay: '1s' }} />
                </>
              )}
              
              <img
                src={getIconUrl(vehicleType, 'Moving')}
                alt={vehicleType}
                className="relative z-10 w-full h-full object-contain drop-shadow-md"
                style={{ transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
              />
              
              {activeStoppage && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[110%] bg-background/85 backdrop-blur-md border border-border shadow-xl rounded-xl p-3 flex flex-col gap-2 min-w-[200px] pointer-events-auto transition-all animate-in fade-in zoom-in-95 z-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-foreground">Vehicle Stopped</span>
                        <span className="text-[11px] font-medium text-muted-foreground">{activeStoppage.type === 'idle' ? 'Engine ON (Idling)' : 'Engine OFF'}</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 shrink-0">
                       {formatDuration(activeStoppage.duration)}
                    </span>
                  </div>
                  <Button size="sm" className="h-7 w-full text-[11px] mt-1 shadow-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={(e) => { e.stopPropagation(); onSkipStoppage(); }}>
                    <FastForward className="w-3 h-3 mr-1.5" /> Skip Stoppage Time
                  </Button>
                </div>
              )}
            </div>
          </OverlayView>
        )}
      </GoogleMap>

      {/* Follow Toggle */}
      <div className="absolute top-4 right-16 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isFollowingVehicle ? "default" : "secondary"} 
                size="icon" 
                className={`w-10 h-10 rounded-xl shadow-lg border-2 pointer-events-auto transition-colors ${isFollowingVehicle ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white' : 'bg-background hover:bg-background/90 border-transparent text-foreground'}`}
                onClick={() => setIsFollowingVehicle(!isFollowingVehicle)}
              >
                <Crosshair className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-semibold text-sm mr-1">
              <p>{isFollowingVehicle ? 'Unfollow Vehicle' : 'Follow Vehicle'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PlaybackMap;