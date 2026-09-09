import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { LiveVehicleStatus } from '@/types';
import { GoogleMap, OverlayView, Polyline, Marker } from '@react-google-maps/api';
import { getIconUrl, calculateBearing, getStatusColor } from '@/lib/map-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LiveLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: LiveVehicleStatus | null;
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

const LiveLocationDialog = ({ open, onOpenChange, vehicle }: LiveLocationDialogProps) => {
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

    const rawHistory = vehicle.latLongHistory?.length
      ? vehicle.latLongHistory
          .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)
      : (vehicle.lat && vehicle.lng ? [{ lat: Number(vehicle.lat), lng: Number(vehicle.lng) }] : []);

    let history = rawHistory;
    if (rawHistory.length > 250) {
      const step = Math.ceil(rawHistory.length / 250);
      history = rawHistory.filter((_, idx) => idx % step === 0 || idx === rawHistory.length - 1);
    }

    setPathPoints(history);
    setMarkerPosition(history[0] || (vehicle.lat && vehicle.lng ? { lat: Number(vehicle.lat), lng: Number(vehicle.lng) } : null));
    setCurrentBearing(0);
    setLastUpdated(new Date());
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
        const bounds = mapRef.current.getBounds();
        if (bounds && !bounds.contains(new window.google.maps.LatLng(next.lat, next.lng))) {
          mapRef.current.panTo(next);
        }
      }
      currentIndex = nextIndex;
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [open, pathPoints]);

  if (!open || !vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Live Location: {vehicle.vehicleNo}</DialogTitle>
          <DialogDescription>
            Last updated: {format(lastUpdated, 'dd-MMM-yyyy hh:mm:ss a')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 relative">
          {markerPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={markerPosition}
              zoom={16}
              options={mapOptions}
              onLoad={(map) => {
                mapRef.current = map;
                if (pathPoints.length > 0) {
                  const bounds = new window.google.maps.LatLngBounds();
                  pathPoints.forEach((point) => bounds.extend(point));
                  map.fitBounds(bounds);
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
                  <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} />
                  <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} style={{ animationDelay: '1s' }} />
                  <img
                    src={getIconUrl(vehicle.type, vehicle.status)}
                    alt="vehicle"
                    className="relative z-10 w-full h-full object-contain"
                    style={{ transform: `rotate(${currentBearing}deg)`, transformOrigin: 'center' }}
                  />
                </div>
              </OverlayView>
            </GoogleMap>
          ) : (
            <Skeleton className="w-full h-full" />
          )}
          <Card className="absolute bottom-4 left-4 right-4 shadow-lg">
            <CardContent className="p-3 grid grid-cols-5 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">STATUS</p>
                <p className="text-sm font-bold">{vehicle.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WORKING HRS</p>
                <p className="text-sm font-bold">{vehicle.workingHours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">FUEL</p>
                <p className="text-sm font-bold">{vehicle.fuelLevel}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ENGINE TEMP</p>
                <p className="text-sm font-bold">{vehicle.engineTemp}°C</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">HYDRAULIC TEMP</p>
                <p className="text-sm font-bold">{vehicle.hydraulicTemp}°C</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveLocationDialog;