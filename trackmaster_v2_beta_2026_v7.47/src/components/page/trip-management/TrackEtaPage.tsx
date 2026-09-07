import { useState, useMemo, useEffect } from 'react';
import { useTrips } from '@/context/TripContext';
import { useSettings } from '@/context/SettingsContext';
import { actualVehicles, liveStatusData } from '@/data/mockData';
import { getIconUrl, calculateBearing } from '@/lib/map-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GoogleMap, Marker, Polyline, OverlayView } from '@react-google-maps/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  CheckCircle, 
  Trash2, 
  Clock, 
  Compass, 
  User, 
  Navigation, 
  TrendingUp,
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

export default function TrackEtaPage() {
  const { trips, routes, updateTripStatus, deleteTrip } = useTrips();
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transit' | 'scheduled' | 'completed'>('transit');
  const { toast } = useToast();

  // Filter trips by status
  const transitTrips = useMemo(() => trips.filter(t => t.status === 'In Transit'), [trips]);
  const scheduledTrips = useMemo(() => trips.filter(t => t.status === 'Scheduled'), [trips]);
  const completedTrips = useMemo(() => trips.filter(t => t.status === 'Completed'), [trips]);

  // Set default selection when tab changes or if current selection is invalid
  useEffect(() => {
    const currentTabTrips = activeTab === 'transit' ? transitTrips : activeTab === 'scheduled' ? scheduledTrips : completedTrips;

    if (!currentTabTrips.some(t => t.id === selectedTripId)) {
      setSelectedTripId(currentTabTrips[0]?.id || null);
    }
  }, [activeTab, transitTrips, scheduledTrips, completedTrips, selectedTripId]);

  // Find currently active trip details
  const selectedTrip = useMemo(() => {
    return trips.find(t => t.id === selectedTripId) || null;
  }, [selectedTripId, trips]);

  const selectedRoute = useMemo(() => {
    if (!selectedTrip) return null;
    return routes.find(r => r.id === selectedTrip.routeId) || null;
  }, [selectedTrip, routes]);

  const selectedVehicleInfo = useMemo(() => {
    if (!selectedTrip) return null;
    const vehicle = actualVehicles.find(v => v.id === selectedTrip.vehicleId);
    const live = liveStatusData.find(v => v.id === selectedTrip.vehicleId);
    return {
      type: vehicle?.type || 'Heavy Commercial Truck',
      status: live?.status || 'Moving'
    };
  }, [selectedTrip]);

  const vehicleBearing = useMemo(() => {
    if (!selectedRoute || !selectedTrip?.currentCoords) return 0;
    return calculateBearing(
      selectedRoute.originCoords.lat, 
      selectedRoute.originCoords.lng, 
      selectedRoute.destCoords.lat, 
      selectedRoute.destCoords.lng
    );
  }, [selectedRoute, selectedTrip]);

  const handleStartTrip = (id: string, name: string) => {
    updateTripStatus(id, 'In Transit');
    toast({
      title: 'Trip Started',
      description: `Transit initiated for "${name}".`,
    });
  };

  const handleCompleteTrip = (id: string, name: string) => {
    updateTripStatus(id, 'Completed');
    toast({
      title: 'Trip Completed',
      description: `Transit completed for "${name}".`,
    });
  };

  const handleDeleteTrip = (id: string, name: string) => {
    deleteTrip(id);
    if (selectedTripId === id) {
      setSelectedTripId(null);
    }
    toast({
      title: 'Trip Removed',
      description: `Trip assignment for "${name}" has been deleted.`,
      variant: 'destructive',
    });
  };

  // Map settings
  const mapCenter = useMemo(() => {
    if (selectedTrip?.currentCoords) {
      return selectedTrip.currentCoords;
    }
    if (selectedRoute?.originCoords) {
      return selectedRoute.originCoords;
    }
    return defaultCenter;
  }, [selectedTrip, selectedRoute]);

  return (
    <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[350px_1fr] lg:grid-rows-1 gap-6 h-full min-h-0 relative">
      {/* Left Side: Sidebar Lists */}
      <div className="flex flex-col min-h-0 bg-card rounded-lg border shadow-sm overflow-hidden h-full">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'transit' | 'scheduled' | 'completed')}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-4 border-b bg-muted/20">
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="transit" className="text-xs">
                Transit ({transitTrips.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs">
                Scheduled ({scheduledTrips.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">
                Arrived ({completedTrips.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-4 py-2">
            <TabsContent value="transit" className="m-0 space-y-3">
              {transitTrips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No active trips currently in transit.
                </div>
              ) : (
                transitTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedTripId === trip.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedTripId(trip.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm leading-snug">{trip.routeName}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{trip.vehicleNo} ({trip.vehicleId})</p>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 shrink-0">
                          {trip.speed} km/h
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Progress</span>
                          <span>{trip.progress}%</span>
                        </div>
                        {/* Custom Transit Progress Bar with Truck Movement Red Dot Marker */}
                        <div className="relative w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-visible mt-1.5">
                          {/* Blue line showing truck movement */}
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(0, Math.min(100, trip.progress))}%` }}
                          />
                          {/* Red dot icon showing live truck movement position */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-md z-10 transition-all duration-500 ease-out"
                            style={{ left: `${Math.max(0, Math.min(100, trip.progress))}%` }}
                            title={`Truck position: ${trip.progress}%`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {trip.eta}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the trip assignment for "{trip.routeName}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTrip(trip.id, trip.routeName)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="m-0 space-y-3">
              {scheduledTrips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No scheduled trips found.
                </div>
              ) : (
                scheduledTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedTripId === trip.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedTripId(trip.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm leading-snug">{trip.routeName}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{trip.vehicleNo} ({trip.vehicleId})</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Scheduled
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          Start: {trip.startTime}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 flex items-center gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTrip(trip.id, trip.routeName);
                            }}
                          >
                            <Play className="h-3 w-3 text-green-600" /> Start
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel the scheduled trip for "{trip.routeName}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTrip(trip.id, trip.routeName)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="m-0 space-y-3">
              {completedTrips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No completed trips found.
                </div>
              ) : (
                completedTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedTripId === trip.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedTripId(trip.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm leading-snug">{trip.routeName}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{trip.vehicleNo} ({trip.vehicleId})</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                          Completed
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          Arrived Safely
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the completed trip record for "{trip.routeName}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTrip(trip.id, trip.routeName)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Right Side: Map & Analytics panel */}
      <div className="flex-1 flex flex-col gap-6 min-h-0 h-full">
        {/* Map wrapper */}
        <div className="flex-1 rounded-lg overflow-hidden border shadow-sm bg-muted relative min-h-[250px]">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={selectedRoute ? 12 : 11}
            options={mapOptions}
          >
            {selectedRoute && (
              <>
                <Marker
                  position={selectedRoute.originCoords}
                  label={{
                    text: 'A',
                    className: 'font-bold text-white',
                  }}
                  icon="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                />
                <Marker
                  position={selectedRoute.destCoords}
                  label={{
                    text: 'B',
                    className: 'font-bold text-white',
                  }}
                  icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                />
                <Polyline
                  path={[selectedRoute.originCoords, selectedRoute.destCoords]}
                  options={{
                    strokeColor: '#22c55e',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              </>
            )}

            {selectedTrip && selectedTrip.currentCoords && (
              <OverlayView
                position={selectedTrip.currentCoords}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', width: '40px', height: '40px' }} title={showDriverName ? `${selectedTrip.vehicleNo} (${selectedTrip.driverName})` : selectedTrip.vehicleNo}>
                  <img
                    src={getIconUrl(selectedVehicleInfo?.type || 'Heavy Commercial Truck', selectedVehicleInfo?.status as any || 'Moving')}
                    alt="Vehicle"
                    className="w-full h-full object-contain drop-shadow-md"
                    style={{ transform: `rotate(${vehicleBearing}deg)`, transformOrigin: 'center' }}
                  />
                </div>
              </OverlayView>
            )}
          </GoogleMap>
        </div>

        {/* Selected Trip Details Panel */}
        {selectedTrip ? (
          <Card className="shrink-0 border-border/80">
            <CardHeader className="py-4 border-b border-border/50">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" /> {selectedTrip.routeName}
                  </CardTitle>
                  <CardDescription>
                    Truck: <span className="font-semibold text-foreground">{selectedTrip.vehicleNo}</span>
                    {showDriverName && (
                      <> • Driver: <span className="font-semibold text-foreground">{selectedTrip.driverName}</span></>
                    )}
                    {(selectedTrip.consigneeName || selectedRoute?.consigneeName) && (
                      <> • Consignee: <span className="font-semibold text-foreground">{selectedTrip.consigneeName || selectedRoute?.consigneeName}</span></>
                    )}
                  </CardDescription>
                </div>
                {selectedTrip.status === 'In Transit' && (
                  <Button
                    size="sm"
                    onClick={() => handleCompleteTrip(selectedTrip.id, selectedTrip.routeName)}
                    className="flex items-center gap-1.5 self-start"
                  >
                    <CheckCircle className="h-4 w-4" /> Complete Trip
                  </Button>
                )}
                {selectedTrip.status === 'Scheduled' && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTrip(selectedTrip.id, selectedTrip.routeName)}
                    className="flex items-center gap-1.5 self-start"
                  >
                    <Play className="h-4 w-4" /> Start Transit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {showDriverName && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-primary" /> Driver Name
                    </span>
                    <p className="font-semibold">{selectedTrip.driverName}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-primary" /> Current Speed
                  </span>
                  <p className="font-semibold">{selectedTrip.speed} km/h</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> Progress
                  </span>
                  <p className="font-semibold">{selectedTrip.progress}% completed</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Arrival / ETA
                  </span>
                  <p className="font-semibold text-green-600 dark:text-green-400">{selectedTrip.eta}</p>
                </div>
              </div>

              {/* Vehicle Movement Line Track */}
              <div className="pt-1">
                <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-visible my-1.5">
                  {/* Blue line showing truck movement */}
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, selectedTrip.progress))}%` }}
                  />
                  {/* Red dot icon indicating live truck location on the line */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md z-10 transition-all duration-500 ease-out"
                    style={{ left: `${Math.max(0, Math.min(100, selectedTrip.progress))}%` }}
                    title={`Truck position: ${selectedTrip.progress}%`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shrink-0 border-dashed text-center p-6">
            <Compass className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Select a trip from the sidebar list to monitor live status & ETA details.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
