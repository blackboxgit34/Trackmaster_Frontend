import { GoogleMap, Polyline, Marker, Polygon, Circle, OverlayView } from '@react-google-maps/api';
import type { TripPoint } from '@/data/routeData';
import { getIconUrl, getStopMarkerIconUrl } from '@/lib/map-utils';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { geofenceMapData } from '@/data/geofenceMapData';
import { poiData } from '@/data/poiData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseISO, differenceInSeconds } from 'date-fns';

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
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const PlaybackMap = ({ tripPath, markerPosition, vehicleType, showFences, showPois, showLabels, showStoppages, currentBearing, isPlaying }: PlaybackMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
    if (tripPath.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      tripPath.forEach(point => bounds.extend(point));
      mapInstance.fitBounds(bounds);
    }
  }, [tripPath]);

  useEffect(() => {
    if (map && markerPosition && isPlaying) {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 15) {
        map.setZoom(16);
      }
      map.setCenter(markerPosition);
    }
  }, [map, markerPosition, isPlaying]);

  const polylineOptions = {
    strokeColor: '#3B82F6',
    strokeOpacity: 0.8,
    strokeWeight: 4,
  };

  const markerIconUrl = getIconUrl(vehicleType, 'Moving');

  const fenceOptions = {
    fillColor: '#8B5CF6',
    fillOpacity: 0.2,
    strokeColor: '#8B5CF6',
    strokeOpacity: 1,
    strokeWeight: 2,
  };

  const stoppages = useMemo(() => {
    const stops = [];
    let currentStop: { start: TripPoint; end: TripPoint; type: 'idle' | 'normal'; points: TripPoint[] } | null = null;

    for (let i = 0; i < tripPath.length; i++) {
      const point = tripPath[i];
      if (point.speed === 0) {
        if (!currentStop) {
          currentStop = {
            start: point,
            end: point,
            type: point.engineStatus === 'ON' ? 'idle' : 'normal',
            points: [point],
          };
        } else {
          currentStop.end = point;
          currentStop.points.push(point);
        }
      } else {
        if (currentStop) {
          const duration = differenceInSeconds(parseISO(currentStop.end.timestamp), parseISO(currentStop.start.timestamp));
          if (duration > 10) { // Only show stops longer than 10 seconds
            const avgLat = currentStop.points.reduce((sum, p) => sum + p.lat, 0) / currentStop.points.length;
            const avgLng = currentStop.points.reduce((sum, p) => sum + p.lng, 0) / currentStop.points.length;
            stops.push({ ...currentStop, duration, center: { lat: avgLat, lng: avgLng } });
          }
          currentStop = null;
        }
      }
    }
    // Add the last stop if the trip ends with one
    if (currentStop) {
      const duration = differenceInSeconds(parseISO(currentStop.end.timestamp), parseISO(currentStop.start.timestamp));
      if (duration > 10) {
        const avgLat = currentStop.points.reduce((sum, p) => sum + p.lat, 0) / currentStop.points.length;
        const avgLng = currentStop.points.reduce((sum, p) => sum + p.lng, 0) / currentStop.points.length;
        stops.push({ ...currentStop, duration, center: { lat: avgLat, lng: avgLng } });
      }
    }
    return stops;
  }, [tripPath]);

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
      onLoad={onLoad}
    >
      {tripPath.length > 0 && (
        <>
          <Polyline path={tripPath} options={polylineOptions} />
          <Marker position={tripPath[0]} label="A" />
          <Marker position={tripPath[tripPath.length - 1]} label="B" />
        </>
      )}
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
            {isPlaying && (
              <>
                <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" />
                <div className="absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple bg-green-500" style={{ animationDelay: '1s' }} />
              </>
            )}
            <img
              src={markerIconUrl}
              alt="vehicle"
              style={{ width: '100%', height: '100%', transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
              className="relative z-10 object-contain"
            />
          </div>
        </OverlayView>
      )}

      {showStoppages && stoppages.map((stop, index) => (
        <OverlayView
          key={`stop-${index}`}
          position={stop.center}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <img
                  src={getStopMarkerIconUrl(stop.type)}
                  alt={`${stop.type} stop`}
                  style={{
                    width: '32px',
                    height: '32px',
                    transform: 'translate(-50%, -100%)',
                    cursor: 'pointer',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{stop.type === 'idle' ? 'Idle Stop' : 'Normal Stop'}: {formatDuration(stop.duration)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </OverlayView>
      ))}

      {showFences && geofenceMapData.map(fence => {
        if (!fence.isActive) return null;
        if (fence.type === 'polygon' && fence.paths) {
          return <Polygon key={fence.id} paths={fence.paths} options={fenceOptions} />;
        }
        if (fence.type === 'circle' && fence.center && fence.radius) {
          return <Circle key={fence.id} center={fence.center} radius={fence.radius} options={fenceOptions} />;
        }
        return null;
      })}

      {showPois && poiData.map(poi => (
        <>
          <Marker
            key={poi.id}
            position={{ lat: poi.latitude, lng: poi.longitude }}
          />
          <OverlayView
            key={`${poi.id}-label`}
            position={{ lat: poi.latitude, lng: poi.longitude }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div style={{
              position: 'absolute',
              transform: 'translateX(-50%)',
              bottom: '40px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2px 8px',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(0,0,0,0.1)',
            }}>
              {poi.poiName}
            </div>
          </OverlayView>
        </>
      ))}
    </GoogleMap>
  );
};

export default PlaybackMap;