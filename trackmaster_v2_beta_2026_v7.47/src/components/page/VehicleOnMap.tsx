import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type VehicleStatus } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import VehicleDataSidebar from './VehicleDataSidebar';
import MapControls from './MapControls';
import MapComponent from './MapComponent';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { useApi } from '@/hooks/useApi';
import { getLiveStatusData } from '@/data/mockApi';
import type { LiveVehicleStatus } from '@/types';
import { getIconUrl } from '@/lib/map-utils';

const VehicleOnMap = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isDataSidebarOpen, setIsDataSidebarOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<VehicleStatus>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // State for map options
  const [showLabels, setShowLabels] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);
  const [showPois, setShowPois] = useState(false);
  const [showFences, setShowFences] = useState(false);

  // State for vehicle type filter search
  const [typeSearch, setTypeSearch] = useState('');

  // Data fetching
  const { data: liveStatusData, loading, refetch } = useApi(getLiveStatusData);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        refetch();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, refetch]);

  // Handle vehicle from URL parameter
  useEffect(() => {
    const vehicleFromUrl = searchParams.get('vehicle');
    if (vehicleFromUrl && liveStatusData) {
      const vehicle = liveStatusData.find(m => m.vehicleNo === vehicleFromUrl);
      if (vehicle) {
        setSelectedVehicleId(vehicle.id);
        setIsDataSidebarOpen(true);
      }
    }
  }, [searchParams, liveStatusData]);

  const { allStatuses, allTypes } = useMemo(() => {
    if (!liveStatusData) return { allStatuses: [], allTypes: [] };
    return {
      allStatuses: [...new Set(liveStatusData.map(m => m.status))],
      allTypes: [...new Set(liveStatusData.map(m => m.type))],
    };
  }, [liveStatusData]);

  const filteredVehicles = useMemo(() => {
    if (!liveStatusData) return [];
    return liveStatusData.filter(vehicle => {
      const matchesSearch =
        vehicle.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatuses.size === 0 || selectedStatuses.has(vehicle.status);
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(vehicle.type);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [liveStatusData, searchTerm, selectedStatuses, selectedTypes]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId || !liveStatusData) return null;
    return liveStatusData.find(m => m.id === selectedVehicleId);
  }, [selectedVehicleId, liveStatusData]);

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsDataSidebarOpen(true);
  };

  const handleStatusChange = (status: VehicleStatus) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const handleTypeChange = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleClearFilters = () => {
    setSelectedStatuses(new Set());
    setSelectedTypes(new Set());
  };

  const getStatusBadgeClasses = (status: VehicleStatus) => {
    const styles: Record<VehicleStatus, string> = {
      Moving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      Parked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Ignition On': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      Unreachable: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
      'Battery Disconnect': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      Breakdown: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'High Speed': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      Towed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Idle: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const handleRecenter = (vehicle: LiveVehicleStatus) => {
    if (mapInstance && vehicle) {
      mapInstance.panTo({ lat: vehicle.lat, lng: vehicle.lng });
      mapInstance.setZoom(15);
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      loadingElement={<div className="flex items-center justify-center h-full"><Loader className="animate-spin" /></div>}
    >
      <div className="absolute inset-0 flex h-full w-full bg-background">
        {/* Left Sidebar: Vehicle List */}
        <div className="w-[350px] flex-shrink-0 bg-card border-r flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search number, driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <ScrollArea className="h-72">
                          {allStatuses.map(status => (
                            <DropdownMenuCheckboxItem
                              key={status}
                              checked={selectedStatuses.has(status)}
                              onCheckedChange={() => handleStatusChange(status)}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {status}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Vehicle Type</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="p-0">
                        <div className="p-2">
                          <Input
                            placeholder="Search type..."
                            value={typeSearch}
                            onChange={(e) => setTypeSearch(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                        </div>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-72">
                          {allTypes
                            .filter(type => type.toLowerCase().includes(typeSearch.toLowerCase()))
                            .map(type => (
                              <DropdownMenuCheckboxItem
                                key={type}
                                checked={selectedTypes.has(type)}
                                onCheckedChange={() => handleTypeChange(type)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                {type}
                              </DropdownMenuCheckboxItem>
                            ))}
                        </ScrollArea>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  {(selectedStatuses.size > 0 || selectedTypes.size > 0) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleClearFilters} className="text-red-500 focus:text-red-500">
                        Clear Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="px-4 py-2 border-b shrink-0">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Vehicles ({filteredVehicles.length})
            </h3>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle.id)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      selectedVehicleId === vehicle.id ? 'bg-primary/10' : 'hover:bg-accent'
                    )}
                  >
                    <img
                      src={getIconUrl(vehicle.type, 'Parked')}
                      alt={vehicle.type}
                      className="h-10 w-10 object-contain"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{vehicle.vehicleNo}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.model} / {vehicle.type}</p>
                    </div>
                    <Badge className={cn('border-transparent', getStatusBadgeClasses(vehicle.status))}>{vehicle.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Map */}
          <div className="flex-1 relative bg-muted overflow-hidden">
            <MapComponent
              machines={filteredVehicles}
              selectedMachineId={selectedVehicleId}
              onMarkerClick={handleSelectVehicle}
              showLabels={showLabels}
              autoZoom={autoZoom}
              showPois={showPois}
              showFences={showFences}
              onMapLoad={handleMapLoad}
            />
            <MapControls
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              autoZoom={autoZoom}
              setAutoZoom={setAutoZoom}
              showPois={showPois}
              setShowPois={setShowPois}
              showFences={showFences}
              setShowFences={setShowFences}
            />
          </div>

          {/* Right Sidebar: Vehicle Data */}
          <div className={cn(
            "bg-card border-l h-full transition-all duration-300 ease-in-out overflow-hidden hidden lg:flex flex-col",
            isDataSidebarOpen ? "w-[300px]" : "w-0"
          )}>
            <div className="w-[300px] flex-shrink-0 h-full">
              {selectedVehicle ? (
                <VehicleDataSidebar machine={selectedVehicle} onRecenter={handleRecenter} />
              ) : (
                <div className="flex items-center justify-center h-full p-4 text-center w-full">
                  <div>
                    <h3 className="text-lg font-semibold">No Vehicle Selected</h3>
                    <p className="text-sm text-muted-foreground">Select a vehicle from the list to view its data.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <Button
            size="icon"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 h-20 w-5 rounded-l-md rounded-r-none p-0 hidden lg:flex bg-gray-700 text-gray-100 hover:bg-gray-600 transition-all duration-300 ease-in-out",
              isDataSidebarOpen ? "right-[300px]" : "right-0"
            )}
            onClick={() => setIsDataSidebarOpen(!isDataSidebarOpen)}
          >
            {isDataSidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </LoadScript>
  );
};

export default VehicleOnMap;