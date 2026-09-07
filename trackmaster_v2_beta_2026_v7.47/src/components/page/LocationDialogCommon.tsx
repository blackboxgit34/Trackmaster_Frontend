
import type { locationOnMap } from '@/types';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

import { GoogleMap, OverlayView, Polyline, Marker } from '@react-google-maps/api';
import { getIconUrl, calculateBearing, getStatusColor } from '@/lib/map-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';


interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: locationOnMap | null;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

const LocationDialog = ({ open, onOpenChange, vehicle }: LocationDialogProps) => {
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const [pathPoints, setPathPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!vehicle) {
      setPathPoints([]);
      setMarkerPosition(null);
      return;
    }

    const history = vehicle.latLongHistory?.length
      ? vehicle.latLongHistory.map((point) => ({ lat: point.lat, lng: point.lng }))
      : [{ lat: vehicle.lat, lng: vehicle.lng }];

    setPathPoints(history);
    setMarkerPosition(history[0]);
    setCurrentBearing(0);
    setLastUpdated(new Date());
      console.log("vehicle received", vehicle);
  }, [vehicle]);

  useEffect(() => {
    if (!open || pathPoints.length <= 1) {
      return;
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= pathPoints.length) {
        clearInterval(intervalId);
        return;
      }

      const prev = pathPoints[currentIndex];
      const next = pathPoints[nextIndex];
      setMarkerPosition(next);
      setCurrentBearing(calculateBearing(prev.lat, prev.lng, next.lat, next.lng));
      setLastUpdated(new Date());
      if (mapRef.current) {
        mapRef.current.panTo(next);
      }
      currentIndex = nextIndex;
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [open, pathPoints]);

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Location: {vehicle.vehicle}</DialogTitle>
          <DialogDescription>
            Last updated: {format(lastUpdated, 'dd-MMM-yyyy hh:mm:ss a')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 relative">
          {markerPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={markerPosition}
              zoom={18}
              options={mapOptions}
              onLoad={(map) => {
                 mapRef.current = map;

                if (markerPosition) {
                  map.setCenter(markerPosition);
                  map.setZoom(18); // adjust 16-20 as needed
                }
              }}
            >
              {pathPoints.length > 1 && (
  <>
    <Polyline
      path={pathPoints}
      options={{
        strokeColor: '#2563EB',
        strokeOpacity: 0.85,
        strokeWeight: 5,
      }}
    />
    <Marker position={pathPoints[0]} label="A" />
    <Marker position={pathPoints[pathPoints.length - 1]} label="B" />
  </>
)}

{markerPosition && (
  <Marker
    position={markerPosition}
  />
)}

              {/* <OverlayView
                position={markerPosition}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              > */}
                <div style={{
                  position: 'absolute',
                  transform: 'translate(-50%, -50%)',
                  width: '56px',
                  height: '56px',
                }}>
                  {/* <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} />
                  <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} style={{ animationDelay: '1s' }} />
                  <img
                    src={getIconUrl(vehicle.type, vehicle.status)}
                    alt="vehicle"
                    className="relative z-10 w-full h-full object-contain"
                    style={{ transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
                  /> */}
                </div>
              {/* </OverlayView> */}
            </GoogleMap>
          ) : (
            <Skeleton className="w-full h-full" />
          )}
          <Card className="absolute bottom-4 left-4 right-4 shadow-lg">
            <CardContent className={cn("p-3 grid gap-2 text-center", showDriverName ? "grid-cols-5" : "grid-cols-4")}>
                <div>
                    <p className="text-xs text-muted-foreground">Vehicle Name</p>
                    <p className="text-sm font-bold">{vehicle.vehicle}</p>
                </div>
                {showDriverName && (
                  <div>
                      <p className="text-xs text-muted-foreground">Driver Name</p>
                      <p className="text-sm font-bold">{vehicle.driverName || 'N/A'}</p>
                  </div>
                )}
                <div>
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="text-sm font-bold">{vehicle.speed}</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDialog;