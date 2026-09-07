import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '@/context/TripContext';
import { usePois } from '@/context/PoiContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { calculateHaversineDistance, createCustomMarkerIcon } from '@/lib/map-utils';
import {
  Route,
  MapPin,
  Navigation,
  Clock,
  Fuel,
  Flag,
  RotateCcw,
  GripVertical,
  Copy,
  Trash2,
  Plus,
  LocateFixed,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 19.0760,
  lng: 72.8777,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
};

export interface RouteStop {
  id: string;
  stopType: 'waypoint' | 'halt';
  name: string;
  coords: { lat: number; lng: number } | null;
  mode: 'poi' | 'custom';
  selectedPoiId?: string;
  notes?: string;
  duration?: string; // e.g. "45m"
  reason?: string; // e.g. "Fuel", "Rest", etc.
}

const HALT_REASONS = [
  'Fuel',
  'Rest / Driver Break',
  'Cargo Inspection',
  'Meal',
  'Toll / Checkpoint',
  'Maintenance',
];

export default function CreateRoutePage() {
  const { addRoute } = useTrips();
  const { pois } = usePois();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form State
  const [routeName, setRouteName] = useState('');

  // Origin State
  const [originName, setOriginName] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originPoiId, setOriginPoiId] = useState('');
  const [originMode, setOriginMode] = useState<'custom' | 'poi'>('custom');

  // Intermediate Stops State (Waypoints and Halts)
  const [stops, setStops] = useState<RouteStop[]>([]);

  // Destination State
  const [destName, setDestName] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destPoiId, setDestPoiId] = useState('');
  const [destMode, setDestMode] = useState<'custom' | 'poi'>('custom');

  // Metrics State
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Drag & Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Map Click Target State
  const [clickTarget, setClickTarget] = useState<
    | { type: 'origin' }
    | { type: 'dest' }
    | { type: 'stop'; stopId: string }
    | null
  >(null);

  // Sync POI selections
  useEffect(() => {
    if (originMode === 'poi' && originPoiId) {
      const poi = pois.find((p) => p.id === originPoiId);
      if (poi) {
        setOriginCoords({ lat: poi.latitude, lng: poi.longitude });
        setOriginName(poi.poiName);
      }
    }
  }, [originPoiId, originMode, pois]);

  useEffect(() => {
    if (destMode === 'poi' && destPoiId) {
      const poi = pois.find((p) => p.id === destPoiId);
      if (poi) {
        setDestCoords({ lat: poi.latitude, lng: poi.longitude });
        setDestName(poi.poiName);
      }
    }
  }, [destPoiId, destMode, pois]);

  // Recalculate Total Distance & Time
  useEffect(() => {
    const points: { lat: number; lng: number }[] = [];
    if (originCoords) points.push(originCoords);

    stops.forEach((s) => {
      if (s.coords) points.push(s.coords);
    });

    if (destCoords) points.push(destCoords);

    if (points.length < 2) {
      setDistance(0);
      setDuration(0);
      return;
    }

    let totalDist = 0;
    const tortuosityFactor = 1.3; // multiplier to convert straight-line to roughly road distance
    for (let i = 0; i < points.length - 1; i++) {
      totalDist += calculateHaversineDistance(
        points[i].lat,
        points[i].lng,
        points[i + 1].lat,
        points[i + 1].lng
      ) * tortuosityFactor;
    }
    const roundedDist = parseFloat(totalDist.toFixed(1));
    setDistance(roundedDist);

    // Calculate travel time (40km/h avg speed)
    let totalHrs = totalDist / 40;

    // Add halt durations
    stops.forEach((s) => {
      if (s.stopType === 'halt' && s.duration) {
        const dStr = s.duration.trim().toLowerCase();
        if (dStr.endsWith('m')) {
          const mins = parseInt(dStr, 10);
          if (!isNaN(mins)) totalHrs += mins / 60;
        } else if (dStr.endsWith('h')) {
          const hrs = parseFloat(dStr);
          if (!isNaN(hrs)) totalHrs += hrs;
        }
      }
    });

    setDuration(parseFloat(totalHrs.toFixed(1)) || 0.5);
  }, [originCoords, stops, destCoords]);

  // Handle Map Click
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !clickTarget) return;
      const coords = e.latLng.toJSON();

      if (clickTarget.type === 'origin') {
        setOriginCoords(coords);
        if (!originName || originMode === 'poi') {
          setOriginName(`Pinned Origin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        }
        setOriginMode('custom');
        setClickTarget(null);
        toast({ title: 'Origin Point Set', description: 'Selected location marked as origin.' });
      } else if (clickTarget.type === 'dest') {
        setDestCoords(coords);
        if (!destName || destMode === 'poi') {
          setDestName(`Pinned Destination (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        }
        setDestMode('custom');
        setClickTarget(null);
        toast({ title: 'Destination Point Set', description: 'Selected location marked as destination.' });
      } else if (clickTarget.type === 'stop' && clickTarget.stopId) {
        setStops((prev) =>
          prev.map((s) =>
            s.id === clickTarget.stopId
              ? {
                ...s,
                coords,
                name: s.name || `Pinned ${s.stopType === 'waypoint' ? 'Waypoint' : 'Halt'} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
                mode: 'custom',
              }
              : s
          )
        );
        setClickTarget(null);
        toast({ title: 'Stop Location Set', description: 'Selected location marked as stop.' });
      }
    },
    [clickTarget, originName, originMode, destName, destMode, toast]
  );

  // Stop Actions
  const handleAddStop = (type: 'waypoint' | 'halt', afterIndex?: number) => {
    const newStop: RouteStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stopType: type,
      name: '',
      coords: null,
      mode: 'custom',
      ...(type === 'waypoint'
        ? { notes: '' }
        : { duration: '45m', reason: 'Fuel' }),
    };

    setStops((prev) => {
      if (afterIndex !== undefined) {
        const next = [...prev];
        const insertAt = afterIndex === -1 ? 0 : afterIndex + 1;
        next.splice(insertAt, 0, newStop);
        return next;
      }
      return [...prev, newStop];
    });
  };

  const handleDuplicateStop = (index: number) => {
    const target = stops[index];
    if (!target) return;
    const duplicated: RouteStop = {
      ...target,
      id: `stop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: target.name ? `${target.name} (Copy)` : '',
    };
    setStops((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
    toast({ title: 'Stop Duplicated', description: `Duplicated ${target.stopType}` });
  };

  const handleDeleteStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStop = (id: string, updates: Partial<RouteStop>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // Reordering Handlers (Move Up / Move Down)
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    setStops((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });

    toast({
      title: 'Reordered Route',
      description: 'Stop sequence updated successfully.',
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a route name.', variant: 'destructive' });
      return;
    }
    if (!originCoords || !destCoords) {
      toast({ title: 'Validation Error', description: 'Please set both origin and destination.', variant: 'destructive' });
      return;
    }

    addRoute({
      name: routeName,
      originName: originName || 'Origin',
      originCoords,
      destName: destName || 'Destination',
      destCoords,
      distance,
      duration,
    });

    toast({
      title: 'Success',
      description: `Route "${routeName}" created successfully.`,
    });
    navigate('/trip-management/routes');
  };

  // Map Center
  const mapCenter = useMemo(() => {
    if (originCoords) return originCoords;
    if (destCoords) return destCoords;
    return defaultCenter;
  }, [originCoords, destCoords]);

  // Sequential Map Path
  const polylinePath = useMemo(() => {
    const list: { lat: number; lng: number }[] = [];
    if (originCoords) list.push(originCoords);
    stops.forEach((s) => {
      if (s.coords) list.push(s.coords);
    });
    if (destCoords) list.push(destCoords);
    return list;
  }, [originCoords, stops, destCoords]);

  let waypointCounter = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-full">
      {/* Compact Control Panel Sidebar */}
      <Card className="shadow-sm border border-border h-full flex flex-col overflow-hidden">
        <CardHeader className="py-2.5 px-3.5 border-b border-border shrink-0 space-y-0.5">
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <Route className="h-4 w-4 text-primary" /> Create Route
          </CardTitle>
          <CardDescription className="text-[11px] leading-tight">
            Configure origin, waypoints, halts, and destination.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Route Name Input */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Route className="h-3.5 w-3.5 text-primary" /> Route Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Mumbai to Pune Express"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            {/* Compact Timeline Section */}
            <div className="relative pl-6 space-y-3">

              {/* 1. ORIGIN SECTION (Slate Theme) */}
              <div className="space-y-2">
                <div className="relative p-2.5 rounded-md border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 shadow-xs space-y-2">
                  {/* Connecting Line starting at Origin dot center going down */}
                  <div className="absolute -left-4 top-1/2 -bottom-6 w-[2px] bg-slate-300 dark:bg-slate-700" />
                  {/* Origin Pointer Dot (Vertically Centered on Card) */}
                  <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-700 dark:bg-slate-300 border-2 border-background shadow-xs z-10" />

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> Origin
                    </Label>

                    {/* Origin Mode Switcher: Search / Custom vs Select POI */}
                    <div className="flex items-center bg-background/80 p-0.5 rounded-md border border-border/60 text-[10px]">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${originMode === 'custom'
                          ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                        onClick={() => setOriginMode('custom')}
                      >
                        Search / Custom
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${originMode === 'poi'
                          ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                        onClick={() => setOriginMode('poi')}
                      >
                        Select POI
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {originMode === 'custom' ? (
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search or enter origin location..."
                          value={originName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOriginName(val);
                            const match = pois.find(p => p.poiName.toLowerCase() === val.trim().toLowerCase());
                            if (match) {
                              setOriginCoords({ lat: match.latitude, lng: match.longitude });
                            }
                          }}
                          className="h-8 text-xs pl-8 bg-background"
                        />
                      </div>
                    ) : (
                      <Select
                        value={originPoiId}
                        onValueChange={(val) => {
                          setOriginPoiId(val);
                          const poi = pois.find((p) => p.id === val);
                          if (poi) {
                            setOriginCoords({ lat: poi.latitude, lng: poi.longitude });
                            setOriginName(poi.poiName);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                          <SelectValue placeholder="Choose POI for Origin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pois.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.poiName} ({p.latitude.toFixed(3)}, {p.longitude.toFixed(3)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      type="button"
                      variant={clickTarget?.type === 'origin' ? 'destructive' : 'outline'}
                      size="sm"
                      className="h-8 px-2 text-[11px] gap-1 shrink-0 font-medium border-slate-300 dark:border-slate-700"
                      onClick={() => setClickTarget({ type: 'origin' })}
                      title="Click to pin exact location on Google Map"
                    >
                      <LocateFixed className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                      {clickTarget?.type === 'origin' ? 'Pinning...' : 'Pin'}
                    </Button>
                  </div>

                  {/* Coordinate Status Indicator */}
                  <div className="text-[10px] flex items-center justify-between pt-0.5">
                    {originCoords ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Coords: {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Select POI or click Pin to set location on map
                      </span>
                    )}
                  </div>

                  {/* Add Waypoint / Add Halt Buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 gap-1 flex-1 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold"
                      onClick={() => handleAddStop('waypoint', -1)}
                    >
                      <Plus className="h-3 w-3 text-blue-600" /> Waypoint
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 gap-1 flex-1 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold"
                      onClick={() => handleAddStop('halt', -1)}
                    >
                      <Plus className="h-3 w-3 text-amber-600" /> Halt
                    </Button>
                  </div>
                </div>
              </div>

              {/* INTERMEDIATE STOPS WITH DRAG & DROP & REORDER ARROWS */}
              {stops.map((stop, index) => {
                const isWaypoint = stop.stopType === 'waypoint';
                if (isWaypoint) waypointCounter++;
                const isBeingDragged = draggedIndex === index;
                const isDragTarget = dragOverIndex === index;

                return (
                  <div
                    key={stop.id}
                    className={`space-y-2 transition-transform duration-150 ${isBeingDragged ? 'opacity-40 scale-95' : ''
                      } ${isDragTarget ? 'border-t-2 border-blue-500 pt-1' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {/* Card Container with relative positioning for exact card vertical centering */}
                    <div
                      className={`relative p-2.5 rounded-md border shadow-xs space-y-2 transition-colors ${isWaypoint
                        ? 'border-blue-200/90 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-amber-200/90 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20'
                        }`}
                    >
                      {/* Continuous Vertical Connecting Line */}
                      <div className="absolute -left-4 -top-6 -bottom-6 w-[2px] bg-slate-300 dark:bg-slate-700" />

                      {/* Color-coded Node Indicator (Vertically Centered on Card) */}
                      {isWaypoint ? (
                        <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600 border-2 border-background shadow-xs z-10 cursor-grab active:cursor-grabbing" />
                      ) : (
                        <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-xs bg-amber-600 border-2 border-background shadow-xs z-10 cursor-grab active:cursor-grabbing" />
                      )}

                      {/* Header Title with Drag Grip & Reorder Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {/* Drag Handle */}
                          <div
                            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-black/5 rounded transition-colors"
                            title="Drag up/down to reorder"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>

                          {/* Up / Down Arrow Controls */}
                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveStop(index, 'up')}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors p-0.5"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === stops.length - 1}
                              onClick={() => handleMoveStop(index, 'down')}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors p-0.5"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>

                          <Label
                            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isWaypoint
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-700 dark:text-amber-400'
                              }`}
                          >
                            {isWaypoint ? (
                              <>
                                <Navigation className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Waypoint {waypointCounter}
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Mandatory Halt
                              </>
                            )}
                          </Label>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {isWaypoint && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                              onClick={() => handleDuplicateStop(index)}
                              title="Duplicate Waypoint"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStop(stop.id)}
                            title="Delete Stop"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Location Input & Map Pin Action */}
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder={isWaypoint ? 'Rest Stop 42, I-95' : 'Truck Plaza 9, PA'}
                          value={stop.name}
                          onChange={(e) => handleUpdateStop(stop.id, { name: e.target.value })}
                          className="h-8 text-xs flex-1 bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-8 px-2 text-[11px] gap-1 shrink-0 ${isWaypoint
                            ? 'border-blue-200 text-blue-700 dark:text-blue-300'
                            : 'border-amber-200 text-amber-800 dark:text-amber-300'
                            }`}
                          onClick={() => setClickTarget({ type: 'stop', stopId: stop.id })}
                        >
                          <LocateFixed className={`h-3 w-3 ${isWaypoint ? 'text-blue-600' : 'text-amber-600'}`} />
                          Pin
                        </Button>
                      </div>

                      {/* Waypoint Optional Notes or Halt Duration/Reason Grid */}
                      {isWaypoint ? (
                        <div>
                          <Input
                            placeholder="Add notes (optional)..."
                            value={stop.notes || ''}
                            onChange={(e) => handleUpdateStop(stop.id, { notes: e.target.value })}
                            className="h-7 text-[11px] text-muted-foreground bg-background"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-semibold">
                              <Clock className="h-2.5 w-2.5 text-amber-600" /> Duration
                            </Label>
                            <Input
                              placeholder="45m"
                              value={stop.duration || '45m'}
                              onChange={(e) => handleUpdateStop(stop.id, { duration: e.target.value })}
                              className="h-7 text-[11px] bg-background"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-semibold">
                              <Fuel className="h-2.5 w-2.5 text-amber-600" /> Reason
                            </Label>
                            <Select
                              value={stop.reason || 'Fuel'}
                              onValueChange={(val) => handleUpdateStop(stop.id, { reason: val })}
                            >
                              <SelectTrigger className="h-7 text-[11px] bg-background">
                                <SelectValue placeholder="Reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {HALT_REASONS.map((r) => (
                                  <SelectItem key={r} value={r} className="text-[11px]">
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dual Action Buttons: + Waypoint and + Halt */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 px-2 font-medium"
                        onClick={() => handleAddStop('waypoint', index)}
                      >
                        <Plus className="h-3 w-3 text-blue-600" /> Waypoint
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1 px-2 font-medium"
                        onClick={() => handleAddStop('halt', index)}
                      >
                        <Plus className="h-3 w-3 text-amber-600" /> Halt
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* 4. DESTINATION SECTION (Red Theme) */}
              <div className="space-y-2">
                <div className="relative p-2.5 rounded-md border border-red-200/90 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20 shadow-xs space-y-2">
                  {/* Vertical Connecting Line ending at Destination dot center */}
                  <div className="absolute -left-4 -top-6 h-1/2 w-[2px] bg-slate-300 dark:bg-slate-700" />
                  {/* Destination Pointer Dot (Vertically Centered on Card) */}
                  <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-600 border-2 border-background shadow-xs z-10" />

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      <Flag className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> Destination
                    </Label>

                    {/* Destination Mode Switcher: Search / Custom vs Select POI */}
                    <div className="flex items-center bg-background/80 p-0.5 rounded-md border border-border/60 text-[10px]">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${destMode === 'custom'
                          ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                        onClick={() => setDestMode('custom')}
                      >
                        Search / Custom
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${destMode === 'poi'
                          ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                        onClick={() => setDestMode('poi')}
                      >
                        Select POI
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {destMode === 'custom' ? (
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search or enter destination location..."
                          value={destName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDestName(val);
                            const match = pois.find(p => p.poiName.toLowerCase() === val.trim().toLowerCase());
                            if (match) {
                              setDestCoords({ lat: match.latitude, lng: match.longitude });
                            }
                          }}
                          className="h-8 text-xs pl-8 bg-background"
                        />
                      </div>
                    ) : (
                      <Select
                        value={destPoiId}
                        onValueChange={(val) => {
                          setDestPoiId(val);
                          const poi = pois.find((p) => p.id === val);
                          if (poi) {
                            setDestCoords({ lat: poi.latitude, lng: poi.longitude });
                            setDestName(poi.poiName);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                          <SelectValue placeholder="Choose POI for Destination..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pois.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.poiName} ({p.latitude.toFixed(3)}, {p.longitude.toFixed(3)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      type="button"
                      variant={clickTarget?.type === 'dest' ? 'destructive' : 'outline'}
                      size="sm"
                      className="h-8 px-2 text-[11px] gap-1 shrink-0 border-red-200 text-red-700 dark:text-red-300 font-medium"
                      onClick={() => setClickTarget({ type: 'dest' })}
                      title="Click to pin exact location on Google Map"
                    >
                      <LocateFixed className="h-3 w-3 text-red-600" />
                      {clickTarget?.type === 'dest' ? 'Pinning...' : 'Pin'}
                    </Button>
                  </div>

                  {/* Coordinate Status Indicator */}
                  <div className="text-[10px] flex items-center justify-between pt-0.5">
                    {destCoords ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Coords: {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Select POI or click Pin to set location on map
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>

        {/* Footer Action Buttons */}
        <div className="p-3 border-t border-border bg-card shrink-0">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => navigate('/trip-management/routes')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleSubmit}
              disabled={!routeName || !originCoords || !destCoords}
            >
              Save Route
            </Button>
          </div>
        </div>
      </Card>

      {/* Map Section */}
      <Card className="shadow-sm border border-border h-full relative overflow-hidden">
        {/* Floating Distance & Est. Time Card */}
        <div className="absolute top-3 right-3 z-10">
          <Card className="shadow-sm border border-border bg-background/95 backdrop-blur px-3 py-1.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                  Distance
                </span>
                <span className="text-xs font-bold text-foreground">{distance} km</span>
              </div>
            </div>

            <div className="h-5 w-[1px] bg-border" />

            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                  Est. Time
                </span>
                <span className="text-xs font-bold text-foreground">{duration} hrs</span>
              </div>
            </div>
          </Card>
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={11}
          onClick={handleMapClick}
          options={mapOptions}
        >
          {/* Origin Marker (Green Location Pin with 'A') */}
          {originCoords && (
            <Marker
              position={originCoords}
              icon={createCustomMarkerIcon('#16a34a', 'A', 'start')}
              title={`Origin (Start): ${originName || 'Set Location'}`}
            />
          )}

          {/* Intermediate Stop Markers (Blue Waypoints & Amber Halts) */}
          {(() => {
            let waypointIdx = 0;
            let haltIdx = 0;

            return stops.map((stop) => {
              if (!stop.coords) return null;
              const isWaypoint = stop.stopType === 'waypoint';
              if (isWaypoint) waypointIdx++;
              else haltIdx++;

              const label = isWaypoint ? `${waypointIdx}` : `H${haltIdx}`;
              const type = isWaypoint ? 'waypoint' : 'halt';
              const color = isWaypoint ? '#2563eb' : '#d97706';

              return (
                <Marker
                  key={stop.id}
                  position={stop.coords}
                  icon={createCustomMarkerIcon(color, label, type)}
                  title={`${isWaypoint ? `Waypoint ${waypointIdx}` : `Mandatory Halt H${haltIdx}`}: ${stop.name || 'Set Location'}`}
                />
              );
            });
          })()}

          {/* Destination Marker (Red Location Pin with 'B') */}
          {destCoords && (
            <Marker
              position={destCoords}
              icon={createCustomMarkerIcon('#dc2626', 'B', 'end')}
              title={`Destination (End): ${destName || 'Set Location'}`}
            />
          )}

          {/* Connected Polyline */}
          {polylinePath.length >= 2 && (
            <Polyline
              path={polylinePath}
              options={{
                strokeColor: '#3b82f6',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              }}
            />
          )}
        </GoogleMap>

        {/* Map Click Selector Notice Banner */}
        {clickTarget && (
          <div className="absolute top-3 left-3 right-3 bg-primary text-primary-foreground font-semibold px-3 py-2 rounded-lg shadow-xl text-center flex items-center justify-center gap-2 animate-bounce z-20 text-xs">
            <MapPin className="h-4 w-4 animate-pulse" />
            Click anywhere on the map to pin location!
          </div>
        )}
      </Card>
    </div>
  );
}
