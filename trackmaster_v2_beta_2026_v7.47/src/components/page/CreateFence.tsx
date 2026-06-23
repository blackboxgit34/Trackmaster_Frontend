import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Search, Tag, ChevronsUpDown, Undo, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleMap, StandaloneSearchBox } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { API_BASE_URL } from '@/config/Api';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useRawVehicleList, useVehicleTypes } from '@/hooks/useApi';
import type { GeofenceShape } from '@/data/geofenceMapData';

const mapContainerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

// Snap-to-first-point threshold in pixels
const SNAP_THRESHOLD_PX = 20;

interface CreateFenceProps {
  onAddFence: (fence: GeofenceShape) => void;
}

const CreateFence = ({ onAddFence }: CreateFenceProps) => {
  const { toast } = useToast();
  const { data: apiVehicles, loading: vehiclesLoading } = useRawVehicleList();
  const { data: apiVehicleTypes, loading: typesLoading } = useVehicleTypes();

  const [fenceType, setFenceType] = useState<'circle' | 'polygon'>('polygon');
  const [alertOnEnter, setAlertOnEnter] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [radius, setRadius] = useState(500);
  const [fenceName, setFenceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isNearFirstPoint, setIsNearFirstPoint] = useState(false);

  // Vehicle selection
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState('All Types');

  // Shape state
  const [polygonPoints, setPolygonPoints] = useState<google.maps.LatLngLiteral[]>([]);
  const [circleCenter, setCircleCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [circleDrawn, setCircleDrawn] = useState(false);

  // Refs — all imperative map objects live here
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const previewPolylineRef = useRef<google.maps.Polyline | null>(null);  // ghost line to cursor
  const closingPolylineRef = useRef<google.maps.Polyline | null>(null);  // ghost line back to first point
  const vertexMarkersRef = useRef<google.maps.Marker[]>([]);
  const firstPointMarkerRef = useRef<google.maps.Marker | null>(null);   // highlighted first point
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mouseMoveListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const pointsRef = useRef<google.maps.LatLngLiteral[]>([]);             // always-current shadow of polygonPoints
  const radiusRef = useRef(radius);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

  // Keep radiusRef in sync
  useEffect(() => { radiusRef.current = radius; }, [radius]);
  // Keep pointsRef in sync
  useEffect(() => { pointsRef.current = polygonPoints; }, [polygonPoints]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const removeListeners = () => {
    clickListenerRef.current?.remove(); clickListenerRef.current = null;
    mouseMoveListenerRef.current?.remove(); mouseMoveListenerRef.current = null;
  };

  const clearOverlays = () => {
    polygonRef.current?.setMap(null); polygonRef.current = null;
    circleRef.current?.setMap(null); circleRef.current = null;
    previewPolylineRef.current?.setMap(null); previewPolylineRef.current = null;
    closingPolylineRef.current?.setMap(null); closingPolylineRef.current = null;
    firstPointMarkerRef.current?.setMap(null); firstPointMarkerRef.current = null;
    vertexMarkersRef.current.forEach(m => m.setMap(null));
    vertexMarkersRef.current = [];
  };

  /** Pixel distance between two lat/lng points on current map */
  const pixelDistance = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number => {
    if (!mapRef.current) return Infinity;
    const proj = mapRef.current.getProjection();
    if (!proj) return Infinity;
    const scale = Math.pow(2, mapRef.current.getZoom() ?? 10);
    const pa = proj.fromLatLngToPoint(new window.google.maps.LatLng(a));
    const pb = proj.fromLatLngToPoint(new window.google.maps.LatLng(b));
    if (!pa || !pb) return Infinity;
    return Math.sqrt(Math.pow((pa.x - pb.x) * scale, 2) + Math.pow((pa.y - pb.y) * scale, 2));
  };

  /** Redraw the filled polygon from current points */
  const redrawPolygon = (pts: google.maps.LatLngLiteral[]) => {
    if (!mapRef.current) return;
    polygonRef.current?.setMap(null);
    if (pts.length < 2) { polygonRef.current = null; return; }
    polygonRef.current = new window.google.maps.Polygon({
      paths: pts,
      fillColor: '#3B82F6',
      fillOpacity: 0.15,
      strokeColor: '#3B82F6',
      strokeWeight: 2,
      map: mapRef.current,
      clickable: false,
    });
  };

  /** Add a numbered vertex marker */
  const addVertexMarker = (pt: google.maps.LatLngLiteral, index: number) => {
    if (!mapRef.current) return;
    const marker = new window.google.maps.Marker({
      position: pt,
      map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 10,
      clickable: false,
    });
    vertexMarkersRef.current.push(marker);
  };

  /** Highlight the first vertex so user can snap-close to it */
  const updateFirstPointMarker = (pt: google.maps.LatLngLiteral, near: boolean) => {
    firstPointMarkerRef.current?.setMap(null);
    if (!mapRef.current) return;
    firstPointMarkerRef.current = new window.google.maps.Marker({
      position: pt,
      map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: near ? 10 : 7,
        fillColor: near ? '#ffffff' : '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#3B82F6',
        strokeWeight: near ? 3 : 2,
      },
      zIndex: 20,
      clickable: false,
    });
  };

  // ── Finish polygon ────────────────────────────────────────────────────────

  const finishPolygon = useCallback((pts: google.maps.LatLngLiteral[]) => {
    removeListeners();
    previewPolylineRef.current?.setMap(null); previewPolylineRef.current = null;
    closingPolylineRef.current?.setMap(null); closingPolylineRef.current = null;
    firstPointMarkerRef.current?.setMap(null); firstPointMarkerRef.current = null;
    mapRef.current?.setOptions({ draggableCursor: '' });
    setIsDrawing(false);
    setIsNearFirstPoint(false);
    // Draw final closed polygon
    redrawPolygon(pts);
  }, []);

  // ── Start drawing ─────────────────────────────────────────────────────────

  const startDrawing = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    map.setOptions({ draggableCursor: 'crosshair' });
    setIsDrawing(true);

    if (fenceType === 'polygon') {
      // Reset local accumulator
      pointsRef.current = [];
      setPolygonPoints([]);
      clearOverlays();

      // ── CLICK handler ────────────────────────────────────────────────────
      clickListenerRef.current = window.google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pt = e.latLng.toJSON();
        const pts = pointsRef.current;

        // Snap-close: if clicking near the first point (and we have ≥3 pts) → finish
        if (pts.length >= 3) {
          const dist = pixelDistance(pt, pts[0]);
          if (dist < SNAP_THRESHOLD_PX) {
            finishPolygon(pts);
            return;
          }
        }

        // Add new point
        const newPts = [...pts, pt];
        pointsRef.current = newPts;
        setPolygonPoints(newPts);

        // Vertex marker
        addVertexMarker(pt, newPts.length - 1);

        // Update first-point highlight
        if (newPts.length >= 3) updateFirstPointMarker(newPts[0], false);

        // Redraw filled polygon preview
        redrawPolygon(newPts);
      });

      // ── MOUSEMOVE handler ────────────────────────────────────────────────
      mouseMoveListenerRef.current = window.google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const cursor = e.latLng.toJSON();
        const pts = pointsRef.current;
        if (pts.length === 0) return;

        const last = pts[pts.length - 1];

        // Preview line: last point → cursor
        previewPolylineRef.current?.setMap(null);
        previewPolylineRef.current = new window.google.maps.Polyline({
          path: [last, cursor],
          strokeColor: '#3B82F6',
          strokeWeight: 1.5,
          strokeOpacity: 0.7,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
          map,
          clickable: false,
        });

        // Closing preview line: cursor → first point (once we have ≥3 pts)
        closingPolylineRef.current?.setMap(null);
        closingPolylineRef.current = null;

        if (pts.length >= 3) {
          const dist = pixelDistance(cursor, pts[0]);
          const near = dist < SNAP_THRESHOLD_PX;
          setIsNearFirstPoint(near);
          updateFirstPointMarker(pts[0], near);

          if (!near) {
            closingPolylineRef.current = new window.google.maps.Polyline({
              path: [cursor, pts[0]],
              strokeColor: '#3B82F6',
              strokeWeight: 1,
              strokeOpacity: 0.35,
              map,
              clickable: false,
            });
          }
        }
      });

    } else {
      // ── CIRCLE ─────────────────────────────────────────────────────────
      clearOverlays();
      setCircleCenter(null);
      setCircleDrawn(false);

      // Preview circle follows mouse
      mouseMoveListenerRef.current = window.google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        circleRef.current?.setMap(null);
        circleRef.current = new window.google.maps.Circle({
          center: e.latLng.toJSON(),
          radius: radiusRef.current,
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          strokeColor: '#3B82F6',
          strokeWeight: 1.5,
          strokeOpacity: 0.6,
          map,
          clickable: false,
        });
      });

      // Click → fix the circle
      clickListenerRef.current = window.google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const center = e.latLng.toJSON();
        removeListeners();
        mouseMoveListenerRef.current?.remove(); mouseMoveListenerRef.current = null;

        // Draw final circle
        circleRef.current?.setMap(null);
        circleRef.current = new window.google.maps.Circle({
          center,
          radius: radiusRef.current,
          fillColor: '#3B82F6',
          fillOpacity: 0.2,
          strokeColor: '#3B82F6',
          strokeWeight: 2,
          map,
          clickable: false,
        });

        setCircleCenter(center);
        setCircleDrawn(true);
        map.setOptions({ draggableCursor: '' });
        setIsDrawing(false);
      });
    }
  }, [fenceType, finishPolygon]);

  // Sync radius to placed circle
  useEffect(() => {
    if (circleRef.current && circleDrawn) {
      circleRef.current.setRadius(radius);
    }
  }, [radius, circleDrawn]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    removeListeners();
    clearOverlays();
    pointsRef.current = [];
    setPolygonPoints([]);
    setCircleCenter(null);
    setCircleDrawn(false);
    setFenceName('');
    setRadius(500);
    setIsDrawing(false);
    setIsNearFirstPoint(false);
    setVehicleSearchTerm('');
    setSelectedVehicles(new Set());
    setSelectedType('All Types');
    mapRef.current?.setOptions({ draggableCursor: '' });
  }, []);

  const handleFenceTypeChange = (type: 'circle' | 'polygon') => {
    handleReset();
    setFenceType(type);
  };

  // ── Undo ──────────────────────────────────────────────────────────────────

  const handleUndo = () => {
    if (polygonPoints.length === 0) return;
    const newPts = polygonPoints.slice(0, -1);
    pointsRef.current = newPts;
    setPolygonPoints(newPts);

    // Remove last vertex marker
    const last = vertexMarkersRef.current.pop();
    last?.setMap(null);

    // Update first point highlight
    firstPointMarkerRef.current?.setMap(null);
    firstPointMarkerRef.current = null;
    if (newPts.length >= 3) updateFirstPointMarker(newPts[0], false);

    redrawPolygon(newPts);

    // If we were done, re-enable drawing
    if (!isDrawing && newPts.length > 0) {
      startDrawing();
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!fenceName.trim()) {
      toast({ title: 'Error', description: 'Please enter a fence name.', variant: 'destructive' });
      return;
    }
    const hasShape = fenceType === 'polygon' ? polygonPoints.length >= 3 && !isDrawing : circleDrawn;
    if (!hasShape) {
      toast({ title: 'Error', description: fenceType === 'polygon' ? 'Finish drawing the polygon first (close it or click Finish).' : 'Click on the map to place the circle.', variant: 'destructive' });
      return;
    }
    if (selectedVehicles.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one vehicle.', variant: 'destructive' });
      return;
    }

    let latLongList: { latitude: number; longitude: number }[] = [];
    if (fenceType === 'circle' && circleCenter) {
      latLongList = [{ latitude: circleCenter.lat, longitude: circleCenter.lng }];
    } else {
      latLongList = polygonPoints.map(p => ({ latitude: p.lat, longitude: p.lng }));
    }

    const payload = {
      FenceId: 0,
      FenceName: fenceName,
      Radius: fenceType === 'circle' ? radius.toString() : '',
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
        name: fenceName,
        machines: Array.from(selectedVehicles),
        isActive: true,
        type: fenceType,
        ...(fenceType === 'circle' ? { center: circleCenter!, radius } : { paths: polygonPoints }),
      } as GeofenceShape);

      toast({ variant: 'success', title: 'Success', description: `Fence "${fenceName}" saved and assigned to ${selectedVehicles.size} vehicle(s).` });
      handleReset();
    } catch (error) {
      toast({ title: 'Save Failed', description: (error as Error).message || 'Unable to save fence.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Map setup ─────────────────────────────────────────────────────────────

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onMapUnmount = useCallback(() => { removeListeners(); mapRef.current = null; }, []);
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

  // ── Vehicle helpers ───────────────────────────────────────────────────────

  const vehicleTypes = useMemo(() => {
    if (!apiVehicleTypes?.length) return ['All Types'];
    return ['All Types', ...Array.from(new Set(apiVehicleTypes.map(vt => vt.typeName.trim()).filter(Boolean))).sort()];
  }, [apiVehicleTypes]);

  const filteredVehicles = useMemo(() => {
    if (!apiVehicles?.length) return [];
    return apiVehicles.filter(v => {
      const matchType = selectedType === 'All Types' || v.type?.trim().toLowerCase() === selectedType.toLowerCase();
      const matchSearch = v.vehName.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) || v.bbid.toLowerCase().includes(vehicleSearchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [vehicleSearchTerm, selectedType, apiVehicles]);

  const selectedVehicleLists = useMemo(() => (apiVehicles ?? [])
    .filter(v => selectedVehicles.has(v.bbid))
    .map(v => ({ VehName: v.vehName, BBID: v.bbid, Type: v.type || '' })),
    [apiVehicles, selectedVehicles]);

  const handleSelectVehicle = (id: string) => setSelectedVehicles(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleSelectAll = (checked: boolean | 'indeterminate') => setSelectedVehicles(checked === true ? new Set(filteredVehicles.map(v => v.bbid)) : new Set());
  const allFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedVehicles.has(v.bbid));
  const someFilteredSelected = filteredVehicles.some(v => selectedVehicles.has(v.bbid));

  const hasDrawnShape = fenceType === 'polygon' ? (polygonPoints.length >= 3 && !isDrawing) : circleDrawn;
  const canUndo = fenceType === 'polygon' && polygonPoints.length > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[1fr_350px] lg:grid-rows-1 gap-6 h-full">

      {/* ── Map ── */}
      <div className="bg-muted rounded-lg relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={DEFAULT_CENTER}
          zoom={5}
          options={mapOptions}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
        />

        {/* Drawing instructions toast */}
        {isDrawing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/85 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
            {fenceType === 'polygon' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                {polygonPoints.length === 0 && 'Click to place first point'}
                {polygonPoints.length >= 1 && polygonPoints.length < 3 && `${polygonPoints.length} point${polygonPoints.length > 1 ? 's' : ''} — keep clicking`}
                {polygonPoints.length >= 3 && !isNearFirstPoint && 'Click first point to close · or keep adding'}
                {polygonPoints.length >= 3 && isNearFirstPoint && '✓ Click to close polygon'}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
                Move cursor to preview · Click to place
              </>
            )}
          </div>
        )}

        {/* Finish button (polygon, ≥3 pts, still drawing) */}
        {isDrawing && fenceType === 'polygon' && polygonPoints.length >= 3 && (
          <button
            onClick={() => finishPolygon(pointsRef.current)}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-brand-blue text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-brand-blue/90 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Finish polygon
          </button>
        )}

        {/* Cancel button while drawing */}
        {isDrawing && (
          <button
            onClick={handleReset}
            className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div className="bg-card rounded-lg p-4 flex flex-col border overflow-hidden">
        <h2 className="text-xl font-bold mb-4 text-foreground shrink-0">Create a fence</h2>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">

            {/* Location search */}
            <StandaloneSearchBox onLoad={onSearchBoxLoad} onPlacesChanged={handlePlacesChanged}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Location" className="pl-9 w-full" />
              </div>
            </StandaloneSearchBox>

            {/* Shape type */}
            <div className="bg-muted p-1 rounded-lg grid grid-cols-2 gap-1">
              {(['circle', 'polygon'] as const).map(type => (
                <Button key={type} variant="ghost" onClick={() => handleFenceTypeChange(type)}
                  className={cn('w-full h-9 capitalize', fenceType === type ? 'bg-brand-blue text-white hover:bg-brand-blue/90' : 'hover:bg-muted-foreground/10')}>
                  {type}
                </Button>
              ))}
            </div>

            {/* Draw CTA / status */}
            {!isDrawing && !hasDrawnShape && (
              <Button variant="outline" className="w-full border-dashed border-brand-blue text-brand-blue hover:bg-brand-blue/5" onClick={startDrawing}>
                {fenceType === 'polygon' ? '✏️  Draw Polygon on Map' : '⭕  Place Circle on Map'}
              </Button>
            )}

            {isDrawing && fenceType === 'polygon' && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="shrink-0 font-semibold tabular-nums">{polygonPoints.length}</span>
                <span>{polygonPoints.length === 1 ? 'point placed' : 'points placed'}</span>
                {polygonPoints.length >= 3 && <span className="ml-auto text-blue-500">click 1st point or ↑ Finish</span>}
              </div>
            )}

            {hasDrawnShape && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                {fenceType === 'polygon' ? `Polygon with ${polygonPoints.length} points ready` : 'Circle placed — adjust radius below'}
              </div>
            )}

            {/* Fence name */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Fence Name" className="pl-9 h-9 text-sm" value={fenceName} onChange={e => setFenceName(e.target.value)} />
            </div>

            {/* Vehicle selector */}
            <div>
              <Label>Assign to Vehicles</Label>
              <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                    {selectedVehicles.size > 0 ? `${selectedVehicles.size} vehicle(s) selected` : 'Select vehicles...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="border rounded-md">
                    <div className="p-2 border-b grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search vehicle..." value={vehicleSearchTerm} onChange={e => setVehicleSearchTerm(e.target.value)} className="pl-8 h-9" />
                      </div>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center p-2 border-b">
                      <Checkbox id="select-all" checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false} onCheckedChange={handleSelectAll} />
                      <Label htmlFor="select-all" className="ml-2 text-sm font-medium">Select all ({filteredVehicles.length} found)</Label>
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-1">
                        {vehiclesLoading || typesLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Loading vehicles...</div>
                        ) : filteredVehicles.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No vehicles found</div>
                        ) : filteredVehicles.map(v => (
                          <div key={v.bbid} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                            <Checkbox id={`v-${v.bbid}`} checked={selectedVehicles.has(v.bbid)} onCheckedChange={() => handleSelectVehicle(v.bbid)} />
                            <Label htmlFor={`v-${v.bbid}`} className="w-full cursor-pointer text-sm font-normal">{v.vehName}</Label>
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
              <div className="pt-2">
                <Label htmlFor="radius-input">Set Radius</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider id="radius-slider" min={50} max={5000} step={50} value={[radius]}
                    onValueChange={v => setRadius(v[0])} className="flex-1" />
                  <div className="relative w-28">
                    <Input id="radius-input" type="number" value={radius}
                      onChange={e => { const n = parseInt(e.target.value, 10); setRadius(isNaN(n) ? 0 : n); }}
                      onBlur={e => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 50) setRadius(50); else if (n > 5000) setRadius(5000); }}
                      className="pr-8 text-right" />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">m</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden alert settings */}
            <div className="hidden mt-6 space-y-3">
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

        {/* Footer buttons */}
        <div className="mt-auto pt-4 shrink-0">
          <div className={cn('grid gap-3', fenceType === 'polygon' ? 'grid-cols-3' : 'grid-cols-2')}>
            {fenceType === 'polygon' && (
              <Button variant="outline" onClick={handleUndo} disabled={!canUndo || isSaving}>
                <Undo className="h-4 w-4 mr-1" /> Undo
              </Button>
            )}
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>Reset</Button>
            <Button className="bg-brand-blue text-white hover:bg-brand-blue/90" onClick={handleCreate} disabled={isSaving || isDrawing}>
              {isSaving ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFence;