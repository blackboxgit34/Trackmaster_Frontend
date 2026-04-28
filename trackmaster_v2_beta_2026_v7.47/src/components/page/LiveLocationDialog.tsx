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
import { GoogleMap, OverlayView } from '@react-google-maps/api';
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
  const [currentPosition, setCurrentPosition] = useState(vehicle ? { lat: vehicle.lat, lng: vehicle.lng } : null);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (vehicle) {
      setCurrentPosition({ lat: vehicle.lat, lng: vehicle.lng });
    }
  }, [vehicle]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (open && vehicle?.status === 'Moving') {
      intervalId = setInterval(() => {
        setCurrentPosition(prevPos => {
          if (!prevPos) return null;
          const newPos = {
            lat: prevPos.lat + (Math.random() - 0.5) * 0.0002,
            lng: prevPos.lng + (Math.random() - 0.5) * 0.0002,
          };
          setCurrentBearing(calculateBearing(prevPos.lat, prevPos.lng, newPos.lat, newPos.lng));
          if (mapRef.current) {
            mapRef.current.panTo(newPos);
          }
          return newPos;
        });
        setLastUpdated(new Date());
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [open, vehicle?.status]);

  if (!vehicle) return null;

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
          {currentPosition ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={currentPosition}
              zoom={16}
              options={mapOptions}
              onLoad={(map) => { mapRef.current = map; }}
            >
              <OverlayView
                position={currentPosition}
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