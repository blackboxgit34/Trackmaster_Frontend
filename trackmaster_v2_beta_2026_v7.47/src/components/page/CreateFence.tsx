import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Search, Tag, ChevronsUpDown, Undo, Check, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleMap, Polygon, Circle, Polyline, Marker, StandaloneSearchBox } from '@react-google-maps/api';
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
import { useRawVehicleList, useVehicleTypes } from '@/hooks/useApi';
import { API_BASE_URL } from '@/config/Api';
import type { GeofenceShape } from '@/data/geofenceMapData';

const mapContainerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

interface CreateFenceProps {
  onAddFence: (fence: GeofenceShape) => void;
}

const CreateFence = ({ onAddFence }: CreateFenceProps) => {
  const { toast } = useToast();
  const { data: apiVehicles, loading: vehiclesLoading } = useRawVehicleList();
  const { data: apiVehicleTypes, loading: typesLoading } = useVehicleTypes();

  // Form state
  const [fenceName, setFenceName] = useState('');
  const [alertOnEnter, setAlertOnEnter] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Drawing state
  const [fenceType, setFenceType] = useState<'circle' | 'polygon'>('polygon');
  const [polygonPath, setPolygonPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(true);
  const [circleCenter, setCircleCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [radius, setRadius] = useState(200);

  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

  // Vehicle selection state
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState('All Types');

  // ── Map handlers ──────────────────────────────────────────────────────────

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const latLng = e.latLng.toJSON();
    if (fenceType === 'polygon' && isDrawingPolygon) {
      setPolygonPath(prev => [...prev, latLng]);
    } else if (fenceType === 'circle' && !circleCenter) {
      setCircleCenter(latLng);
    }
  }, [fenceType, isDrawingPolygon, circleCenter]);

  const handleCompletePolygon = useCallback(() => {
    if (polygonPath.length >= 3) {
      setIsDrawingPolygon(false);
    } else {
      toast({ title: 'Action required', description: 'Please add at least 3 points to form a polygon.', variant: 'destructive' });
    }
  }, [polygonPath.length, toast]);

  const handleMarkerClick = useCallback((index: number) => {
    if (fenceType === 'polygon' && isDrawingPolygon && index === 0) {
      handleCompletePolygon();
    }
  }, [fenceType, isDrawingPolygon, handleCompletePolygon]);

  const handleFenceTypeChange = (type: 'circle' | 'polygon') => {
    setFenceType(type);
    setPolygonPath([]);
    setIsDrawingPolygon(true);
    setCircleCenter(null);
    setRadius(200);
  };

  const handleUndo = () => {
    if (fenceType === 'polygon' && isDrawingPolygon && polygonPath.length > 0) {
      setPolygonPath(prev => prev.slice(0, -1));
    }
  };

  const handleResetShape = () => {
    if (fenceType === 'polygon') {
      setPolygonPath([]);
      setIsDrawingPolygon(true);
    } else {
      setCircleCenter(null);
      setRadius(200);
    }
  };

  const handleReset = useCallback(() => {
    setFenceName('');
    setAlertOnEnter(true);
    setAlertOnExit(false);
    setFenceType('polygon');
    setPolygonPath([]);
    setIsDrawingPolygon(true);
    setCircleCenter(null);
    setRadius(200);
    setVehicleSearchTerm('');
    setSelectedVehicles(new Set());
    setSelectedType('All Types');
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => setSearchBox(ref), []);

  const handlePlacesChanged = useCallback(() => {
    if (!searchBox || !mapRef.current) return;
    const places = searchBox.getPlaces();
    if (!places?.length) return;
    const place = places[0];
    if (!place.geometry) return;
    if (place.geometry.viewport) mapRef.current.fitBounds(place.geometry.viewport);
    else if (place.geometry.location) { mapRef.current.panTo(place.geometry.location); mapRef.current.setZoom(14); }
  }, [searchBox]);

  // ── Vehicle data (API) ────────────────────────────────────────────────────

  const vehicleTypes = useMemo(() => {
    if (!apiVehicleTypes?.length) return ['All Types'];
    return ['All Types', ...Array.from(new Set(apiVehicleTypes.map(vt => vt.typeName.trim()).filter(Boolean))).sort()];
  }, [apiVehicleTypes]);

  const filteredVehicles = useMemo(() => {
    if (!apiVehicles?.length) return [];
    return apiVehicles.filter(v => {
      const matchType = selectedType === 'All Types' || v.type?.trim().toLowerCase() === selectedType.toLowerCase();
      const matchSearch = v.vehName.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                          v.bbid.toLowerCase().includes(vehicleSearchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [vehicleSearchTerm, selectedType, apiVehicles]);

  const selectedVehicleLists = useMemo(() =>
    (apiVehicles ?? [])
      .filter(v => selectedVehicles.has(v.bbid))
      .map(v => ({ VehName: v.vehName, BBID: v.bbid, Type: v.type || '' })),
    [apiVehicles, selectedVehicles],
  );

  const handleSelectVehicle = (bbid: string) => {
    setSelectedVehicles(prev => { const n = new Set(prev); n.has(bbid) ? n.delete(bbid) : n.add(bbid); return n; });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedVehicles(checked === true ? new Set(filteredVehicles.map(v => v.bbid)) : new Set());
  };

  const allFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedVehicles.has(v.bbid));
  const someFilteredSelected = filteredVehicles.some(v => selectedVehicles.has(v.bbid));

  // ── Save to API ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!fenceName.trim()) {
      toast({ title: 'Missing Name', description: 'Please enter a fence name.', variant: 'destructive' });
      return;
    }
    if (selectedVehicles.size === 0) {
      toast({ title: 'No Vehicles', description: 'Please select at least one vehicle to assign the fence to.', variant: 'destructive' });
      return;
    }

    let finalCenter = circleCenter;
    let finalRadius = radius;
    let finalPath = polygonPath;

    if (fenceType === 'circle') {
      if (!circleCenter) {
        toast({ title: 'Missing Shape', description: 'Please click on the map to place the circle.', variant: 'destructive' });
        return;
      }
      finalCenter = circleRef.current?.getCenter()?.toJSON() ?? circleCenter;
      finalRadius = circleRef.current?.getRadius() ?? radius;
    } else {
      if (polygonPath.length < 3 || isDrawingPolygon) {
        toast({ title: 'Incomplete Shape', description: 'Please complete the polygon shape on the map.', variant: 'destructive' });
        return;
      }
      finalPath = polygonRef.current?.getPath()?.getArray().map(p => p.toJSON()) ?? polygonPath;
    }

    const latLongList = fenceType === 'circle' && finalCenter
      ? [{ latitude: finalCenter.lat, longitude: finalCenter.lng }]
      : finalPath.map(p => ({ latitude: p.lat, longitude: p.lng }));

    const payload = {
      FenceId: 0,
      FenceName: fenceName.trim(),
      Radius: fenceType === 'circle' ? finalRadius.toString() : '',
      FenceType: fenceType === 'circle' ? 'Circle' : 'Polygon',
      vehicleLists: selectedVehicleLists,
      latLongList,
    };

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Geofence/SaveGeofence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || 'Failed to save geofence');
      const result = await response.json();
      if (result?.success === false) throw new Error(result.message || 'Failed to save geofence');

      onAddFence({
        id: Date.now(),
        name: fenceName.trim(),
        machines: Array.from(selectedVehicles),
        isActive: true,
        type: fenceType,
        ...(fenceType === 'circle'
          ? { center: finalCenter!, radius: finalRadius }
          : { paths: finalPath }),
      } as GeofenceShape);

      toast({ variant: 'success', title: 'Fence Created', description: `"${fenceName}" has been saved and assigned.` });
      handleReset();
    } catch (error) {
      toast({ title: 'Save Failed', description: (error as Error).message || 'Unable to save fence.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex gap-6 h-full">

      {/* ── Map ── */}
      <div className="bg-muted rounded-lg relative overflow-hidden flex-1 min-h-[400px] lg:min-h-0 shadow-inner border">

        {/* Location search */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72">
          <StandaloneSearchBox onLoad={onSearchBoxLoad} onPlacesChanged={handlePlacesChanged}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search location..." className="pl-9 w-full bg-white/95 shadow-md" />
            </div>
          </StandaloneSearchBox>
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={DEFAULT_CENTER}
          zoom={5}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {fenceType === 'polygon' && polygonPath.length > 0 && (
            isDrawingPolygon ? (
              <>
                <Polyline path={polygonPath} options={{ strokeColor: '#3B82F6', strokeWeight: 3 }} />
                {polygonPath.map((p, i) => (
                  <Marker
                    key={i}
                    position={p}
                    onClick={() => handleMarkerClick(i)}
                    title={i === 0 && polygonPath.length >= 2 ? 'Click to complete polygon' : undefined}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE,
                      scale: 5,
                      fillColor: '#ffffff',
                      fillOpacity: 1,
                      strokeColor: '#3B82F6',
                      strokeWeight: 2,
                    }}
                  />
                ))}
              </>
            ) : (
              <Polygon
                onLoad={p => { polygonRef.current = p; }}
                paths={polygonPath}
                options={{
                  fillColor: '#3B82F6', fillOpacity: 0.35,
                  strokeColor: '#3B82F6', strokeWeight: 2,
                  editable: true, draggable: true,
                }}
              />
            )
          )}

          {fenceType === 'circle' && circleCenter && (
            <Circle
              onLoad={c => { circleRef.current = c; }}
              center={circleCenter}
              radius={radius}
              options={{
                fillColor: '#3B82F6', fillOpacity: 0.35,
                strokeColor: '#3B82F6', strokeWeight: 2,
                editable: true, draggable: true,
              }}
              onRadiusChanged={() => {
                if (circleRef.current) {
                  const r = circleRef.current.getRadius();
                  setRadius(prev => Math.abs(prev - r) < 0.1 ? prev : r);
                }
              }}
            />
          )}
        </GoogleMap>

        {/* Sidebar toggle */}
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex items-center justify-center w-6 h-12 bg-card border border-border rounded-full shadow-md hover:bg-muted transition-colors"
          title={isSidebarOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {isSidebarOpen
            ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* ── Sidebar ── */}
      <div
        className={cn(
          'bg-card rounded-lg flex flex-col border shadow-sm overflow-hidden transition-all duration-300 ease-in-out shrink-0',
          isSidebarOpen ? 'w-[350px] p-4 opacity-100' : 'w-0 p-0 opacity-0 border-transparent',
        )}
      >
        <h2 className="text-xl font-bold mb-4 text-foreground shrink-0">Create a Geofence</h2>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-5">

            {/* Fence type */}
            <div className="bg-muted p-1 rounded-lg grid grid-cols-2 gap-1">
              {(['circle', 'polygon'] as const).map(type => (
                <Button
                  key={type}
                  variant="ghost"
                  onClick={() => handleFenceTypeChange(type)}
                  className={cn(
                    'w-full h-9 capitalize',
                    fenceType === type
                      ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                      : 'text-muted-foreground hover:bg-muted-foreground/10',
                  )}
                >
                  {type}
                </Button>
              ))}
            </div>

            {/* Drawing status */}
            {fenceType === 'polygon' ? (
              isDrawingPolygon ? (
                <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-md border border-blue-200 dark:border-blue-800/50">
                  <span className="font-semibold block mb-1">Drawing Mode</span>
                  Click on the map to add boundary points. Click the first point or "Complete" to finish.
                </div>
              ) : (
                <div className="text-xs text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2.5 rounded-md border border-green-200 dark:border-green-800/50">
                  <span className="font-semibold block mb-1">Shape Complete</span>
                  You can drag edges and vertices on the map to adjust.
                </div>
              )
            ) : (
              !circleCenter ? (
                <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-md border border-blue-200 dark:border-blue-800/50">
                  Click anywhere on the map to place the circle center.
                </div>
              ) : (
                <div className="text-xs text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2.5 rounded-md border border-green-200 dark:border-green-800/50">
                  <span className="font-semibold block mb-1">Circle Placed</span>
                  You can drag the center or edges to adjust position and radius.
                </div>
              )
            )}

            {/* Fence name */}
            <div className="space-y-1.5">
              <Label htmlFor="fenceName">Fence Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fenceName"
                  placeholder="e.g. Base Camp"
                  className="pl-9 h-9"
                  value={fenceName}
                  onChange={e => setFenceName(e.target.value)}
                />
              </div>
            </div>

            {/* Vehicle selector */}
            <div className="space-y-1.5">
              <Label>Assign to Vehicles <span className="text-red-500">*</span></Label>
              <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isVehicleSelectorOpen} className="w-full justify-between h-9 font-normal">
                    {selectedVehicles.size > 0
                      ? <span className="text-primary font-medium">{selectedVehicles.size} vehicle(s) selected</span>
                      : 'Select vehicles...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="border rounded-md shadow-lg">
                    <div className="p-2 border-b bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search..."
                            value={vehicleSearchTerm}
                            onChange={e => setVehicleSearchTerm(e.target.value)}
                            className="pl-8 h-9 text-xs"
                          />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            {vehicleTypes.map(type => (
                              <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center p-2.5 border-b bg-background">
                      <Checkbox
                        id="select-all-vehicles"
                        checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all-vehicles" className="ml-2.5 text-xs font-semibold">
                        Select all ({filteredVehicles.length})
                      </Label>
                    </div>
                    <ScrollArea className="h-48 bg-background">
                      <div className="p-1">
                        {vehiclesLoading || typesLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Loading vehicles...</div>
                        ) : filteredVehicles.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No vehicles found</div>
                        ) : filteredVehicles.map(v => (
                          <div key={v.bbid} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/60 transition-colors">
                            <Checkbox
                              id={`vehicle-${v.bbid}`}
                              checked={selectedVehicles.has(v.bbid)}
                              onCheckedChange={() => handleSelectVehicle(v.bbid)}
                            />
                            <Label htmlFor={`vehicle-${v.bbid}`} className="w-full cursor-pointer text-xs flex justify-between items-center">
                              <span className="font-medium">{v.vehName}</span>
                              <span className="text-muted-foreground">{v.bbid}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Radius (circle only) */}
            {fenceType === 'circle' && (
              <div className="pt-2 bg-muted/30 p-3 rounded-lg border">
                <div className="flex justify-between items-center mb-3">
                  <Label htmlFor="poi-radius-input">Circle Radius</Label>
                  <span className="text-xs font-mono text-muted-foreground">{radius} m</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    id="poi-radius-slider"
                    min={50} max={5000} step={50}
                    value={[radius]}
                    onValueChange={v => setRadius(v[0])}
                    className="flex-1"
                  />
                  <div className="relative w-24 shrink-0">
                    <Input
                      id="poi-radius-input"
                      type="number"
                      value={radius}
                      onChange={e => { const n = parseInt(e.target.value, 10); setRadius(isNaN(n) ? 0 : n); }}
                      onBlur={e => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 50) setRadius(50); else if (n > 5000) setRadius(5000); }}
                      className="pr-6 text-right h-8 text-xs"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-muted-foreground pointer-events-none">m</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alert triggers */}
            {/* <div className="pt-2">
              <h3 className="text-sm font-semibold mb-3">Alert Triggers</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn('border p-3 rounded-lg flex items-center justify-between transition-colors', alertOnEnter ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : '')}>
                  <Label htmlFor="alert-enter" className="text-xs font-medium cursor-pointer">On Enter</Label>
                  <Switch id="alert-enter" checked={alertOnEnter} onCheckedChange={setAlertOnEnter} />
                </div>
                <div className={cn('border p-3 rounded-lg flex items-center justify-between transition-colors', alertOnExit ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : '')}>
                  <Label htmlFor="alert-exit" className="text-xs font-medium cursor-pointer">On Exit</Label>
                  <Switch id="alert-exit" checked={alertOnExit} onCheckedChange={setAlertOnExit} />
                </div>
              </div>
            </div> */}

          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-5 shrink-0 border-t">
          <div className="flex flex-col gap-3">
            {fenceType === 'polygon' && isDrawingPolygon && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 bg-muted/50" onClick={handleUndo} disabled={polygonPath.length === 0}>
                  <Undo className="h-4 w-4 mr-2" /> Undo
                </Button>
                <Button
                  className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  onClick={handleCompletePolygon}
                  disabled={polygonPath.length < 3}
                >
                  <Check className="h-4 w-4 mr-1.5" /> Complete
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 border-dashed"
                onClick={handleResetShape}
                disabled={fenceType === 'polygon' ? polygonPath.length === 0 : !circleCenter}
              >
                <RotateCcw className="h-4 w-4 mr-1.5 text-muted-foreground" /> Redraw
              </Button>
              <Button
                className="flex-[2] h-10 font-bold bg-brand-blue text-white shadow-md hover:bg-brand-blue/90"
                onClick={handleCreate}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Geofence'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFence;
