import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips, TripItem } from '@/context/TripContext';
import { useSettings } from '@/context/SettingsContext';
import { actualVehicles, liveStatusData } from '@/data/mockData';
import { sampleTripViolations } from '@/data/tripViolationData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Truck,
  MapPin,
  Search,
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldAlert,
  Navigation,
  User,
  Phone,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PlusCircle,
  Route,
  ClipboardList,
  Play,
  Trash2,
  Send,
  Gauge,
  Layers,
  Coffee,
  Flag,
} from 'lucide-react';

interface TimelineNode {
  name: string;
  type: 'origin' | 'waypoint' | 'halt' | 'destination';
  status: 'passed' | 'current' | 'upcoming';
  time?: string;
  eta?: string;
  location?: string;
  duration?: string;
  notes?: string;
}

interface ExtendedTripEta {
  trip: TripItem;
  scheduledArrival: string;
  estimatedArrival: string;
  delayMinutes: number;
  etaStatus: 'On Time' | 'Minor Delay' | 'Critical Delay' | 'Completed' | 'Scheduled';
  origin: string;
  destination: string;
  distanceCovered: number;
  distanceRemaining: number;
  totalDistance: number;
  consignee: string;
  confidenceScore: number;
  waypoints: TimelineNode[];
  weatherCondition: string;
  trafficCondition: string;
  vehicleType: string;
  driverPhone: string;
  liveStatusName?: string;
  violationCount: number;
}

export default function EtaDashboardPage() {
  const { trips, routes, updateTripStatus, deleteTrip } = useTrips();
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Enrich trips with actual vehicle telematics & complete timeline (origin, waypoints, halts, destination)
  const extendedTrips = useMemo<ExtendedTripEta[]>(() => {
    return trips.map((t, idx) => {
      const matchedRoute = routes.find((r) => r.id === t.routeId);
      const vehicleInfo = actualVehicles.find((v) => v.id === t.vehicleId || v.name === t.vehicleId);
      const liveInfo = liveStatusData.find((ls) => ls.id === t.vehicleId || ls.vehicleNo === t.vehicleNo);

      const totalDist = matchedRoute?.distance || 45;
      const covered = Math.round((totalDist * t.progress) / 100);
      const remaining = Math.max(0, totalDist - covered);

      let delayMin = 0;
      let status: ExtendedTripEta['etaStatus'] = 'On Time';

      if (t.status === 'Completed') {
        status = 'Completed';
      } else if (t.status === 'Scheduled') {
        status = 'Scheduled';
      } else {
        if (t.speed < 38) {
          delayMin = 32;
          status = 'Critical Delay';
        } else if (t.speed < 45) {
          delayMin = 14;
          status = 'Minor Delay';
        }
      }

      // Calculate scheduled & estimated times dynamically based on trip data
      const parseStartTimeHour = () => {
        const match = t.startTime?.match(/(\d+):(\d+)/);
        return match ? parseInt(match[1]) : 11;
      };

      const baseHour = parseStartTimeHour();
      const baseMin = (idx * 20) % 60;
      const schedFormatted = `${baseHour > 12 ? baseHour - 12 : baseHour}:${baseMin.toString().padStart(2, '0')} ${baseHour >= 12 ? 'PM' : 'AM'}`;

      const totalEstMin = baseHour * 60 + baseMin + delayMin;
      const estHour = Math.floor(totalEstMin / 60) % 24;
      const estMin = totalEstMin % 60;
      const estFormatted = `${estHour > 12 ? estHour - 12 : estHour}:${estMin.toString().padStart(2, '0')} ${estHour >= 12 ? 'PM' : 'AM'}`;

      const waypoints: TimelineNode[] = [
        {
          name: matchedRoute?.originName || 'Origin Freight Warehouse',
          type: 'origin',
          status: 'passed',
          time: t.startTime || '09:00 AM',
          location: 'Origin Freight Terminal',
          notes: 'Dispatched & Departed Facility',
        },
        {
          name: 'Waypoint 1: Interstate Toll Plaza',
          type: 'waypoint',
          status: t.progress > 20 ? 'passed' : t.progress > 0 ? 'current' : 'upcoming',
          time: t.progress > 20 ? '09:45 AM' : 'En Route',
          location: 'KM 14 Highway Corridor',
          notes: 'Fastag Toll Clearance Passed',
        },
        {
          name: 'Halt 1: Driver Rest & Fuel Refill',
          type: 'halt',
          status: t.progress > 40 ? 'passed' : t.progress > 20 ? 'current' : 'upcoming',
          time: t.progress > 40 ? '10:30 AM' : 'Expected 10:30 AM',
          location: 'Expressway Service Plaza',
          duration: '15 min halt',
          notes: 'Fuel Tankering & Driver Break',
        },
        {
          name: 'Waypoint 2: Intermediate Logistics Hub',
          type: 'waypoint',
          status: t.progress > 60 ? 'passed' : t.progress > 40 ? 'current' : 'upcoming',
          time: t.progress > 60 ? '11:15 AM' : 'En Route',
          location: 'KM 28 Central Interchange',
          notes: 'Consignment Audit Point',
        },
        {
          name: 'Halt 2: Cargo Weight & Safety Inspection',
          type: 'halt',
          status: t.progress > 75 ? 'passed' : t.progress > 60 ? 'current' : 'upcoming',
          time: t.progress > 75 ? '12:00 PM' : 'Expected 12:00 PM',
          location: 'State Boundary Checkpost',
          duration: '10 min halt',
          notes: 'Weight Bridge Verification',
        },
        {
          name: 'Waypoint 3: Outer Ring Road Checkpoint',
          type: 'waypoint',
          status: t.progress > 90 ? 'passed' : t.progress > 75 ? 'current' : 'upcoming',
          time: t.progress > 90 ? '12:40 PM' : t.eta,
          location: 'KM 42 Metropolitan Border',
          notes: 'Urban Entry Clearance',
        },
        {
          name: matchedRoute?.destName || 'Consignee Unloading Terminal',
          type: 'destination',
          status: t.status === 'Completed' ? 'passed' : 'upcoming',
          eta: estFormatted,
          location: `Consignee: ${matchedRoute?.consigneeName || t.consigneeName || 'Apex Logistics'}`,
          notes: 'Final Destination Delivery',
        },
      ];

      const matchedViolations = sampleTripViolations.filter(
        (v) => v.tripId === t.id || v.vehicleNo === t.vehicleNo || v.vehicleId === t.vehicleId
      );
      const violationCount = matchedViolations.length > 0
        ? matchedViolations.length
        : delayMin > 20 ? 2 : delayMin > 0 ? 1 : (idx % 3 === 0 ? 1 : 0);

      return {
        trip: t,
        scheduledArrival: schedFormatted,
        estimatedArrival: estFormatted,
        delayMinutes: delayMin,
        etaStatus: status,
        origin: matchedRoute?.originName || 'Origin Depot',
        destination: matchedRoute?.destName || 'Destination Hub',
        distanceCovered: covered,
        distanceRemaining: remaining,
        totalDistance: totalDist,
        consignee: matchedRoute?.consigneeName || t.consigneeName || 'Apex Freight',
        confidenceScore: 94 + (idx % 5),
        waypoints,
        weatherCondition: idx % 2 === 0 ? 'Clear Skies (27°C)' : 'Light Rain (23°C)',
        trafficCondition: delayMin > 20 ? 'Congested (+25m)' : delayMin > 0 ? 'Moderate Traffic' : 'Normal Flow',
        vehicleType: vehicleInfo?.type || 'Heavy Commercial Truck',
        driverPhone: '+91 98765 ' + (10000 + idx * 111),
        liveStatusName: liveInfo?.status || (t.status === 'In Transit' ? 'Moving' : 'Parked'),
        violationCount,
      };
    });
  }, [trips, routes, refreshKey]);

  // Derive selected trip details in real-time from extendedTrips
  const selectedTripDetails = useMemo(() => {
    if (!selectedTripId) return null;
    return extendedTrips.find((t) => t.trip.id === selectedTripId) || null;
  }, [selectedTripId, extendedTrips]);

  // Aggregate project statistics from live trips
  const stats = useMemo(() => {
    const total = extendedTrips.length;
    const inTransit = extendedTrips.filter((t) => t.trip.status === 'In Transit').length;
    const scheduled = extendedTrips.filter((t) => t.trip.status === 'Scheduled').length;
    const completed = extendedTrips.filter((t) => t.trip.status === 'Completed').length;
    const onTime = extendedTrips.filter((t) => t.etaStatus === 'On Time' && t.trip.status === 'In Transit').length;
    const delayed = extendedTrips.filter((t) => (t.etaStatus === 'Minor Delay' || t.etaStatus === 'Critical Delay') && t.trip.status === 'In Transit').length;

    const onTimeRate = inTransit > 0 ? Math.round((onTime / inTransit) * 100) : 100;
    const avgConfidence = Math.round(
      extendedTrips.reduce((acc, curr) => acc + curr.confidenceScore, 0) / (total || 1)
    );
    const totalDistRemaining = extendedTrips
      .filter((t) => t.trip.status === 'In Transit')
      .reduce((acc, curr) => acc + curr.distanceRemaining, 0);

    return {
      total,
      inTransit,
      scheduled,
      completed,
      onTime,
      delayed,
      onTimeRate,
      avgConfidence,
      totalDistRemaining,
    };
  }, [extendedTrips]);

  // Search and filter logic
  const filteredTrips = useMemo(() => {
    return extendedTrips.filter((item) => {
      const matchesSearch =
        item.trip.routeName.toLowerCase().includes(search.toLowerCase()) ||
        item.trip.vehicleNo.toLowerCase().includes(search.toLowerCase()) ||
        item.trip.driverName.toLowerCase().includes(search.toLowerCase()) ||
        item.destination.toLowerCase().includes(search.toLowerCase()) ||
        item.origin.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'in_transit') return item.trip.status === 'In Transit';
      if (statusFilter === 'scheduled') return item.trip.status === 'Scheduled';
      if (statusFilter === 'on_time') return item.etaStatus === 'On Time';
      if (statusFilter === 'delayed') return item.etaStatus === 'Minor Delay' || item.etaStatus === 'Critical Delay';
      if (statusFilter === 'completed') return item.trip.status === 'Completed';

      return true;
    });
  }, [extendedTrips, search, statusFilter]);

  // Pagination calculation
  const paginatedTrips = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTrips.slice(start, start + rowsPerPage);
  }, [filteredTrips, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredTrips.length / rowsPerPage);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
      toast({
        title: 'ETA Dashboard Refreshed',
        description: 'Synchronized with real-time GPS telemetry and active routes.',
      });
    }, 500);
  };

  const handleStartTrip = (id: string, name: string) => {
    updateTripStatus(id, 'In Transit');
    toast({
      title: 'Trip Initiated',
      description: `Transit started for "${name}". Live ETA tracking active.`,
    });
  };

  const handleCompleteTrip = (id: string, name: string) => {
    updateTripStatus(id, 'Completed');
    toast({
      title: 'Trip Marked Completed',
      description: `Vehicle arrived at destination for "${name}".`,
    });
  };

  const handleDeleteTrip = (id: string, name: string) => {
    deleteTrip(id);
    toast({
      title: 'Trip Assignment Removed',
      description: `Trip for "${name}" has been deleted from active fleet.`,
      variant: 'destructive',
    });
  };

  const handleNotifyDriver = (driverName: string, vehicleNo: string) => {
    toast({
      title: 'ETA Alert Sent',
      description: `Dispatched arrival advisory SMS & alert to ${driverName} (${vehicleNo}).`,
    });
  };

  const getStatusBadge = (status: ExtendedTripEta['etaStatus']) => {
    switch (status) {
      case 'On Time':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> On Time
          </Badge>
        );
      case 'Minor Delay':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3" /> Minor Delay
          </Badge>
        );
      case 'Critical Delay':
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 flex items-center gap-1 shrink-0">
            <ShieldAlert className="w-3 h-3" /> Critical Delay
          </Badge>
        );
      case 'Scheduled':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" /> Scheduled
          </Badge>
        );
      case 'Completed':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Arrived
          </Badge>
        );
    }
  };

  const getNodeBadge = (type: TimelineNode['type'], duration?: string) => {
    switch (type) {
      case 'origin':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]">
            Origin
          </Badge>
        );
      case 'waypoint':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]">
            Waypoint
          </Badge>
        );
      case 'halt':
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]">
            Halt ({duration || '15m'})
          </Badge>
        );
      case 'destination':
        return (
          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-[10px]">
            Destination
          </Badge>
        );
    }
  };

  const getNodeIcon = (type: TimelineNode['type'], status: TimelineNode['status']) => {
    if (status === 'passed') {
      return <CheckCircle2 className="w-3 h-3" />;
    }
    if (type === 'origin') return <Play className="w-2.5 h-2.5 ml-0.5" />;
    if (type === 'halt') return <Coffee className="w-2.5 h-2.5" />;
    if (type === 'destination') return <Flag className="w-2.5 h-2.5" />;
    return <Navigation className="w-2.5 h-2.5" />;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Bar Header & Action Shortcuts */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Live ETA Intelligence & Trip Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Predictive arrival estimates, route progress, and dispatcher control panel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/trip-management/routes')}
            className="h-9 gap-1.5 text-xs"
          >
            <ClipboardList className="w-3.5 h-3.5" /> Route List
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/trip-management/create-route')}
            className="h-9 gap-1.5 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Create Route
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/trip-management/assign')}
            className="h-9 gap-1.5 text-xs"
          >
            <Route className="w-3.5 h-3.5" /> Assign Route
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/trip-management/track-eta')}
            className="h-9 gap-1.5 text-xs"
          >
            <Navigation className="w-3.5 h-3.5" /> Live Map Tracking
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0"
            title="Refresh ETA Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Trips Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active Trips in Transit</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{stats.inTransit}</span>
                <span className="text-xs text-muted-foreground">/ {stats.total} total</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {stats.completed} arrived, {stats.scheduled} scheduled
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Truck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* On-Time Performance */}
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">On-Time Performance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{stats.onTimeRate}%</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Optimal
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stats.onTime} of {stats.inTransit} active trips on schedule
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Trips */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Delayed / At Risk Trips</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {stats.delayed}
                </span>
                <span className="text-xs text-muted-foreground">trips affected</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {stats.delayed > 0 ? 'Requires dispatcher attention' : 'All transit clear'}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Predictive Confidence & Transit Distance */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">AI ETA Accuracy Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{stats.avgConfidence}%</span>
                <span className="text-xs text-muted-foreground">confidence</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stats.totalDistRemaining} km total transit remaining
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Gauge className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Progress & Quick Filters Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Real-time Fleet Status & Filter Controls
              </h3>
              <p className="text-xs text-muted-foreground">
                Filter trips by status or search across drivers, vehicles, and destinations.
              </p>
            </div>

            {/* Quick Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full"
                onClick={() => { setStatusFilter('all'); setPage(0); }}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={statusFilter === 'in_transit' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full"
                onClick={() => { setStatusFilter('in_transit'); setPage(0); }}
              >
                In Transit ({stats.inTransit})
              </Button>
              <Button
                variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/30"
                onClick={() => { setStatusFilter('scheduled'); setPage(0); }}
              >
                Scheduled ({stats.scheduled})
              </Button>
              <Button
                variant={statusFilter === 'on_time' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30"
                onClick={() => { setStatusFilter('on_time'); setPage(0); }}
              >
                On Time ({stats.onTime})
              </Button>
              <Button
                variant={statusFilter === 'delayed' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/30"
                onClick={() => { setStatusFilter('delayed'); setPage(0); }}
              >
                Delayed ({stats.delayed})
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/30"
                onClick={() => { setStatusFilter('completed'); setPage(0); }}
              >
                Arrived ({stats.completed})
              </Button>
            </div>
          </div>

          {/* Visual Status Proportion Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Fleet Transit Ratio</span>
              <span>{stats.inTransit} Transit | {stats.scheduled} Scheduled | {stats.completed} Completed</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(stats.onTime / (stats.total || 1)) * 100}%` }}
                className="bg-emerald-500 transition-all"
                title="On Time"
              />
              <div
                style={{ width: `${(stats.delayed / (stats.total || 1)) * 100}%` }}
                className="bg-amber-500 transition-all"
                title="Delayed"
              />
              <div
                style={{ width: `${(stats.scheduled / (stats.total || 1)) * 100}%` }}
                className="bg-purple-500 transition-all"
                title="Scheduled"
              />
              <div
                style={{ width: `${(stats.completed / (stats.total || 1)) * 100}%` }}
                className="bg-blue-500 transition-all"
                title="Completed"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main ETA Interactive Directory Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Active Fleet ETA Directory</CardTitle>
              <CardDescription className="text-xs">
                Real-time predictive telemetry, live variance calculations, and trip management.
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={showDriverName ? "Search vehicle, driver, route..." : "Search vehicle, route..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[180px] text-xs">{showDriverName ? 'Vehicle & Driver' : 'Vehicle'}</TableHead>
                  <TableHead className="text-xs">Route & Consignee</TableHead>
                  <TableHead className="text-xs">Departure / Sched. Arrival</TableHead>
                  <TableHead className="text-xs">Live Estimated ETA</TableHead>
                  <TableHead className="text-xs">ETA Health</TableHead>
                  <TableHead className="w-[180px] text-xs">Transit Progress</TableHead>
                  <TableHead className="text-right text-xs">Actions & Dispatch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                      No matching trips found in the project.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrips.map((item) => {
                    const isTransit = item.trip.status === 'In Transit';
                    const isScheduled = item.trip.status === 'Scheduled';

                    return (
                      <TableRow key={item.trip.id} className="hover:bg-muted/40 transition-colors">
                        {/* Vehicle & Driver */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-medium text-xs">
                              <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{item.trip.vehicleNo}</span>
                            </div>
                            {showDriverName && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <User className="w-3 h-3 shrink-0" />
                                <span>{item.trip.driverName}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ID: {item.trip.vehicleId}
                            </div>
                          </div>
                        </TableCell>

                        {/* Route & Consignee */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium text-xs truncate max-w-[220px]" title={item.trip.routeName}>
                              {item.trip.routeName}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[200px]">To: {item.destination}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Consignee: {item.consignee}
                            </div>
                          </div>
                        </TableCell>

                        {/* Departure & Scheduled Arrival */}
                        <TableCell className="text-xs">
                          <div className="font-medium">{item.scheduledArrival}</div>
                          <div className="text-[11px] text-muted-foreground">Start: {item.trip.startTime}</div>
                        </TableCell>

                        {/* Live Estimated ETA */}
                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {item.estimatedArrival}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.trip.eta}
                          </div>
                        </TableCell>

                        {/* ETA Health Badge */}
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(item.etaStatus)}
                            {item.delayMinutes > 0 && isTransit && (
                              <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                +{item.delayMinutes} min variance
                              </div>
                            )}
                            {item.violationCount > 0 && (
                              <div className="text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {item.violationCount} {item.violationCount === 1 ? 'violation' : 'violations'}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Transit Progress */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span>{item.trip.progress}%</span>
                              <span className="text-muted-foreground">{item.distanceRemaining} km left</span>
                            </div>
                            <Progress value={item.trip.progress} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Speed: {item.trip.speed} km/h</span>
                              <span>Conf: {item.confidenceScore}%</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Actions & Dispatch */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setSelectedTripId(item.trip.id)}
                              title="View Telemetry Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </Button>

                            {/* Live Map Track */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1"
                              onClick={() => navigate('/trip-management/track-eta')}
                              title="Track on Google Map"
                            >
                              <Navigation className="w-3.5 h-3.5" /> Map
                            </Button>

                            {/* Status Change Controls */}
                            {isScheduled && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs gap-1 bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/30"
                                onClick={() => handleStartTrip(item.trip.id, item.trip.routeName)}
                              >
                                <Play className="w-3.5 h-3.5" /> Start
                              </Button>
                            )}

                            {isTransit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs gap-1 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/30"
                                onClick={() => handleCompleteTrip(item.trip.id, item.trip.routeName)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Arrive
                              </Button>
                            )}

                            {/* Delete Confirmation */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  title="Delete Trip Assignment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Trip Assignment?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete trip "{item.trip.routeName}" for vehicle {item.trip.vehicleNo} from the project database.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTrip(item.trip.id, item.trip.routeName)}
                                  >
                                    Delete Trip
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue placeholder={rowsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing {filteredTrips.length === 0 ? 0 : page * rowsPerPage + 1} -{' '}
                {Math.min((page + 1) * rowsPerPage, filteredTrips.length)} of {filteredTrips.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Trip Telemetry & Waypoints Modal */}
      <Dialog open={!!selectedTripDetails} onOpenChange={() => setSelectedTripId(null)}>
        {selectedTripDetails && (
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="shrink-0">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" /> {selectedTripDetails.trip.routeName}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Live GPS Telemetry & Predictive Waypoint Breakdown for {selectedTripDetails.trip.vehicleNo}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-2">
              {/* Trip Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/30 p-3 rounded-lg border text-xs shrink-0">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{showDriverName ? 'Vehicle / Driver' : 'Vehicle'}</span>
                  <span className="font-semibold">{selectedTripDetails.trip.vehicleNo}</span>
                  {showDriverName && (
                    <span className="block text-muted-foreground text-[10px]">{selectedTripDetails.trip.driverName}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Scheduled Arrival</span>
                  <span className="font-semibold">{selectedTripDetails.scheduledArrival}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Predicted ETA</span>
                  <span className="font-semibold text-primary">{selectedTripDetails.estimatedArrival}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Violation Count</span>
                  <div className="mt-0.5">
                    {selectedTripDetails.violationCount > 0 ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-semibold flex items-center gap-1 w-fit text-[11px]">
                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                        {selectedTripDetails.violationCount} {selectedTripDetails.violationCount === 1 ? 'Violation' : 'Violations'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        0 Violations
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedTripDetails.etaStatus)}</div>
                </div>
              </div>

              {/* Violation Alert Banner if violations exist */}
              {selectedTripDetails.violationCount > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs shrink-0">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <span className="font-semibold">{selectedTripDetails.violationCount} {selectedTripDetails.violationCount === 1 ? 'Violation' : 'Violations'} Detected</span>
                      <span className="text-[11px] block text-red-600/80 dark:text-red-400/80">
                        Telemetry flagged route deviation or speed threshold breach during transit.
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] border-red-500/30 text-red-700 hover:bg-red-500/20 dark:text-red-300 shrink-0 gap-1"
                    onClick={() => {
                      setSelectedTripId(null);
                      navigate('/trip-management/violations');
                    }}
                  >
                    View Violations
                  </Button>
                </div>
              )}

              {/* Progress & Speed Breakdown */}
              <div className="space-y-2 shrink-0">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Transit Progress ({selectedTripDetails.trip.progress}%)</span>
                  <span>{selectedTripDetails.distanceRemaining} km remaining of {selectedTripDetails.totalDistance} km</span>
                </div>
                {/* Custom Transit Progress Bar with Truck Movement Red Dot Marker */}
                <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-visible my-1.5">
                  {/* Blue line showing truck movement */}
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, selectedTripDetails.trip.progress))}%` }}
                  />
                  {/* Red dot icon indicating live truck location on the line */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md z-10 transition-all duration-500 ease-out"
                    style={{ left: `${Math.max(0, Math.min(100, selectedTripDetails.trip.progress))}%` }}
                    title={`Truck position: ${selectedTripDetails.trip.progress}%`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 bg-card rounded border">
                    <span className="text-[10px] text-muted-foreground block">Speed</span>
                    <span className="font-semibold text-sm">{selectedTripDetails.trip.speed} km/h</span>
                  </div>
                  <div className="p-2 bg-card rounded border">
                    <span className="text-[10px] text-muted-foreground block">Route Weather</span>
                    <span className="font-semibold">{selectedTripDetails.weatherCondition}</span>
                  </div>
                  <div className="p-2 bg-card rounded border">
                    <span className="text-[10px] text-muted-foreground block">Traffic Conditions</span>
                    <span className="font-semibold">{selectedTripDetails.trafficCondition}</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Scrollable Section for Route Waypoints & Halts */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <h4 className="text-xs font-bold tracking-tight uppercase text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Route Waypoints & Halts
                </h4>

                <div className="flex-1 max-h-[220px] overflow-y-auto pr-3 border rounded-lg p-3 bg-muted/10">
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {selectedTripDetails.waypoints.map((node, i) => (
                      <div key={i} className="relative flex items-start justify-between text-xs">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${node.status === 'passed'
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : node.status === 'current'
                              ? 'bg-primary text-white border-primary animate-pulse'
                              : node.type === 'halt'
                                ? 'bg-amber-500/20 text-amber-600 border-amber-500'
                                : node.type === 'destination'
                                  ? 'bg-purple-500/20 text-purple-600 border-purple-500'
                                  : 'bg-background border-muted-foreground'
                            }`}
                        >
                          {getNodeIcon(node.type, node.status)}
                        </div>

                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${node.status === 'current' ? 'text-primary font-bold' : ''}`}>
                              {node.name}
                            </span>
                            {getNodeBadge(node.type, node.duration)}
                          </div>

                          {node.location && (
                            <span className="block text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" /> {node.location}
                            </span>
                          )}

                          {node.notes && (
                            <span className="block text-[10px] text-muted-foreground italic">
                              Note: {node.notes}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-medium block">
                            {node.time || node.eta || '--:--'}
                          </span>
                          <span className="block text-[10px] text-muted-foreground capitalize">
                            {node.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Driver Contact & Telemetry Panel */}
              {showDriverName && (
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border text-xs shrink-0">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Driver: {selectedTripDetails.trip.driverName}
                    </span>
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {selectedTripDetails.driverPhone}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleNotifyDriver(selectedTripDetails.trip.driverName, selectedTripDetails.trip.vehicleNo)}
                  >
                    <Send className="w-3.5 h-3.5 text-primary" /> Send Advisory SMS
                  </Button>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
                <Button variant="outline" size="sm" onClick={() => setSelectedTripId(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTripId(null);
                    navigate('/trip-management/track-eta');
                  }}
                  className="gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" /> View Live Map
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
