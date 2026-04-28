import { GoogleMap, Polyline, Marker, OverlayView } from '@react-google-maps/api';
import { getIconUrl } from '@/lib/map-utils';
import { useMemo, useEffect, useState, useCallback } from 'react';

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
  onLoad: (map: google.maps.Map) => void;
}

const FuelPlaybackMap = ({ path, events, markerPosition, vehicleType, currentBearing, onLoad }: FuelPlaybackMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
    if (path.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      mapInstance.fitBounds(bounds);
    }
  }, [path, onLoad]);

  useEffect(() => {
    if (map && markerPosition) {
      map.setCenter(markerPosition);
    }
  }, [map, markerPosition]);

  const markerIconUrl = getIconUrl(vehicleType, 'Moving');

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={14} options={mapOptions} onLoad={handleOnLoad}>
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
              src={markerIconUrl}
              alt="vehicle"
              style={{ width: '100%', height: '100%', transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
              className="relative z-10 object-contain"
            />
          </div>
        </OverlayView>
      )}
    </GoogleMap>
  );
};

export default FuelPlaybackMap;