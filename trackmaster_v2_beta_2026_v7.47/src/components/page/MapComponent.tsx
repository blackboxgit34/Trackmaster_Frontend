import { useState, useCallback, useEffect, useMemo, Fragment } from 'react';
import { GoogleMap, Marker, InfoWindow, OverlayView, Polygon, Circle } from '@react-google-maps/api';
import type { LiveVehicleStatus } from '@/types';
import { Button } from '../ui/button';
import { poiData } from '@/data/poiData';
import { geofenceMapData } from '@/data/geofenceMapData';
import { getIconUrl, getStatusColor } from '@/lib/map-utils';
import { cn } from '@/lib/utils';

const containerStyle = {
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

const MapComponent = ({ machines: vehicles, selectedMachineId: selectedVehicleId, onMarkerClick, showLabels, autoZoom, showPois, showFences, onMapLoad }: MapComponentProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [zoom, setZoom] = useState(5);

  const center = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []); // Default center of India

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    styles: showLabels ? undefined : noLabelsStyle,
  }), [showLabels]);

  const fenceOptions = {
    fillColor: '#8B5CF6',
    fillOpacity: 0.2,
    strokeColor: '#8B5CF6',
    strokeOpacity: 1,
    strokeWeight: 2,
  };

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    onMapLoad(mapInstance);
  }, [onMapLoad]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleZoomChanged = useCallback(() => {
    if (map) {
      setZoom(map.getZoom() || 5);
    }
  }, [map]);

  useEffect(() => {
    if (map && vehicles.length > 0 && autoZoom) {
      const bounds = new window.google.maps.LatLngBounds();
      vehicles.forEach(vehicle => {
        bounds.extend(new window.google.maps.LatLng(vehicle.lat, vehicle.lng));
      });
      map.fitBounds(bounds);
    }
  }, [map, vehicles, autoZoom]);

  useEffect(() => {
    if (map && selectedVehicleId) {
      const vehicle = vehicles.find(m => m.id === selectedVehicleId);
      if (vehicle) {
        map.panTo({ lat: vehicle.lat, lng: vehicle.lng });
        map.setZoom(15);
        setActiveMarker(vehicle.id);
      }
    }
  }, [map, selectedVehicleId, vehicles]);

  const handleMarkerClick = (vehicleId: string) => {
    onMarkerClick(vehicleId);
    setActiveMarker(vehicleId);
  };

  const activeVehicle = useMemo(() => {
    if (!activeMarker) return null;
    return vehicles.find(m => m.id === activeMarker);
  }, [activeMarker, vehicles]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
      onZoomChanged={handleZoomChanged}
    >
      {/* Render all vehicles with ripples using OverlayView */}
      {vehicles.map((vehicle) => {
        const isActive = activeMarker === vehicle.id;
        const containerSize = isActive ? 56 : 40;
        const rippleSize = isActive ? 'w-12 h-12 -mt-6 -ml-6' : 'w-8 h-8 -mt-4 -ml-4';

        return (
          <OverlayView
            key={vehicle.id}
            position={{ lat: vehicle.lat, lng: vehicle.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={() => handleMarkerClick(vehicle.id)}
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -100%)', // Anchor at bottom-center
                width: `${containerSize}px`,
                height: `${containerSize}px`,
                cursor: 'pointer',
                zIndex: isActive ? 50 : 10,
              }}
            >
              {/* Ripples */}
              <div className={cn("absolute top-1/2 left-1/2 rounded-full animate-ripple", getStatusColor(vehicle.status), rippleSize)} />
              <div className={cn("absolute top-1/2 left-1/2 rounded-full animate-ripple", getStatusColor(vehicle.status), rippleSize)} style={{ animationDelay: '1s' }} />
              
              {/* Icon */}
              <img
                src={getIconUrl(vehicle.type, vehicle.status)}
                alt={vehicle.vehicleNo}
                className="relative z-10 w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </OverlayView>
        );
      })}

      {/* Render POIs */}
      {showPois && zoom > 10 && poiData.map(poi => (
        <Fragment key={`poi-${poi.id}`}>
          <Marker
            position={{ lat: poi.latitude, lng: poi.longitude }}
          />
          <OverlayView
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
        </Fragment>
      ))}

      {/* Render Geofences */}
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

      {/* InfoWindow for the Active Vehicle */}
      {activeVehicle && (
        <InfoWindow
          position={{ lat: activeVehicle.lat, lng: activeVehicle.lng }}
          onCloseClick={() => setActiveMarker(null)}
          options={{
            pixelOffset: new window.google.maps.Size(0, -56), // Offset above the custom icon
          }}
        >
          <div className="p-1">
            <h4 className="font-bold">{activeVehicle.vehicleNo}</h4>
            <p>Status: {activeVehicle.status}</p>
            <p>Speed: {activeVehicle.speed} km/h</p>
            <p className="text-xs text-muted-foreground">Updated: {activeVehicle.lastUpdated}</p>
            <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => onMarkerClick(activeVehicle.id)}>
              View Details
            </Button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapComponent;