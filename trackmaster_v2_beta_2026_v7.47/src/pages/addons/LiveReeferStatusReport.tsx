import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { GoogleMap, OverlayView, LoadScript } from '@react-google-maps/api';
import { getIconUrl, getStatusColor } from '@/lib/map-utils';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import type { VehicleStatus } from '@/types';

const mapLibraries: ('drawing' | 'places')[] = ['drawing', 'places'];
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { actualVehicles } from '@/data/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Download,
  Thermometer,
  Droplets,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  AirVent,
  RefreshCw,
  Eye,
  MapPin,
  Phone,
  ShieldAlert,
  Power,
  User,
  Navigation,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import WhatsappPopup from '@/components/WhatsappPopup';
import { useSettings } from '@/context/SettingsContext';
import { formatAppDateTime, formatAppDuration } from '@/lib/date-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- VEHICLE ICON BADGE ---
const VehicleIconBadge = ({ vehicleType }: { vehicleType: string }) => {
  const imageName = vehicleType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vehicleType}
      className="flex-shrink-0 w-10 h-10 object-contain drop-shadow-sm"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
};

// --- MOVEMENT STATUS BADGE (MATCHING LIVE STATUS TABLE) ---
const minimalDotCache = new Map<string, string>();
const getStatusColorHex = (status: string) => {
  switch (status) {
    case 'Moving':
    case 'MOVING':
      return '#22c55e';
    case 'Parked':
    case 'STOPPED':
      return '#eab308';
    case 'Idle':
    case 'IDLING':
      return '#14b8a6';
    default:
      return '#6b7280';
  }
};

const MovementStatusBadge = ({ status }: { status: string }) => {
  const displayLabel =
    status === 'MOVING' ? 'Moving' : status === 'IDLING' ? 'Idle' : status === 'STOPPED' ? 'Parked' : status;

  if (!minimalDotCache.has(displayLabel)) {
    const color = getStatusColorHex(displayLabel);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88" width="32" height="32">
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25" />
          </filter>
        </defs>
        <circle cx="61.44" cy="61.44" r="57" fill="#ffffff" filter="url(#shadow)" />
        <circle cx="61.44" cy="61.44" r="50" fill="${color}" />
        <path d="M61.44 28 L87 82 L61.44 72 L35 82 Z" fill="#ffffff" />
      </svg>
    `;

    minimalDotCache.set(
      displayLabel,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    );
  }

  const iconUrl = minimalDotCache.get(displayLabel)!;

  return (
    <div className="flex items-center gap-2 justify-start">
      <img
        src={iconUrl}
        alt={displayLabel}
        className="h-5 w-5 shrink-0"
      />
      <span className="text-xs font-medium text-foreground">
        {displayLabel}
      </span>
    </div>
  );
};

export type ReeferUnitStatus = {
  id: string;
  name: string;
  vehicleType: string;
  movementStatus: 'MOVING' | 'IDLING' | 'STOPPED';
  status: 'COMPLIANT' | 'WARNING' | 'CRITICAL';
  acStatus: 'ON' | 'OFF';
  currentTemp: number;
  setPoint: number;
  minSafe: number;
  maxSafe: number;
  lowestTemp: number;
  highestTemp: number;
  relativeHumidity: number;
  minHumidity: number;
  maxHumidity: number;
  batteryLevel: number;
  fuelLevel: number;
  location: string;
  lat: number;
  lng: number;
  latLongHistory: { lat: number; lng: number }[];
  acOnDuration?: string;
  driverName: string;
  driverPhone: string;
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '200px',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

// Mock data generator for live reefer status
const generateLiveReeferData = (): ReeferUnitStatus[] => {
  const reefers = actualVehicles
    .filter((v, i) => v.type === 'Reefer' || i % 3 === 0)
    .map((v, i) => {
      const setPoint = i % 2 === 0 ? -18 : 2;
      const minSafe = setPoint === -18 ? -22 : 0;
      const maxSafe = setPoint === -18 ? -15 : 5;

      const offset = (i % 7) * 0.8 - 2.4;
      const currentTemp = parseFloat((setPoint + offset).toFixed(1));
      const highestTemp = parseFloat((Math.max(currentTemp, maxSafe) + (i % 3 === 0 ? 2.1 : 0.4)).toFixed(1));
      const lowestTemp = parseFloat((Math.min(currentTemp, minSafe) - (i % 4 === 0 ? 1.8 : 0.5)).toFixed(1));

      const relativeHumidity = Math.min(95, Math.max(35, 65 + (i * 7) % 25));
      const minHumidity = 45;
      const maxHumidity = 80;

      let status: 'COMPLIANT' | 'WARNING' | 'CRITICAL' = 'COMPLIANT';
      if (currentTemp > maxSafe + 1.2 || currentTemp < minSafe - 1.2) {
        status = 'CRITICAL';
      } else if (currentTemp > maxSafe || currentTemp < minSafe) {
        status = 'WARNING';
      }

      const movementStatus: 'MOVING' | 'IDLING' | 'STOPPED' =
        i % 4 === 0 ? 'STOPPED' : i % 3 === 0 ? 'IDLING' : 'MOVING';

      const acStatus: 'ON' | 'OFF' =
        movementStatus === 'STOPPED' && i % 2 === 0 ? 'OFF' : i % 5 === 0 ? 'OFF' : 'ON';

      const locations = [
        { name: 'NH-48, Near Vadodara Toll Plaza', lat: 22.3072, lng: 73.1812 },
        { name: 'Mumbai-Pune Expressway, Lonavala', lat: 18.7557, lng: 73.4091 },
        { name: 'Cold Chain Hub, Bhiwandi Sector 4', lat: 19.2812, lng: 73.0482 },
        { name: 'Outer Ring Road, Bengaluru', lat: 12.9716, lng: 77.5946 },
        { name: 'Delhi-Jaipur Highway, Km 78', lat: 28.1487, lng: 76.8378 },
        { name: 'Industrial Park Phase 2, Chennai', lat: 13.0827, lng: 80.2707 },
        { name: 'GT Road, Ambala Cantt', lat: 30.3782, lng: 76.7767 },
      ];

      const locObj = locations[i % locations.length];
      const lat = locObj.lat + ((i % 5) * 0.004 - 0.008);
      const lng = locObj.lng + ((i % 5) * 0.004 - 0.008);
      const latLongHistory = [
        { lat: lat - 0.008, lng: lng - 0.008 },
        { lat: lat - 0.004, lng: lng - 0.003 },
        { lat, lng },
      ];

      const acHours = (i % 4) + 1;
      const acMins = (i * 13) % 60;
      const acOnDuration = formatAppDuration(acHours * 3600 + acMins * 60);

      const drivers = [
        { name: 'Rajesh Kumar', phone: '+91 98765 43210' },
        { name: 'Suresh Patil', phone: '+91 98123 45678' },
        { name: 'Vikram Singh', phone: '+91 97654 32109' },
        { name: 'Ramesh Yadav', phone: '+91 99887 76655' },
        { name: 'Amit Sharma', phone: '+91 98450 12345' },
      ];

      const driverObj = drivers[i % drivers.length];

      return {
        id: v.id,
        name: v.name || `${v.type || 'Reefer'} Unit #${100 + i}`,
        vehicleType: v.type || 'Reefer',
        movementStatus,
        status,
        acStatus,
        currentTemp,
        setPoint,
        minSafe,
        maxSafe,
        lowestTemp,
        highestTemp,
        relativeHumidity,
        minHumidity,
        maxHumidity,
        batteryLevel: Math.floor(82 + (i * 3) % 18),
        fuelLevel: Math.floor(45 + (i * 9) % 52),
        location: locObj.name,
        lat,
        lng,
        latLongHistory,
        acOnDuration,
        driverName: driverObj.name,
        driverPhone: driverObj.phone,
      };
    });

  return reefers;
};

const LiveReeferStatusReport: React.FC = () => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';

  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('vehicle') || '');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [acStatusFilter, setAcStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<ReeferUnitStatus | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!selectedUnit) {
      setMarkerPosition(null);
      return;
    }
    const history = selectedUnit.latLongHistory?.length
      ? selectedUnit.latLongHistory
      : [{ lat: selectedUnit.lat, lng: selectedUnit.lng }];
    setMarkerPosition(history[history.length - 1]);
  }, [selectedUnit]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ReeferUnitStatus;
    direction: 'asc' | 'desc';
  }>({
    key: 'id',
    direction: 'asc',
  });

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Generate data once
  const allReeferData = useMemo(() => generateLiveReeferData(), []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleSort = (key: keyof ReeferUnitStatus) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filter logic
  const filteredData = useMemo(() => {
    return allReeferData.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.driverName.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);

      const matchesMovement =
        movementFilter === 'all' || item.movementStatus.toLowerCase() === movementFilter.toLowerCase();

      const matchesCompliance =
        complianceFilter === 'all' || item.status.toLowerCase() === complianceFilter.toLowerCase();

      const matchesAcStatus =
        acStatusFilter === 'all' || item.acStatus.toLowerCase() === acStatusFilter.toLowerCase();

      return matchesSearch && matchesMovement && matchesCompliance && matchesAcStatus;
    });
  }, [allReeferData, searchQuery, movementFilter, complianceFilter, acStatusFilter]);

  // Sorted data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null || bVal == null) return 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = sortedData.length === 0 ? 0 : page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  // Summary statistics
  const stats = useMemo(() => {
    const total = allReeferData.length;
    const compliant = allReeferData.filter((r) => r.status === 'COMPLIANT').length;
    const warning = allReeferData.filter((r) => r.status === 'WARNING').length;
    const critical = allReeferData.filter((r) => r.status === 'CRITICAL').length;
    const acOn = allReeferData.filter((r) => r.acStatus === 'ON').length;
    const avgTemp = (allReeferData.reduce((acc, curr) => acc + curr.currentTemp, 0) / total).toFixed(1);

    return { total, compliant, warning, critical, acOn, avgTemp };
  }, [allReeferData]);

  // Reset page when filters change
  const handleClearFilters = () => {
    setSearchQuery('');
    setMovementFilter('all');
    setComplianceFilter('all');
    setAcStatusFilter('all');
    setPage(0);
  };

  // Export handlers
  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(16);
    doc.text('Live Reefer Status Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${formatAppDateTime(new Date(), timeFormat)}`, 14, 22);

    const tableColumn = [
      'Truck ID',
      'Name',
      'Movement',
      'Compliance',
      'Current Temp (°C) / Range',
      'Humidity (%)',
      'AC Status',
      'Location',
    ];

    const tableRows = sortedData.map((item) => [
      item.id,
      item.name,
      item.movementStatus,
      item.status,
      `${item.currentTemp.toFixed(1)}°C (${item.minSafe}°C to ${item.maxSafe}°C)`,
      `${item.relativeHumidity}% (${item.minHumidity}% to ${item.maxHumidity}%)`,
      item.acStatus,
      item.location,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`live-reefer-status-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    const csvData = sortedData.map((item) => ({
      'Truck ID': item.id,
      'Vehicle Name': item.name,
      'Movement Status': item.movementStatus,
      'Compliance Status': item.status,
      'Current Temp (°C)': item.currentTemp,
      'Set Point (°C)': item.setPoint,
      'Min Safe (°C)': item.minSafe,
      'Max Safe (°C)': item.maxSafe,
      'Lowest Temp (°C)': item.lowestTemp,
      'Highest Temp (°C)': item.highestTemp,
      'Humidity (%)': item.relativeHumidity,
      'Humidity Range (%)': `${item.minHumidity}% to ${item.maxHumidity}%`,
      'AC Status': item.acStatus,
      'Battery Level (%)': item.batteryLevel,
      'Fuel Level (%)': item.fuelLevel,
      'Location': item.location,
      'Driver Name': item.driverName,
      'Driver Phone': item.driverPhone,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `live-reefer-status-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sortable table header component
  const SortableHeader: React.FC<{
    children: React.ReactNode;
    sortKey: keyof ReeferUnitStatus;
    className?: string;
  }> = ({ children, sortKey, className = '' }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
      <TableCell
        className={cn(
          'cursor-pointer select-none font-semibold text-xs text-muted-foreground hover:text-foreground transition-colors py-3',
          className
        )}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1 justify-inherit">
          <span>{children}</span>
          {isSorted ? (
            sortConfig.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-40" />
          )}
        </div>
      </TableCell>
    );
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={mapLibraries}>
      <div className="flex flex-col gap-5 w-full">
        {/* Top Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Live Reefer Status</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time monitoring of reefer container temperatures, humidity, AC status, and safety thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>

            <WhatsappPopup />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Download className="h-3.5 w-3.5" />
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF} className="text-xs gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-500" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Reefers */}
          <Card className="p-3.5 shadow-sm border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Reefers</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active Fleet Units</p>
          </Card>

          {/* Compliant Units */}
          <Card className="p-3.5 shadow-sm border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Compliant</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.compliant}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">In Safe Range</p>
          </Card>

          {/* Warning Units */}
          <Card className="p-3.5 shadow-sm border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center justify-between text-orange-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Warning</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-orange-500">{stats.warning}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Near Limits</p>
          </Card>

          {/* Critical Alerts */}
          <Card className="p-3.5 shadow-sm border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Critical</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Temp Excursion</p>
          </Card>

          {/* AC Status ON */}
          <Card className="p-3.5 shadow-sm border-sky-500/30 bg-sky-500/5">
            <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">AC Status: ON</span>
              <AirVent className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.acOn}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Reefer AC Active</p>
          </Card>

          {/* Fleet Avg Temp */}
          <Card className="p-3.5 shadow-sm border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Fleet Temp</span>
              <Thermometer className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.avgTemp}°C</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Mean Temperature</p>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="overflow-hidden shadow-sm flex flex-col border-border">
          {/* Table Header Bar */}
          <CardHeader className="px-4 py-3 border-b bg-card flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Live Reefer Status Table</CardTitle>
              <CardDescription className="text-xs">
                Showing real-time operational status, temperature readings, and compliance for active units.
              </CardDescription>
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">
              Showing <span className="font-semibold text-foreground">{filteredData.length}</span> of {allReeferData.length} units
            </div>
          </CardHeader>

          {/* Filter Toolbar */}
          <div className="bg-muted/30 p-3 flex flex-wrap gap-2.5 items-center border-b">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search Truck ID, Name, Driver..."
                className="pl-8 h-8 text-xs bg-background border-border"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            {/* Movement Filter */}
            <Select
              value={movementFilter}
              onValueChange={(val) => {
                setMovementFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border text-foreground">
                <SelectValue placeholder="Movement: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Movement: All</SelectItem>
                <SelectItem value="moving" className="text-xs text-green-600 dark:text-green-400 font-medium">Moving</SelectItem>
                <SelectItem value="idling" className="text-xs text-teal-600 dark:text-teal-400 font-medium">Idle</SelectItem>
                <SelectItem value="stopped" className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Parked</SelectItem>
              </SelectContent>
            </Select>

            {/* Compliance Status Filter */}
            <Select
              value={complianceFilter}
              onValueChange={(val) => {
                setComplianceFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[145px] h-8 text-xs bg-background border-border text-foreground">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Status: All</SelectItem>
                <SelectItem value="compliant" className="text-xs text-emerald-600 font-medium">Status: Compliant</SelectItem>
                <SelectItem value="warning" className="text-xs text-orange-500 font-medium">Status: Warning</SelectItem>
                <SelectItem value="critical" className="text-xs text-red-600 font-medium">Status: Critical</SelectItem>
              </SelectContent>
            </Select>

            {/* AC Status Filter */}
            <Select
              value={acStatusFilter}
              onValueChange={(val) => {
                setAcStatusFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border text-foreground">
                <SelectValue placeholder="AC Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">AC Status: All</SelectItem>
                <SelectItem value="on" className="text-xs text-sky-600 font-medium">AC On</SelectItem>
                <SelectItem value="off" className="text-xs text-gray-500 font-medium">AC Off</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              className="h-8 text-xs px-3 bg-background text-foreground"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>

          {/* Live Reefer Table Content */}
          <CardContent className="p-0 flex-1 flex flex-col bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 hover:bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b-border">
                    <SortableHeader sortKey="id" className="text-left">Vehicle Details</SortableHeader>
                    <SortableHeader sortKey="movementStatus" className="text-left">Movement</SortableHeader>
                    <SortableHeader sortKey="status" className="text-left">Compliance</SortableHeader>
                    <SortableHeader sortKey="currentTemp" className="text-left">Current Temp</SortableHeader>
                    <SortableHeader sortKey="relativeHumidity" className="text-left">Humidity</SortableHeader>
                    <SortableHeader sortKey="lowestTemp" className="text-left">Lowest / Highest</SortableHeader>
                    <SortableHeader sortKey="acStatus" className="text-left">AC Status</SortableHeader>
                    <TableCell className="font-semibold text-xs text-muted-foreground text-left py-3">Location</TableCell>
                    <TableCell className="font-semibold text-xs text-muted-foreground text-left py-3">Action</TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-border/50">
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-32 text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Thermometer className="h-8 w-8 text-muted-foreground/50" />
                          <span>No reefer units matching your selected criteria.</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={handleClearFilters}>
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        {/* Truck ID & Name */}
                        <TableCell className="px-3 py-2.5 font-medium text-xs">
                          <div className="flex items-center gap-2.5">
                            <VehicleIconBadge vehicleType={row.vehicleType} />
                            <div className="flex flex-col">
                              <span className="text-primary font-semibold text-xs">{row.id}</span>
                              <span className="text-[11px] text-muted-foreground font-normal">{row.name}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Movement Status */}
                        <TableCell className="px-3 py-2.5 text-left">
                          <MovementStatusBadge status={row.movementStatus} />
                        </TableCell>

                        {/* Compliance Status */}
                        <TableCell className="px-3 py-2.5 text-left">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border',
                              row.status === 'CRITICAL' &&
                              'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800/40 animate-pulse',
                              row.status === 'WARNING' &&
                              'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                              row.status === 'COMPLIANT' &&
                              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            )}
                          >
                            {row.status}
                          </span>
                        </TableCell>

                        {/* Current Temp & Optimal Range */}
                        <TableCell className="px-3 py-2.5 text-left tabular-nums">
                          <div
                            className={cn(
                              'font-bold text-sm flex items-center gap-1',
                              row.status === 'CRITICAL'
                                ? 'text-red-600 dark:text-red-400'
                                : row.status === 'WARNING'
                                  ? 'text-orange-500'
                                  : 'text-foreground'
                            )}
                          >
                            <Thermometer className="h-3.5 w-3.5 opacity-70" />
                            <span>{row.currentTemp.toFixed(1)}°C</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            ({row.minSafe}°C to {row.maxSafe}°C)
                          </div>
                        </TableCell>

                        {/* Humidity */}
                        <TableCell className="px-3 py-2.5 text-left tabular-nums">
                          <div className="font-bold text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                            <Droplets className="h-3.5 w-3.5" />
                            <span>{row.relativeHumidity}%</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            ({row.minHumidity}% to {row.maxHumidity}%)
                          </div>
                        </TableCell>

                        {/* Lowest & Highest Temp */}
                        <TableCell className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground tabular-nums">
                          {row.lowestTemp.toFixed(1)}°C / {row.highestTemp.toFixed(1)}°C
                        </TableCell>

                        {/* AC Status */}
                        <TableCell className="px-3 py-2.5 text-left">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border',
                              row.acStatus === 'ON'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            <Power className="h-3 w-3" />
                            {row.acStatus}
                          </span>
                        </TableCell>

                        {/* Location */}
                        <TableCell className="px-3 py-2.5 text-left text-xs text-muted-foreground max-w-[180px] truncate">
                          <div className="flex items-center gap-1" title={row.location}>
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{row.location}</span>
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="px-3 py-2.5 text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1"
                            onClick={() => setSelectedUnit(row)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Table Footer Pagination */}
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-3 border-t bg-card gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue placeholder={rowsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs">10</SelectItem>
                  <SelectItem value="25" className="text-xs">25</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {firstRowIndex}-{lastRowIndex} of {sortedData.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Reefer Details Dialog / Modal */}
        <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && setSelectedUnit(null)}>
          {selectedUnit && (
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
              {/* Header Banner */}
              <DialogHeader className="px-4 py-3 bg-muted/40 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border/80 p-1 shadow-xs flex items-center justify-center shrink-0">
                    <VehicleIconBadge vehicleType={selectedUnit.vehicleType} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span>{selectedUnit.id}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border shadow-2xs',
                          selectedUnit.status === 'CRITICAL' && 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse',
                          selectedUnit.status === 'WARNING' && 'bg-orange-500/10 text-orange-500 border-orange-500/30',
                          selectedUnit.status === 'COMPLIANT' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        )}
                      >
                        {selectedUnit.status === 'CRITICAL' ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : selectedUnit.status === 'WARNING' ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {selectedUnit.status}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-[11px] font-medium text-muted-foreground">
                      {selectedUnit.name} • Cold Chain Telemetry
                    </DialogDescription>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pr-6">
                  <MovementStatusBadge status={selectedUnit.movementStatus} />
                </div>
              </DialogHeader>

              {/* Modal Body Container */}
              <div className="p-3.5 space-y-3">
                {/* 1. STATS FIRST: KPI Telemetry Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* Current Temp */}
                  <div className="p-2.5 px-3 bg-muted/30 border border-border/60 rounded-xl flex flex-col justify-between gap-0.5 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Current Temp</span>
                      <Thermometer className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div
                      className={cn(
                        'text-xl font-black tabular-nums tracking-tight',
                        selectedUnit.status === 'CRITICAL'
                          ? 'text-red-600 dark:text-red-400'
                          : selectedUnit.status === 'WARNING'
                            ? 'text-orange-500'
                            : 'text-foreground'
                      )}
                    >
                      {selectedUnit.currentTemp.toFixed(1)}°C
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium">Real-time Telemetry</span>
                  </div>

                  {/* Optimal Safe Range */}
                  <div className="p-2.5 px-3 bg-muted/30 border border-border/60 rounded-xl flex flex-col justify-between gap-0.5 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Safe Range</span>
                      <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {selectedUnit.minSafe}°C to {selectedUnit.maxSafe}°C
                    </div>
                    <div className="flex items-center gap-1 pt-0.5 border-t border-border/50">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Recorded:</span>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          <ArrowDown className="h-2.5 w-2.5" />
                          {selectedUnit.lowestTemp.toFixed(1)}°C
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <ArrowUp className="h-2.5 w-2.5" />
                          {selectedUnit.highestTemp.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Relative Humidity */}
                  <div className="p-2.5 px-3 bg-muted/30 border border-border/60 rounded-xl flex flex-col justify-between gap-0.5 shadow-2xs">
                    <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Humidity</span>
                      <Droplets className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 tabular-nums tracking-tight">
                      {selectedUnit.relativeHumidity}%
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium">
                      Target: {selectedUnit.minHumidity}% - {selectedUnit.maxHumidity}%
                    </span>
                  </div>

                  {/* AC Status */}
                  <div className="p-2.5 px-3 bg-muted/30 border border-border/60 rounded-xl flex flex-col justify-between gap-0.5 shadow-2xs">
                    <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reefer AC</span>
                      <AirVent className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xl font-black text-sky-600 dark:text-sky-400 flex items-center gap-1 tracking-tight">
                      <Power className="h-4 w-4" />
                      {selectedUnit.acStatus}
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {selectedUnit.acStatus === 'ON'
                        ? `AC ON last ${selectedUnit.acOnDuration || '3h 45m'}`
                        : 'AC currently OFF'}
                    </span>
                  </div>
                </div>

                {/* 2. MAP SECOND: Compact Live Reefer Location Map */}
                <div className="rounded-xl overflow-hidden border border-border/80 relative flex flex-col h-[200px] shadow-xs">
                  {/* Top Left Badge on Map */}
                  <div className="absolute top-2.5 left-2.5 z-10 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border border-border/70 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live GPS Telemetry</span>
                  </div>

                  {(() => {
                    const mapStatus: VehicleStatus =
                      selectedUnit.movementStatus === 'MOVING'
                        ? 'Moving'
                        : selectedUnit.movementStatus === 'IDLING'
                          ? 'Idle'
                          : 'Parked';
                    const position = markerPosition || { lat: selectedUnit.lat, lng: selectedUnit.lng };

                    return (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={position}
                        zoom={15}
                        options={mapOptions}
                        onLoad={(map) => {
                          mapRef.current = map;
                        }}
                      >
                        <OverlayView
                          position={position}
                          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              transform: 'translate(-50%, -50%)',
                              width: '48px',
                              height: '48px',
                            }}
                          >
                            <div
                              className={cn(
                                'absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full animate-ripple',
                                getStatusColor(mapStatus)
                              )}
                            />
                            <div
                              className={cn(
                                'absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full animate-ripple',
                                getStatusColor(mapStatus)
                              )}
                              style={{ animationDelay: '1s' }}
                            />
                            <img
                              src={getIconUrl(selectedUnit.vehicleType, mapStatus)}
                              alt={selectedUnit.name}
                              className="relative z-10 w-full h-full object-contain"
                            />
                          </div>
                        </OverlayView>
                      </GoogleMap>
                    );
                  })()}
                </div>

                {/* 3. COMBINED LIVE LOCATION & DRIVER DETAILS CARD */}
                <div className="p-2.5 px-3 bg-card border border-border/70 rounded-xl space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-bold uppercase tracking-wider text-[11px] text-foreground">
                        Live Location & Driver Details
                      </span>
                    </div>
                    <MovementStatusBadge status={selectedUnit.movementStatus} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Location Info */}
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
                        Current Location
                      </span>
                      <p className="font-medium text-foreground text-[11px] leading-tight" title={selectedUnit.location}>
                        {selectedUnit.location}
                      </p>
                    </div>

                    {/* Driver Details & Quick Actions */}
                    <div className="flex items-center justify-between sm:pl-2.5 sm:border-l sm:border-border/40 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                          <User className="h-3 w-3 text-primary" /> Driver
                        </span>
                        <p className="font-bold text-foreground text-[11px]">{selectedUnit.driverName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{selectedUnit.driverPhone}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          asChild
                        >
                          <a href={`tel:${selectedUnit.driverPhone}`}>
                            <Phone className="h-2.5 w-2.5" /> Call
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] gap-1 border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${selectedUnit.driverPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Bar */}
              <div className="bg-muted/40 border-t border-border px-4 py-2.5 flex items-center justify-between">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" asChild>
                  <Link to={`/vehicle-status/route-playback?vehicle=${selectedUnit.id}`}>
                    <Navigation className="h-3 w-3 text-primary" /> Route Playback
                  </Link>
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-3" onClick={() => setSelectedUnit(null)}>
                    Close
                  </Button>
                  <Button size="sm" className="text-xs gap-1.5 h-7 px-3 bg-primary text-primary-foreground" asChild>
                    <a href={`tel:${selectedUnit.driverPhone}`}>
                      <Phone className="h-3 w-3" /> Call Driver
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </LoadScript>
  );
};

export default LiveReeferStatusReport;
