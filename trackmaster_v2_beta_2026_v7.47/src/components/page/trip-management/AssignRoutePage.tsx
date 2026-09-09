import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTrips } from '@/context/TripContext';
import { actualVehicles, liveStatusData } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Route, Truck, Calendar, User, Clock, Search, ChevronsUpDown, UserCheck, Info, Thermometer } from 'lucide-react';
import { crewData } from '@/data/crewData';
import { useSettings } from '@/context/SettingsContext';

export default function AssignRoutePage() {
  const { routes, assignRoute, trips } = useTrips();
  const { reeferThresholds } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const preselectedRouteId = searchParams.get('routeId') || '';

  // Form State
  const [routeId, setRouteId] = useState(preselectedRouteId);
  const [consigneeName, setConsigneeName] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [vehicleDrivers, setVehicleDrivers] = useState<Record<string, string>>({});
  const [isCustomDriverMode, setIsCustomDriverMode] = useState<Record<string, boolean>>({});
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);

  // Reefer Temperature Range State (defaults from settings)
  const [reeferMinTemp, setReeferMinTemp] = useState<number | string>(() => reeferThresholds?.minTemp ?? -25);
  const [reeferMaxTemp, setReeferMaxTemp] = useState<number | string>(() => reeferThresholds?.maxTemp ?? -10);

  // Sync temperature range with settings defaults
  useEffect(() => {
    if (reeferThresholds) {
      setReeferMinTemp(reeferThresholds.minTemp ?? -25);
      setReeferMaxTemp(reeferThresholds.maxTemp ?? -10);
    }
  }, [reeferThresholds]);

  // Check if any selected vehicle is a Reefer vehicle
  const hasReeferVehicle = useMemo(() => {
    return Array.from(selectedVehicles).some((vId) => {
      const vehicle = actualVehicles.find((v) => v.id === vId);
      return (
        vehicle?.type === 'Reefer' ||
        vehicle?.type?.toLowerCase().includes('reefer') ||
        vehicle?.name?.toLowerCase().includes('reefer')
      );
    });
  }, [selectedVehicles]);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dispatchType, setDispatchType] = useState<'choose_time' | 'auto'>('choose_time');
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });

  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === routeId) || null;
  }, [routeId, routes]);

  // Auto-select preselected route if valid
  useEffect(() => {
    if (preselectedRouteId) {
      setRouteId(preselectedRouteId);
    }
  }, [preselectedRouteId]);

  // Set consignee name when route is selected
  useEffect(() => {
    if (selectedRoute) {
      setConsigneeName(selectedRoute.consigneeName || '');
    } else {
      setConsigneeName('');
    }
  }, [selectedRoute]);

  // Master list of available drivers for assignment
  const availableDriversList = useMemo(() => {
    const list: Array<{ name: string; mobile?: string; status?: string; vehicleName?: string }> = [];
    
    // Add drivers from crewData
    crewData.forEach((c) => {
      if (c.type === 'Driver' && !list.some((d) => d.name === c.driverName)) {
        list.push({
          name: c.driverName,
          mobile: c.mobile,
          status: c.status || 'Available',
          vehicleName: c.vehicleName,
        });
      }
    });

    // Only use drivers from crewData
    return list;
  }, []);

  // Vehicle type listing
  const vehicleTypes = useMemo(() => {
    return ['All Types', ...Array.from(new Set(actualVehicles.map(m => m.type)))];
  }, []);

  // Filtered vehicles based on search and type
  const filteredVehicles = useMemo(() => {
    return actualVehicles.filter(vehicle => {
      const matchesType = selectedType === 'All Types' || vehicle.type === selectedType;
      const matchesSearch = vehicle.name.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                            vehicle.id.toLowerCase().includes(vehicleSearchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [vehicleSearchTerm, selectedType]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredVehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
  });

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
        const nextDrivers = { ...vehicleDrivers };
        delete nextDrivers[vehicleId];
        setVehicleDrivers(nextDrivers);
      } else {
        newSet.add(vehicleId);
        const vehicle = actualVehicles.find((v) => v.id === vehicleId);
        const registeredDriver = crewData.find(c => c.vehicleId === vehicleId || c.vehicleName === vehicle?.name)?.driverName;
        setVehicleDrivers((curr) => ({
          ...curr,
          [vehicleId]: vehicle?.driver || registeredDriver || availableDriversList[0]?.name || 'Unassigned',
        }));
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const activeFiltered = filteredVehicles.filter(v => {
        // Disallow selecting vehicles already on an active transit trip via select all
        return !trips.some(t => t.vehicleId === v.id && t.status === 'In Transit');
      });
      const allFilteredIds = new Set(activeFiltered.map(m => m.id));
      setSelectedVehicles(allFilteredIds);
      const nextDrivers = { ...vehicleDrivers };
      activeFiltered.forEach((vehicle) => {
        if (!nextDrivers[vehicle.id]) {
          const registeredDriver = crewData.find(c => c.vehicleId === vehicle.id || c.vehicleName === vehicle.name)?.driverName;
          nextDrivers[vehicle.id] = vehicle.driver || registeredDriver || availableDriversList[0]?.name || 'Unassigned';
        }
      });
      setVehicleDrivers(nextDrivers);
    } else {
      setSelectedVehicles(new Set());
      setVehicleDrivers({});
    }
  };

  const activeFilteredVehicles = useMemo(() => {
    return filteredVehicles.filter(v => !trips.some(t => t.vehicleId === v.id && t.status === 'In Transit'));
  }, [filteredVehicles, trips]);

  const allFilteredSelected = activeFilteredVehicles.length > 0 && activeFilteredVehicles.every(m => selectedVehicles.has(m.id));
  const someFilteredSelected = activeFilteredVehicles.some(m => selectedVehicles.has(m.id));

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();

    if (!routeId) {
      toast({ title: 'Validation Error', description: 'Please select a route.', variant: 'destructive' });
      return;
    }
    if (selectedVehicles.size === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one vehicle.', variant: 'destructive' });
      return;
    }

    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    const effectiveStartTime = dispatchType === 'auto' ? 'Auto (On POI Exit)' : (customTime || 'Immediate (Now)');

    // Loop and assign to route
    Array.from(selectedVehicles).forEach(vId => {
      const vehicle = actualVehicles.find(v => v.id === vId);
      if (!vehicle) return;

      const liveInfo = liveStatusData.find((d) => d.id === vId);
      const vehicleNo = liveInfo?.vehicleNo || vehicle.id;
      const driver = vehicleDrivers[vId]?.trim() || vehicle.driver || 'No Driver Assigned';

      assignRoute(routeId, vId, vehicleNo, driver, effectiveStartTime, consigneeName, startDate);
    });

    toast({
      title: 'Trips Dispatched / Scheduled',
      description: `Successfully assigned ${selectedVehicles.size} truck(s) to "${route.name}".`,
    });

    navigate('/trip-management/track-eta');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Assign Route</CardTitle>
          <CardDescription>
            Choose a route, dispatch multiple vehicles, and set schedules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssign} className="space-y-6">
            {/* Route Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" /> Select Route
              </Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.distance} km)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Consignee Name */}
            <div className="space-y-2">
              <Label htmlFor="consignee-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Consignee Name
              </Label>
              <Input
                id="consignee-name"
                placeholder="Enter consignee name"
                value={consigneeName}
                onChange={(e) => setConsigneeName(e.target.value)}
              />
            </div>

            {/* Vehicle Multi-Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Select Vehicles / Trucks
              </Label>
              <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isVehicleSelectorOpen} className="w-full justify-between h-10 font-normal">
                    {selectedVehicles.size > 0 ? (
                      <span className="text-primary font-medium">{selectedVehicles.size} vehicle(s) selected</span>
                    ) : "Select vehicles..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="border rounded-md shadow-lg bg-popover text-popover-foreground">
                    <div className="p-2 border-b bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search..." value={vehicleSearchTerm} onChange={(e) => setVehicleSearchTerm(e.target.value)} className="pl-8 h-9 text-xs" />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>{vehicleTypes.map(type => (<SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    {activeFilteredVehicles.length > 0 && (
                      <div className="flex items-center p-2.5 border-b bg-background">
                        <Checkbox id="select-all-vehicles" checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false} onCheckedChange={handleSelectAll} />
                        <Label htmlFor="select-all-vehicles" className="ml-2.5 text-xs font-semibold">Select all ({activeFilteredVehicles.length})</Label>
                      </div>
                    )}
                    <div ref={parentRef} className="h-48 overflow-auto bg-background p-1">
                      <div
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const vehicle = filteredVehicles[virtualRow.index];
                          const live = liveStatusData.find((l) => l.id === vehicle.id);
                          const status = live?.status || 'Parked';
                          const activeTrip = trips.find((t) => t.vehicleId === vehicle.id && t.status === 'In Transit');
                          return (
                            <div 
                              key={vehicle.id} 
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/60 transition-colors"
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <Checkbox 
                                id={`vehicle-${vehicle.id}`} 
                                checked={selectedVehicles.has(vehicle.id)} 
                                onCheckedChange={() => handleSelectVehicle(vehicle.id)} 
                                disabled={!!activeTrip}
                              />
                              <Label htmlFor={`vehicle-${vehicle.id}`} className={`w-full cursor-pointer text-xs flex justify-between items-center ${activeTrip ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{vehicle.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{vehicle.id} • {status}</span>
                                </div>
                                {activeTrip && (
                                  <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-semibold">Busy</span>
                                )}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Drivers Configuration per selected truck */}
            {selectedVehicles.size > 0 && (
              <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Assign Drivers ({selectedVehicles.size})
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-primary hover:text-primary/80 px-2"
                    onClick={() => navigate('/settings/crew')}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Crew Management
                  </Button>
                </div>

                <ScrollArea className="max-h-56 pr-2">
                  <div className="space-y-2.5">
                    {Array.from(selectedVehicles).map((vId) => {
                      const vehicle = actualVehicles.find((v) => v.id === vId);
                      const currentDriverVal = vehicleDrivers[vId] || '';
                      const isCustom = isCustomDriverMode[vId] || false;
                      const selectedDriverObj = availableDriversList.find((d) => d.name === currentDriverVal);

                      return (
                        <div key={vId} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-background p-3 rounded-lg border shadow-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground">{vehicle?.name}</p>
                            <p className="text-[10px] text-muted-foreground">{vId}</p>
                            {selectedDriverObj?.mobile && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">📞 {selectedDriverObj.mobile}</p>
                            )}
                          </div>

                          <div className="w-full sm:w-60 shrink-0 space-y-1">
                            {!isCustom ? (
                              <Select
                                value={availableDriversList.some((d) => d.name === currentDriverVal) ? currentDriverVal : 'custom'}
                                onValueChange={(val) => {
                                  if (val === 'custom') {
                                    setIsCustomDriverMode((prev) => ({ ...prev, [vId]: true }));
                                    setVehicleDrivers((prev) => ({ ...prev, [vId]: '' }));
                                  } else {
                                    setVehicleDrivers((prev) => ({ ...prev, [vId]: val }));
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Select driver..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDriversList.map((driver) => (
                                    <SelectItem key={driver.name} value={driver.name} className="text-xs">
                                      <div className="flex items-center justify-between w-full gap-2">
                                        <span className="font-medium">{driver.name}</span>
                                        <span className="text-[10px] text-muted-foreground">({driver.status})</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom" className="text-xs text-primary font-medium border-t">
                                    + Enter Custom Driver...
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    placeholder="Driver Name"
                                    value={currentDriverVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setVehicleDrivers((prev) => ({
                                        ...prev,
                                        [vId]: val,
                                      }));
                                    }}
                                    className="h-9 pl-8 text-xs"
                                    required
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 px-2 text-[11px]"
                                  onClick={() => setIsCustomDriverMode((prev) => ({ ...prev, [vId]: false }))}
                                >
                                  List
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Reefer Temperature Thresholds (Appears if any Reefer vehicle is selected) */}
            {hasReeferVehicle && (
              <div className="space-y-3 p-4 rounded-lg border border-cyan-200/80 bg-cyan-50/50 dark:bg-cyan-950/30 dark:border-cyan-800 shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Reefer Temperature Range (°C)
                    </Label>
                  </div>
                  <span className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/60 px-2 py-0.5 rounded-full">
                    Reefer Cargo Monitoring
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set target temperature range for this trip. Pre-filled with default thresholds from settings ({reeferThresholds?.minTemp ?? -25}°C to {reeferThresholds?.maxTemp ?? -10}°C).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="reefer-min-temp" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      Min Temperature (°C)
                    </Label>
                    <Input
                      id="reefer-min-temp"
                      type="number"
                      step="0.5"
                      value={reeferMinTemp}
                      onChange={(e) => setReeferMinTemp(e.target.value)}
                      placeholder="-25"
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reefer-max-temp" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      Max Temperature (°C)
                    </Label>
                    <Input
                      id="reefer-max-temp"
                      type="number"
                      step="0.5"
                      value={reeferMaxTemp}
                      onChange={(e) => setReeferMaxTemp(e.target.value)}
                      placeholder="-10"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Info */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Dispatch Time
                  </Label>
                  <Select value={dispatchType} onValueChange={(val: 'choose_time' | 'auto') => setDispatchType(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dispatch mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choose_time">Choose Time</SelectItem>
                      <SelectItem value="auto">Auto Dispatch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Scheduled Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {dispatchType === 'choose_time' && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="custom-time-input" className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" /> Select Time Manually
                  </Label>
                  <Input
                    id="custom-time-input"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>
              )}

              {dispatchType === 'auto' && (
                <div className="p-3 rounded-md border border-blue-200 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Auto Dispatch Mode</span>
                    <p>
                      Trip start time is automatically recorded when vehicle leaves or exits the origin POI.
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-1.5 border-t border-blue-200/60 dark:border-blue-800/60">
                      <strong>Note:</strong> You can only select Auto if the origin is a POI and not a waypoint.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/trip-management/routes')}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={selectedVehicles.size === 0 || !routeId}>
                Confirm Assignment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
