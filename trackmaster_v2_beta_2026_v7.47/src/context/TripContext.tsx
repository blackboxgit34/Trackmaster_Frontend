import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteItem {
  id: string;
  name: string;
  originName: string;
  originCoords: LatLng;
  destName: string;
  destCoords: LatLng;
  distance: number; // in km
  duration: number; // in hours
  consigneeName?: string;
}

export interface TripItem {
  id: string;
  routeId: string;
  routeName: string;
  vehicleId: string;
  vehicleNo: string;
  driverName: string;
  status: 'Scheduled' | 'In Transit' | 'Completed';
  startTime: string;
  progress: number; // 0 to 100
  speed: number; // in km/h
  eta: string; // display string, e.g. "1h 15m"
  currentCoords: LatLng;
  consigneeName?: string;
}

interface TripContextType {
  routes: RouteItem[];
  trips: TripItem[];
  addRoute: (route: Omit<RouteItem, 'id'>) => void;
  deleteRoute: (id: string) => void;
  assignRoute: (routeId: string, vehicleId: string, vehicleNo: string, driverName: string, startTime: string, consigneeName?: string, scheduledDate?: string) => void;
  updateTripStatus: (tripId: string, status: TripItem['status']) => void;
  deleteTrip: (id: string) => void;
}

const initialRoutes: RouteItem[] = [
  {
    id: 'route-1',
    name: 'Mumbai Warehouse to North Distribution',
    originName: 'Main Warehouse',
    originCoords: { lat: 19.0760, lng: 72.8777 },
    destName: 'North Distribution Center',
    destCoords: { lat: 19.2288, lng: 72.8540 },
    distance: 25.5,
    duration: 1.5,
    consigneeName: 'Apex Logistics Ltd',
  },
  {
    id: 'route-2',
    name: 'East Side Depot to West Gate Terminal',
    originName: 'East Side Depot',
    originCoords: { lat: 19.0785, lng: 72.9080 },
    destName: 'West Gate Terminal',
    destCoords: { lat: 19.1176, lng: 72.8388 },
    distance: 15.0,
    duration: 1.0,
    consigneeName: 'Western Traders',
  },
  {
    id: 'route-3',
    name: 'Central Office to Client Site B',
    originName: 'Central Office',
    originCoords: { lat: 19.0213, lng: 72.8424 },
    destName: 'Client Site B',
    destCoords: { lat: 18.9990, lng: 72.8100 },
    distance: 12.0,
    duration: 0.8,
    consigneeName: 'Bharat Enterprises',
  },
];

const initialTrips: TripItem[] = [
  {
    id: 'trip-1',
    routeId: 'route-1',
    routeName: 'Mumbai Warehouse to North Distribution',
    vehicleId: 'MH-02-AX-1011',
    vehicleNo: 'MH-02-AX-1011',
    driverName: 'Ramesh Kumar',
    status: 'In Transit',
    startTime: '10:30 AM',
    progress: 45,
    speed: 42,
    eta: '45m remaining',
    currentCoords: {
      lat: 19.0760 + (19.2288 - 19.0760) * 0.45,
      lng: 72.8777 + (72.8540 - 72.8777) * 0.45,
    },
  },
  {
    id: 'trip-2',
    routeId: 'route-2',
    routeName: 'East Side Depot to West Gate Terminal',
    vehicleId: 'MH-03-BZ-3040',
    vehicleNo: 'MH-03-BZ-3040',
    driverName: 'Suresh Patel',
    status: 'Scheduled',
    startTime: '02:00 PM',
    progress: 0,
    speed: 0,
    eta: 'Not started',
    currentCoords: { lat: 19.0785, lng: 72.9080 },
  },
  {
    id: 'trip-3',
    routeId: 'route-3',
    routeName: 'Central Office to Client Site B',
    vehicleId: 'MH-43-CQ-5060',
    vehicleNo: 'MH-43-CQ-5060',
    driverName: 'Vijay Singh',
    status: 'Completed',
    startTime: '08:15 AM',
    progress: 100,
    speed: 0,
    eta: 'Arrived',
    currentCoords: { lat: 18.9990, lng: 72.8100 },
  },
];

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const [routes, setRoutes] = useState<RouteItem[]>(() => {
    const saved = localStorage.getItem('trackmaster_routes');
    if (!saved) return initialRoutes;
    try {
      const parsed: RouteItem[] = JSON.parse(saved);
      const seenIds = new Set<string>();
      return parsed.map((r, idx) => {
        let id = r.id;
        if (!id || seenIds.has(id)) {
          id = `route-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        seenIds.add(id);
        return { ...r, id };
      });
    } catch {
      return initialRoutes;
    }
  });

  const [trips, setTrips] = useState<TripItem[]>(() => {
    const saved = localStorage.getItem('trackmaster_trips');
    if (!saved) return initialTrips;
    try {
      const parsed: TripItem[] = JSON.parse(saved);
      const seenIds = new Set<string>();
      return parsed.map((t, idx) => {
        let id = t.id;
        if (!id || seenIds.has(id)) {
          id = `trip-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        seenIds.add(id);
        return { ...t, id };
      });
    } catch {
      return initialTrips;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('trackmaster_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('trackmaster_trips', JSON.stringify(trips));
  }, [trips]);

  // Real-time Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTrips((prevTrips) =>
        prevTrips.map((trip) => {
          if (trip.status !== 'In Transit') return trip;

          const nextProgress = Math.min(100, trip.progress + Math.random() * 2 + 1);
          const isFinished = nextProgress >= 100;

          // Find associated route coordinates
          const route = routes.find((r) => r.id === trip.routeId);
          if (!route) return trip;

          // Linear interpolation for simplicity and visual appeal
          const startCoords = route.originCoords;
          const endCoords = route.destCoords;
          const currentLat = startCoords.lat + (endCoords.lat - startCoords.lat) * (nextProgress / 100);
          const currentLng = startCoords.lng + (endCoords.lng - startCoords.lng) * (nextProgress / 100);

          // Update speed & ETA
          const speed = isFinished ? 0 : Math.floor(Math.random() * 20 + 35); // 35-55 km/h
          const remainingMinutes = Math.round(route.duration * 60 * (1 - nextProgress / 100));
          
          let eta = '';
          if (isFinished) {
            eta = 'Arrived';
          } else if (remainingMinutes >= 60) {
            const hrs = Math.floor(remainingMinutes / 60);
            const mins = remainingMinutes % 60;
            eta = `${hrs}h ${mins}m remaining`;
          } else {
            eta = `${remainingMinutes}m remaining`;
          }

          return {
            ...trip,
            progress: parseFloat(nextProgress.toFixed(1)),
            speed,
            eta,
            status: isFinished ? 'Completed' : 'In Transit',
            currentCoords: { lat: currentLat, lng: currentLng },
          };
        })
      );
    }, 2000); // simulation tick every 2 seconds for smooth live movement

    return () => clearInterval(interval);
  }, [routes]);

  const addRoute = (routeData: Omit<RouteItem, 'id'>) => {
    const newRoute: RouteItem = {
      ...routeData,
      id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setRoutes((prev) => [...prev, newRoute]);
  };

  const deleteRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    // Cancel any trips using this route
    setTrips((prev) => prev.filter((t) => t.routeId !== id));
  };

  const assignRoute = (
    routeId: string,
    vehicleId: string,
    vehicleNo: string,
    driverName: string,
    startTime: string,
    consigneeName?: string,
    scheduledDate?: string
  ) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    // Check if start time is near current or just start it transit directly for interactive feel
    const isNow = startTime.toLowerCase().includes('now') || startTime === '';

    const newTrip: TripItem = {
      id: `trip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      routeId,
      routeName: route.name,
      vehicleId,
      vehicleNo,
      driverName,
      status: isNow ? 'In Transit' : 'Scheduled',
      startTime: scheduledDate && startTime && !isNow ? `${scheduledDate} ${startTime}` : (startTime || 'Immediate'),
      progress: 0,
      speed: isNow ? 40 : 0,
      eta: isNow ? `${Math.round(route.duration * 60)}m remaining` : 'Not started',
      currentCoords: route.originCoords,
      consigneeName: consigneeName || route.consigneeName,
    };

    setTrips((prev) => [newTrip, ...prev]);
  };

  const updateTripStatus = (tripId: string, status: TripItem['status']) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        const route = routes.find((r) => r.id === trip.routeId);
        const isTransit = status === 'In Transit';
        
        return {
          ...trip,
          status,
          speed: isTransit ? 45 : 0,
          eta: isTransit && route ? `${Math.round(route.duration * 60)}m remaining` : status === 'Completed' ? 'Arrived' : 'Not started',
        };
      })
    );
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TripContext.Provider value={{ routes, trips, addRoute, deleteRoute, assignRoute, updateTripStatus, deleteTrip }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
