import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Search, Tag, ChevronsUpDown, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleMap, DrawingManager } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { actualVehicles } from '@/data/mockData';
import type { GeofenceShape } from '@/data/geofenceMapData';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 20.5937,
  lng: 78.9629,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
};

interface CreateFenceProps {
  onAddFence: (fence: GeofenceShape) => void;
}

const CreateFence = ({ onAddFence }: CreateFenceProps) => {
  const { toast } = useToast();
  const [fenceType, setFenceType] = useState<'circle' | 'polygon'>('polygon');
  const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(google.maps.drawing.OverlayType.POLYGON);
  const [alertOnEnter, setAlertOnEnter] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [radius, setRadius] = useState(200);
  const [drawnShape, setDrawnShape] = useState<google.maps.Polygon | google.maps.Circle | null>(null);
  const [fenceName, setFenceName] = useState('');
  
  // Vehicle selection states
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState('All Types');

  // Undo functionality states
  const [pathHistory, setPathHistory] = useState<google.maps.LatLngLiteral[][]>([]);
  const shapeListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const clearShapeListeners = () => {
    shapeListenersRef.current.forEach(listener => listener.remove());
    shapeListenersRef.current = [];
  };

  const handleReset = useCallback(() => {
    if (drawnShape) {
      drawnShape.setMap(null);
    }
    setDrawnShape(null);
    setFenceName('');
    setAlertOnEnter(true);
    setAlertOnExit(false);
    setRadius(200);
    setVehicleSearchTerm('');
    setSelectedVehicles(new Set());
    setSelectedType('All Types');
    setDrawingMode(fenceType === 'polygon' ? google.maps.drawing.OverlayType.POLYGON : google.maps.drawing.OverlayType.CIRCLE);
    setPathHistory([]);
    clearShapeListeners();
  }, [drawnShape, fenceType]);

  const onOverlayComplete = useCallback((overlay: google.maps.drawing.OverlayCompleteEvent) => {
    if (drawnShape) {
      drawnShape.setMap(null);
    }
    clearShapeListeners();
    
    const newShape = overlay.overlay;
    if (newShape) {
      setDrawnShape(newShape as any);
      if (overlay.type === google.maps.drawing.OverlayType.CIRCLE) {
        const circle = newShape as google.maps.Circle;
        setRadius(circle.getRadius() || 200);
        setPathHistory([]); // Undo is for polygons only
      } else if (overlay.type === google.maps.drawing.OverlayType.POLYGON) {
        const polygon = newShape as google.maps.Polygon;
        const path = polygon.getPath();
        
        const savePath = () => {
          setPathHistory(prev => [...prev, path.getArray().map(p => p.toJSON())]);
        };
        
        setPathHistory([path.getArray().map(p => p.toJSON())]);

        shapeListenersRef.current.push(
          window.google.maps.event.addListener(path, 'insert_at', savePath),
          window.google.maps.event.addListener(path, 'remove_at', savePath),
          window.google.maps.event.addListener(path, 'set_at', savePath)
        );
      }
    }
    
    setDrawingMode(null);
  }, [drawnShape]);

  useEffect(() => {
    if (drawnShape && drawnShape.get('map') && fenceType === 'circle') {
      (drawnShape as google.maps.Circle).setRadius(radius);
    }
  }, [radius, drawnShape, fenceType]);

  const handleFenceTypeChange = (type: 'circle' | 'polygon') => {
    setFenceType(type);
    if (drawnShape) {
      drawnShape.setMap(null);
      setDrawnShape(null);
    }
    setDrawingMode(type === 'polygon' ? google.maps.drawing.OverlayType.POLYGON : google.maps.drawing.OverlayType.CIRCLE);
    setPathHistory([]);
    clearShapeListeners();
  };

  const handleUndo = () => {
    if (pathHistory.length <= 1 || !drawnShape || !(drawnShape instanceof window.google.maps.Polygon)) {
      return;
    }

    const newHistory = [...pathHistory];
    newHistory.pop(); // Remove current state
    const previousPath = newHistory[newHistory.length - 1];

    (drawnShape as google.maps.Polygon).setPath(previousPath);
    setPathHistory(newHistory);
  };

  const handleCreate = () => {
    if (!fenceName.trim()) {
      toast({ title: "Error", description: "Please enter a fence name.", variant: "destructive" });
      return;
    }
    if (!drawnShape) {
      toast({ title: "Error", description: "Please draw a fence on the map.", variant: "destructive" });
      return;
    }
    if (selectedVehicles.size === 0) {
      toast({ title: "Error", description: "Please select at least one vehicle.", variant: "destructive" });
      return;
    }

    let newFence: GeofenceShape;
    const newFenceBase = {
        id: Date.now(),
        name: fenceName,
        machines: Array.from(selectedVehicles),
        isActive: true,
    };

    if (fenceType === 'circle' && drawnShape instanceof window.google.maps.Circle) {
        const center = drawnShape.getCenter();
        if (!center) {
            toast({ title: "Error", description: "Could not get circle center.", variant: "destructive" });
            return;
        }
        newFence = {
            ...newFenceBase,
            type: 'circle',
            center: { lat: center.lat(), lng: center.lng() },
            radius: drawnShape.getRadius(),
        };
    } else if (fenceType === 'polygon' && drawnShape instanceof window.google.maps.Polygon) {
        const path = drawnShape.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        newFence = {
            ...newFenceBase,
            type: 'polygon',
            paths: path,
        };
    } else {
        toast({ title: "Error", description: "Invalid shape data.", variant: "destructive" });
        return;
    }

    onAddFence(newFence);

    toast({ variant: "success", title: "Success", description: `Fence "${fenceName}" has been created and assigned to ${selectedVehicles.size} vehicle(s).` });
    handleReset();
  };

  const vehicleTypes = ['All Types', ...Array.from(new Set(actualVehicles.map(m => m.type)))];

  const filteredVehicles = useMemo(() => {
      return actualVehicles.filter(vehicle => {
        const matchesType = selectedType === 'All Types' || vehicle.type === selectedType;
        const matchesSearch = vehicle.name.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                              vehicle.id.toLowerCase().includes(vehicleSearchTerm.toLowerCase());
        return matchesType && matchesSearch;
      });
  }, [vehicleSearchTerm, selectedType]);

  const handleSelectVehicle = (vehicleId: string) => {
      setSelectedVehicles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(vehicleId)) {
          newSet.delete(vehicleId);
        } else {
          newSet.add(vehicleId);
        }
        return newSet;
      });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked === true) {
        const allFilteredIds = new Set(filteredVehicles.map(m => m.id));
        setSelectedVehicles(allFilteredIds);
      } else {
        setSelectedVehicles(new Set());
      }
  };

  const allFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(m => selectedVehicles.has(m.id));
  const someFilteredSelected = filteredVehicles.some(m => selectedVehicles.has(m.id));

  return (
    <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[1fr_350px] lg:grid-rows-1 gap-6 h-full">
      {/* Map Section */}
      <div className="bg-muted rounded-lg relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={5}
          options={mapOptions}
        >
          <DrawingManager
            onOverlayComplete={onOverlayComplete}
            drawingMode={drawingMode}
            options={{
              drawingControl: true,
              drawingControlOptions: {
                position: window.google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [], // Hide default controls, we use our own buttons
              },
              polygonOptions: {
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                strokeColor: '#3B82F6',
                strokeWeight: 2,
                editable: true,
                zIndex: 1,
              },
              circleOptions: {
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                strokeColor: '#3B82F6',
                strokeWeight: 2,
                editable: true,
                zIndex: 1,
                radius: radius,
              },
            }}
          />
        </GoogleMap>
      </div>

      {/* Control Panel Sidebar */}
      <div className="bg-card rounded-lg p-4 flex flex-col border overflow-hidden">
        <h2 className="text-xl font-bold mb-4 text-foreground shrink-0">Create a fence</h2>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            <div className="bg-muted p-1 rounded-lg grid grid-cols-2 gap-1">
              <Button variant="ghost" onClick={() => handleFenceTypeChange('circle')} className={cn('w-full h-9', fenceType === 'circle' ? 'bg-brand-blue text-white hover:bg-brand-blue/90' : 'hover:bg-muted-foreground/10')}>Circle</Button>
              <Button variant="ghost" onClick={() => handleFenceTypeChange('polygon')} className={cn('w-full h-9', fenceType === 'polygon' ? 'bg-brand-blue text-white hover:bg-brand-blue/90' : 'hover:bg-muted-foreground/10')}>Polygon</Button>
            </div>

            <p className="text-xs text-muted-foreground">Select a tool from the map's top-center controls to start drawing.</p>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Fence Name" className="pl-9 h-9 text-sm" value={fenceName} onChange={e => setFenceName(e.target.value)} />
            </div>

            <div>
              <Label>Assign to Vehicles</Label>
              <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isVehicleSelectorOpen} className="w-full justify-between mt-1">
                    {selectedVehicles.size > 0 ? `${selectedVehicles.size} vehicle(s) selected` : "Select vehicles..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="border rounded-md">
                    <div className="p-2 border-b">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search vehicle..." value={vehicleSearchTerm} onChange={(e) => setVehicleSearchTerm(e.target.value)} className="pl-8 h-9" />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{vehicleTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center p-2 border-b">
                      <Checkbox id="select-all-vehicles" checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false} onCheckedChange={handleSelectAll} />
                      <Label htmlFor="select-all-vehicles" className="ml-2 text-sm font-medium">Select all ({filteredVehicles.length} found)</Label>
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-1">
                        {filteredVehicles.map(vehicle => (
                          <div key={vehicle.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                            <Checkbox id={`vehicle-${vehicle.id}`} checked={selectedVehicles.has(vehicle.id)} onCheckedChange={() => handleSelectVehicle(vehicle.id)} />
                            <Label htmlFor={`vehicle-${vehicle.id}`} className="w-full cursor-pointer text-sm font-normal">{vehicle.name}</Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {fenceType === 'circle' && (
              <div className="pt-2">
                <Label htmlFor="poi-radius-input">Set Radius</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider id="poi-radius-slider" min={50} max={5000} step={50} value={[radius]} onValueChange={(value) => setRadius(value[0])} className="flex-1" />
                  <div className="relative w-28">
                    <Input id="poi-radius-input" type="number" value={radius} onChange={(e) => { const value = e.target.value; const num = parseInt(value, 10); if (value === '') { setRadius(0); } else if (!isNaN(num)) { setRadius(num); } }} onBlur={(e) => { const value = parseInt(e.target.value, 10); if (isNaN(value) || value < 50) { setRadius(50); } else if (value > 5000) { setRadius(5000); } }} className="pr-8 text-right" />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">m</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <h3 className="text-base font-semibold">Alert Settings</h3>
              <div className="border p-3 rounded-lg flex items-center justify-between">
                <Label htmlFor="alert-enter" className="text-sm font-medium pr-4">Alert on enter</Label>
                <Switch id="alert-enter" checked={alertOnEnter} onCheckedChange={setAlertOnEnter} className="data-[state=checked]:bg-brand-blue" />
              </div>
              <div className="border p-3 rounded-lg flex items-center justify-between">
                <Label htmlFor="alert-exit" className="text-sm font-medium pr-4">Alert on exit</Label>
                <Switch id="alert-exit" checked={alertOnExit} onCheckedChange={setAlertOnExit} className="data-[state=checked]:bg-brand-blue" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 shrink-0">
          <div className={cn(
            "grid gap-3",
            fenceType === 'polygon' ? "grid-cols-3" : "grid-cols-2"
          )}>
            {fenceType === 'polygon' && (
              <Button variant="outline" onClick={handleUndo} disabled={pathHistory.length <= 1}>
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button className="bg-brand-blue text-white hover:bg-brand-blue/90" onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFence;