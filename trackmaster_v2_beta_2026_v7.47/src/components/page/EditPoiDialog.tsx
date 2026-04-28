import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import type { Poi } from '@/data/poiData';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';

interface EditPoiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi: Poi | null;
  onSave: (poi: Poi) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

const circleOptions = {
  strokeColor: '#3B82F6',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#3B82F6',
  fillOpacity: 0.35,
  editable: true,
  draggable: true,
};

const EditPoiDialog = ({ open, onOpenChange, poi, onSave }: EditPoiDialogProps) => {
  const [poiName, setPoiName] = useState('');
  const [radius, setRadius] = useState(200);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (poi) {
      setPoiName(poi.poiName);
      setRadius(poi.radius);
      setPosition({ lat: poi.latitude, lng: poi.longitude });
    }
  }, [poi]);

  const onCircleLoad = useCallback((circle: google.maps.Circle) => {
    circleRef.current = circle;
  }, []);

  const onCircleUnmount = useCallback(() => {
    circleRef.current = null;
  }, []);

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPosition(e.latLng.toJSON());
    }
  }, []);

  const onRadiusChanged = useCallback(() => {
    if (circleRef.current) {
      setRadius(circleRef.current.getRadius());
    }
  }, []);
  
  const onCenterChanged = useCallback(() => {
    if (circleRef.current) {
      const newCenter = circleRef.current.getCenter();
      if (newCenter) {
        setPosition(newCenter.toJSON());
      }
    }
  }, []);

  const handleSave = () => {
    if (!poi || !position) return;
    const updatedPoi: Poi = {
      ...poi,
      poiName: poiName,
      radius: radius,
      latitude: position.lat,
      longitude: position.lng,
    };
    onSave(updatedPoi);
    toast({
      variant: 'success',
      title: "POI Updated",
      description: `Point of Interest "${poiName}" has been updated successfully.`,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    if (poi) {
      setPoiName(poi.poiName);
      setRadius(poi.radius);
      setPosition({ lat: poi.latitude, lng: poi.longitude });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[90vw] h-[80vh] p-0 flex">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] w-full h-full">
          {/* Map Section */}
          <div className="bg-muted rounded-l-lg relative h-full">
            {position && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={position}
                zoom={14}
                options={mapOptions}
              >
                <Marker
                  position={position}
                  draggable={true}
                  onDragEnd={onMarkerDragEnd}
                />
                <Circle
                  center={position}
                  radius={radius}
                  options={circleOptions}
                  onLoad={onCircleLoad}
                  onUnmount={onCircleUnmount}
                  onRadiusChanged={onRadiusChanged}
                  onCenterChanged={onCenterChanged}
                />
              </GoogleMap>
            )}
          </div>

          {/* Control Panel Sidebar */}
          <div className="bg-card rounded-r-lg p-4 flex flex-col border-l overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-foreground shrink-0">
              Edit POI
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div>
                <Label htmlFor="poi-name">POI Name</Label>
                <Input
                  id="poi-name"
                  value={poiName}
                  onChange={(e) => setPoiName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="poi-radius-input">Set POI Radius (in Meters)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    id="poi-radius-slider"
                    min={50}
                    max={5000}
                    step={50}
                    value={[radius]}
                    onValueChange={(value) => setRadius(value[0])}
                    className="flex-1"
                  />
                  <div className="relative w-28">
                    <Input
                      id="poi-radius-input"
                      type="number"
                      value={Math.round(radius)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const num = parseInt(value, 10);
                        if (value === '') {
                          setRadius(0);
                        } else if (!isNaN(num)) {
                          setRadius(num);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (isNaN(value) || value < 50) {
                          setRadius(50);
                        } else if (value > 5000) {
                          setRadius(5000);
                        }
                      }}
                      className="pr-8 text-right"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">
                      m
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1 pt-2">
                <h3 className="font-semibold text-foreground text-sm">
                  To Edit POI, follow these steps:
                </h3>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                  <li>Edit the location name in the text-box and click Save.</li>
                  <li>Drag the marker or circle to a new position.</li>
                  <li>Resize the circle by dragging its edges.</li>
                </ol>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-4 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleReset}>Reset</Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPoiDialog;