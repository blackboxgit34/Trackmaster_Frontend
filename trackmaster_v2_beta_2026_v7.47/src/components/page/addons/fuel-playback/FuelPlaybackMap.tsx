import { GoogleMap, Polyline, Marker, OverlayView } from '@react-google-maps/api';
import { getIconUrl } from '@/lib/map-utils';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

interface FuelPlaybackMapProps {
  path: any[];
  events: any[];
  markerPosition: { lat: number; lng: number } | null;
  vehicleType: string;
  currentBearing: number;
  isPlaying: boolean;
  onLoad: (map: google.maps.Map) => void;
}

const FuelPlaybackMap = ({ path, events, markerPosition, vehicleType, currentBearing, isPlaying, onLoad }: FuelPlaybackMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(false);

  const center = useMemo(() => {
    if (path.length > 0) return { lat: path[0].lat, lng: path[0].lng };
    return { lat: 20.5937, lng: 78.9629 };
  }, [path]);

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: true,
  };

  const handleOnLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    onLoad(mapInstance);
  }, [onLoad]);

  useEffect(() => {
    if (map && path.length > 0) {
      if (isFollowingVehicle) {
        map.setZoom(16);
        map.setCenter(markerPosition || { lat: path[0].lat, lng: path[0].lng });
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
      }
    }
  }, [map, path]);

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
    if (isFollowingVehicle) setIsFollowingVehicle(false);
  }, [isFollowingVehicle]);

  return (
    <div className="relative w-full h-full">
      <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        center={center} 
        zoom={14} 
        options={mapOptions} 
        onLoad={handleOnLoad}
        onDragStart={handleMapDrag}
      >
        {path.length > 0 && (
          <>
            <Polyline path={path} options={{ strokeColor: '#3B82F6', strokeWeight: 4 }} />
            <Marker position={path[0]} label="A" />
            <Marker position={path[path.length - 1]} label="B" />
          </>
        )}
        {events.map(event => (
          <Marker
            key={event.timestamp}
            position={{ lat: event.lat, lng: event.lng }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: event.type === 'filling' ? '#22c55e' : '#ef4444',
              fillOpacity: 0.8,
              strokeWeight: 1,
              strokeColor: '#fff',
              scale: 8,
            }}
          />
        ))}
        {markerPosition && (
          <OverlayView
            position={markerPosition}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              width: '56px',
              height: '56px',
            }}>
              <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" />
              <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" style={{ animationDelay: '1s' }} />
              
              <img
                src={getIconUrl(vehicleType, 'Moving')}
                alt={vehicleType}
                className="relative z-10 w-full h-full object-contain drop-shadow-md"
                style={{ transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
              />
            </div>
          </OverlayView>
        )}
      </GoogleMap>

      {/* Follow Toggle */}
      <div className="absolute top-4 right-14 z-10">
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

export default FuelPlaybackMap;