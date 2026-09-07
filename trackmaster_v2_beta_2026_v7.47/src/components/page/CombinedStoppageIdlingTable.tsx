import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { stoppageAnalysisData, type StoppageDetail } from '@/data/stoppageData';
import { actualVehicles } from '@/data/mockData';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Fuel,
  PauseCircle,
  Flame,
  ChevronsUpDown,
  Activity,
  ShieldAlert,
  PlusCircle,
  ArrowUpRight,
  PowerOff,
  MapPin,
  Map as MapIcon,
  Route,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { subWeeks, format } from 'date-fns';
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadScript, GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/Api';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { formatAppDateTime } from '@/lib/date-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- VEHICLE ICON BADGE (MATCHING REFRIGERATOR TEMP REPORT) ---
const VehicleIconBadge = ({ vehicleType = 'Truck' }: { vehicleType?: string }) => {
  const imageName = vehicleType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vehicleType}
      className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-sm"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
};

export interface TimelineSegment {
  type: 'moving' | 'idling' | 'stoppage';
  width: string;
  distance?: string;
  duration: string;
  location?: string;
  startDate?: string;
  stopDate?: string;
}

export interface CombinedHaltDetail extends StoppageDetail {
  eventType: 'IDLING' | 'STOPPAGE';
  fuelWastedLiters: number;
}

export interface CombinedHaltReportData {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  driverName: string | null;
  totalHaltTime: number; // in seconds
  stoppageCount: number;
  totalStoppageTime: number; // in seconds
  idlingCount: number;
  totalIdlingTime: number; // in seconds
  idlingRatio: number; // percentage (0-100)
  totalFuelWasted: number; // Liters
  totalDistanceKm: number; // in km
  timelineSegments: TimelineSegment[];
  status: 'OPTIMAL' | 'MODERATE IDLING' | 'CRITICAL IDLING';
  details: CombinedHaltDetail[];
}

// ─── Segment Tooltip Component (Matching DistanceReport2 line tooltip) ────────────────
const SegmentTooltip: React.FC<{ segment: TimelineSegment; isFirst?: boolean; isLast?: boolean }> = ({ segment, isFirst, isLast }) => {
  const [show, setShow] = useState(false);

  const getBgClass = () => {
    let rounded = '';
    if (isFirst) rounded += ' rounded-l-full';
    if (isLast) rounded += ' rounded-r-full';

    if (segment.type === 'moving') return `bg-emerald-500 hover:bg-emerald-600${rounded}`;
    if (segment.type === 'idling') return `bg-amber-500 hover:bg-amber-600${rounded}`;
    return `bg-blue-500 hover:bg-blue-600${rounded}`;
  };

  const getTooltipContent = () => {
    if (segment.type === 'moving') {
      return `Moving: ${segment.distance || '0 km'} (${segment.duration})`;
    }
    if (segment.type === 'idling') {
      return `Idling (Engine ON): ${segment.duration}`;
    }
    return `Stoppage (Engine OFF): ${segment.duration}`;
  };

  const getTooltipTheme = () => {
    if (segment.type === 'moving') {
      return { bg: '#2563eb', border: '#3b82f6' };
    }
    if (segment.type === 'idling') {
      return { bg: '#d97706', border: '#f59e0b' };
    }
    return { bg: '#1e293b', border: '#334155' };
  };

  const theme = getTooltipTheme();

  return (
    <div
      className="relative h-full cursor-pointer transition-all"
      style={{ width: segment.width }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className={`h-full w-full ${getBgClass()}`} />
      {show && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold shadow-lg border"
          style={{
            backgroundColor: theme.bg,
            color: '#fff',
            borderColor: theme.border,
          }}
        >
          {getTooltipContent()}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${theme.bg}`,
            }}
          />
        </div>
      )}
    </div>
  );
};

const intervalOptions = [
  { value: '0-0', label: 'All Durations' },
  { value: '0-1', label: '< 1 Minute' },
  { value: '1-2', label: '1-2 Minutes' },
  { value: '2-3', label: '2-3 Minutes' },
  { value: '3-5', label: '3-5 Minutes' },
  { value: '5-10', label: '5-10 Minutes' },
  { value: '10-0', label: '10+ Minutes' },
];

const eventTypeOptions = [
  { label: 'All Events (Idling & Stoppage)', value: 'ALL' },
  { label: 'Idling Only (Ignition ON)', value: 'IDLING' },
  { label: 'Stoppage Only (Ignition OFF)', value: 'STOPPAGE' },
];

// Helper to derive Lat/Lng coordinates for location strings (mock geocoding fallback)
const getLocationCoords = (locationStr: string): { lat: number; lng: number } => {
  if (!locationStr) return { lat: 19.0760, lng: 72.8777 };
  const locLower = locationStr.toLowerCase();
  if (locLower.includes('mumbai') || locLower.includes('bhiwandi')) return { lat: 19.0760, lng: 72.8777 };
  if (locLower.includes('bangalore') || locLower.includes('bengaluru')) return { lat: 12.9716, lng: 77.5946 };
  if (locLower.includes('pune')) return { lat: 18.5204, lng: 73.8567 };
  if (locLower.includes('delhi')) return { lat: 28.7041, lng: 77.1025 };
  if (locLower.includes('hyderabad')) return { lat: 17.3850, lng: 78.4867 };
  if (locLower.includes('chennai')) return { lat: 13.0827, lng: 80.2707 };
  if (locLower.includes('kolkata')) return { lat: 22.5726, lng: 88.3639 };
  if (locLower.includes('ahmedabad')) return { lat: 23.0225, lng: 72.5714 };
  return { lat: 19.0760, lng: 72.8777 };
};

// Helper to format duration in human-readable string
const formatDurationForReport = (totalSeconds: number) => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) {
    return '0s';
  }
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
};

const filterByInterval = (details: CombinedHaltDetail[], interval: string) => {
  if (!interval || interval === '0-0' || interval === 'all') return details;

  return details.filter(detail => {
    const durationInMinutes = detail.duration / 60;
    switch (interval) {
      case '0-1':
        return durationInMinutes < 1;
      case '1-2':
        return durationInMinutes >= 1 && durationInMinutes < 2;
      case '2-3':
        return durationInMinutes >= 2 && durationInMinutes < 3;
      case '3-5':
        return durationInMinutes >= 3 && durationInMinutes < 5;
      case '5-10':
        return durationInMinutes >= 5 && durationInMinutes < 10;
      case '10-0':
      case '10+':
        return durationInMinutes >= 10;
      default:
        return true;
    }
  });
};

const mapContainerStyle = {
  width: '100%',
  height: '240px',
};

const defaultMapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

const circleOptions = {
  strokeColor: '#3B82F6',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#3B82F6',
  fillOpacity: 0.35,
};

const CombinedStoppageIdlingTable: React.FC = () => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';
  const showDriverName = uiSettings?.showDriverName ?? true;
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CombinedHaltReportData; direction: 'asc' | 'desc'; }>({ key: 'totalHaltTime', direction: 'desc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [intervalFilter, setIntervalFilter] = useState('0-0');
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'IDLING' | 'STOPPAGE'>('ALL');

  // Threshold filter states
  const [haltAboveValue, setHaltAboveValue] = useState<number>(0);
  const [haltAboveUnit, setHaltAboveUnit] = useState<'min' | 'hr'>('min');

  // Location Map & Add POI Dialog States
  const [selectedMapEvent, setSelectedMapEvent] = useState<{
    vehicleName: string;
    detail: CombinedHaltDetail;
  } | null>(null);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [newPoiName, setNewPoiName] = useState('');
  const [newPoiRadius, setNewPoiRadius] = useState('200');
  const [isSavingPoi, setIsSavingPoi] = useState(false);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Auth & API fetch for vehicle list
  const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
  const custId = auth.custId;

  useEffect(() => {
    if (!custId) return;
    fetch(`${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`)
      .then(async (res) => {
        const text = await res.text();
        if (!text) return [];
        return JSON.parse(text);
      })
      .then(data => {
        const vehicles = data?.data || [];
        const formatted = [
          { label: 'All Vehicles', value: 'all' },
          ...vehicles.map((v: any) => ({
            label: v.vehName,
            value: v.bbid
          }))
        ];
        setVehicleList(formatted);
      })
      .catch(err => console.error("Vehicle API error:", err));
  }, [custId]);

  // Aggregate Combined Data from base stoppageAnalysisData
  const processedData: CombinedHaltReportData[] = useMemo(() => {
    const minHaltSeconds = haltAboveUnit === 'min' ? haltAboveValue * 60 : haltAboveValue * 3600;

    const result = stoppageAnalysisData.map(vehicle => {
      const matchedVehicleInfo = actualVehicles.find(v => v.id === vehicle.vehicleId);
      const vehicleType = matchedVehicleInfo?.type || 'Truck';

      const combinedEvents: CombinedHaltDetail[] = vehicle.details.map(detail => {
        const isIdling = detail.ignitionOn;
        const fuelWasted = isIdling ? parseFloat(((detail.duration / 3600) * 0.6).toFixed(2)) : 0;
        return {
          ...detail,
          eventType: isIdling ? 'IDLING' : 'STOPPAGE',
          fuelWastedLiters: fuelWasted,
        };
      });

      let filtered = combinedEvents.filter(d => d.duration >= minHaltSeconds);

      if (eventTypeFilter === 'IDLING') {
        filtered = filtered.filter(d => d.eventType === 'IDLING');
      } else if (eventTypeFilter === 'STOPPAGE') {
        filtered = filtered.filter(d => d.eventType === 'STOPPAGE');
      }

      filtered = filterByInterval(filtered, intervalFilter);

      const stoppageEvents = filtered.filter(d => d.eventType === 'STOPPAGE');
      const idlingEvents = filtered.filter(d => d.eventType === 'IDLING');

      const totalStoppageTime = stoppageEvents.reduce((sum, d) => sum + d.duration, 0);
      const totalIdlingTime = idlingEvents.reduce((sum, d) => sum + d.duration, 0);
      const totalHaltTime = totalStoppageTime + totalIdlingTime;

      const totalFuelWasted = idlingEvents.reduce((sum, d) => sum + d.fuelWastedLiters, 0);
      const idlingRatio = totalHaltTime > 0 ? (totalIdlingTime / totalHaltTime) * 100 : 0;

      let totalTravelledKm = 0;
      const rawSegments: { type: 'moving' | 'idling' | 'stoppage'; rawSec: number; distance?: string; duration: string; location?: string; startDate?: string; stopDate?: string }[] = [];

      const sortedDetails = [...filtered].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      if (sortedDetails.length > 0) {
        sortedDetails.forEach((detail, index) => {
          if (index > 0) {
            const prevStop = new Date(sortedDetails[index - 1].stopDate).getTime();
            const currStart = new Date(detail.startDate).getTime();
            const moveSec = Math.max((currStart - prevStop) / 1000, 0);
            if (moveSec > 30) {
              const moveDist = parseFloat(((moveSec / 3600) * (35 + (index % 12))).toFixed(1));
              totalTravelledKm += moveDist;
              rawSegments.push({
                type: 'moving',
                rawSec: moveSec,
                distance: `${moveDist} km`,
                duration: formatDurationForReport(moveSec),
              });
            }
          } else {
            const leadMoveSec = 1800 + (index * 300);
            const moveDist = parseFloat(((leadMoveSec / 3600) * 40).toFixed(1));
            totalTravelledKm += moveDist;
            rawSegments.push({
              type: 'moving',
              rawSec: leadMoveSec,
              distance: `${moveDist} km`,
              duration: formatDurationForReport(leadMoveSec),
            });
          }

          rawSegments.push({
            type: detail.eventType === 'IDLING' ? 'idling' : 'stoppage',
            rawSec: detail.duration,
            duration: formatDurationForReport(detail.duration),
            location: detail.location,
            startDate: detail.startDate,
            stopDate: detail.stopDate,
          });
        });

        const trailMoveSec = 2400;
        const trailDist = parseFloat(((trailMoveSec / 3600) * 38).toFixed(1));
        totalTravelledKm += trailDist;
        rawSegments.push({
          type: 'moving',
          rawSec: trailMoveSec,
          distance: `${trailDist} km`,
          duration: formatDurationForReport(trailMoveSec),
        });
      }

      const totalRawSec = rawSegments.reduce((sum, s) => sum + s.rawSec, 0) || 1;
      const timelineSegments: TimelineSegment[] = rawSegments.map((seg) => {
        const pct = (seg.rawSec / totalRawSec) * 100;
        return {
          type: seg.type,
          width: `${pct.toFixed(2)}%`,
          distance: seg.distance,
          duration: seg.duration,
          location: seg.location,
          startDate: seg.startDate,
          stopDate: seg.stopDate,
        };
      });

      let status: 'OPTIMAL' | 'MODERATE IDLING' | 'CRITICAL IDLING' = 'OPTIMAL';
      if (idlingRatio > 30 || totalIdlingTime > 3600) status = 'CRITICAL IDLING';
      else if (idlingRatio > 15 || totalIdlingTime > 1800) status = 'MODERATE IDLING';

      return {
        vehicleId: vehicle.vehicleId,
        vehicleName: vehicle.vehicleName,
        vehicleType,
        driverName: vehicle.driverName,
        totalHaltTime,
        stoppageCount: stoppageEvents.length,
        totalStoppageTime,
        idlingCount: idlingEvents.length,
        totalIdlingTime,
        idlingRatio,
        totalFuelWasted: parseFloat(totalFuelWasted.toFixed(2)),
        totalDistanceKm: parseFloat(totalTravelledKm.toFixed(1)),
        timelineSegments,
        status,
        details: filtered,
      };
    }).filter(v => v.details.length > 0);

    return result;
  }, [haltAboveValue, haltAboveUnit, eventTypeFilter, intervalFilter]);

  const sortedData = useMemo(() => {
    let data = [...processedData];

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle || item.vehicleName.toLowerCase().includes(selectedVehicle.toLowerCase()));
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [processedData, selectedVehicle, sortConfig]);

  const handleSort = (key: keyof CombinedHaltReportData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const stats = useMemo(() => {
    const totalVehicles = sortedData.length;
    let totalHaltSec = 0;
    let totalStoppageSec = 0;
    let totalIdlingSec = 0;
    let criticalVehicles = 0;
    let totalFuel = 0;
    let totalFleetDistance = 0;

    sortedData.forEach(item => {
      totalHaltSec += item.totalHaltTime;
      totalStoppageSec += item.totalStoppageTime;
      totalIdlingSec += item.totalIdlingTime;
      totalFuel += item.totalFuelWasted;
      totalFleetDistance += item.totalDistanceKm;
      if (item.status === 'CRITICAL IDLING') criticalVehicles++;
    });

    const fleetIdlingRatio = totalHaltSec > 0 ? ((totalIdlingSec / totalHaltSec) * 100).toFixed(1) : '0';

    return {
      totalVehicles,
      totalHaltSec,
      totalStoppageSec,
      totalIdlingSec,
      totalFuel: totalFuel.toFixed(2),
      totalFleetDistance: totalFleetDistance.toFixed(1),
      criticalVehicles,
      fleetIdlingRatio,
      totalFleetIdlingTime: totalIdlingSec
    };
  }, [sortedData]);

  const generateExportData = () => {
    return sortedData.map(row => {
      const record: Record<string, any> = {
        'Vehicle No': row.vehicleName,
      };
      if (showDriverName) {
        record['Driver Name'] = row.driverName || 'N/A';
      }
      return {
        ...record,
        'Distance Travelled (km)': `${row.totalDistanceKm} km`,
        'Total Halt Time': formatDurationForReport(row.totalHaltTime),
        'Stoppage Count (Engine OFF)': row.stoppageCount,
        'Stoppage Duration': formatDurationForReport(row.totalStoppageTime),
        'Idling Count (Engine ON)': row.idlingCount,
        'Idling Duration': formatDurationForReport(row.totalIdlingTime),
        'Idling Ratio (%)': `${row.idlingRatio.toFixed(1)}%`,
        'Est. Fuel Wasted (L)': `${row.totalFuelWasted} L`,
        'Fleet Idling Share (%)': `${((row.totalIdlingTime / (stats.totalFleetIdlingTime || 1)) * 100).toFixed(1)}%`,
        'Status': row.status,
      };
    });
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));
    doc.setFontSize(16);
    doc.text('Combined Stoppage & Idling Analysis Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy HH:mm')} | Monitored Vehicles: ${exportData.length}`, 14, 22);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 28 });
    doc.save(`combined-stoppage-idling-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `combined-stoppage-idling-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Location Map Dialog
  const handleLocationClick = (detail: CombinedHaltDetail, vehicleName: string) => {
    setSelectedMapEvent({ vehicleName, detail });
    setNewPoiName(detail.location.split(',')[0] || '');
    setNewPoiRadius('200');
    setIsMapDialogOpen(true);
  };

  // Add POI Backend Request Function (similar to handleCreatePoi in AddPoi.tsx)
  const handleCreatePoiFromDialog = async () => {
    if (!newPoiName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the POI.", variant: "destructive" });
      return;
    }

    if (!selectedMapEvent) return;

    setIsSavingPoi(true);
    const coords = getLocationCoords(selectedMapEvent.detail.location);

    try {
      const authData = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
      const payload = {
        CustId: authData?.custId || 0,
        lat: coords.lat.toString(),
        longi: coords.lng.toString(),
        location: newPoiName.trim(),
        radius: newPoiRadius,
        poiName: newPoiName.trim()
      };

      const response = await fetch(`${API_BASE_URL}/Geofence/AddPOI`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (response.ok) {
        selectedMapEvent.detail.poiLocation = newPoiName.trim();
        toast({ variant: "success", title: "Success", description: result.message || "POI added successfully" });
        setIsMapDialogOpen(false);
      } else {
        toast({ title: "Error", description: result.message || "Failed to add POI", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Unable to connect to server", variant: "destructive" });
    } finally {
      setIsSavingPoi(false);
    }
  };

  const mapCenter = selectedMapEvent ? getLocationCoords(selectedMapEvent.detail.location) : { lat: 19.0760, lng: 72.8777 };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <div className="space-y-4">
        {/* 📊 KPI CARDS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Monitored Vehicles */}
          <Card className="p-3.5 shadow-sm border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Vehicles</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalVehicles}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Monitored Fleet</p>
          </Card>

          {/* Total Stationary Time */}
          <Card className="p-3.5 shadow-sm border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Halt Time</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{formatDurationForReport(stats.totalHaltSec)}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Combined Stationary</p>
          </Card>

          {/* Stoppages (Ignition OFF) */}
          <Card className="p-3.5 shadow-sm border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Engine OFF Time</span>
              <PauseCircle className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatDurationForReport(stats.totalStoppageSec)}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Productive Halts</p>
          </Card>

          {/* Idling (Ignition ON) */}
          <Card className="p-3.5 shadow-sm border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between text-amber-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Engine Idle Time</span>
              <Flame className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{formatDurationForReport(stats.totalIdlingSec)}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.fleetIdlingRatio}% of total halt</p>
          </Card>

          {/* Critical Idling Vehicles */}
          <Card className="p-3.5 shadow-sm border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Critical Idling</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalVehicles}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">High Fuel Waste Risk</p>
          </Card>

          {/* Est Fuel Wasted */}
          <Card className="p-3.5 shadow-sm border-red-500/30 bg-card">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Est. Wasted Fuel</span>
              <Fuel className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalFuel} L</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Engine Idle Loss</p>
          </Card>
        </div>

        {/* 🛠️ MAIN CARD WRAPPER & TOOLBAR */}
        <Card className="shadow-sm overflow-hidden border">
          <CardHeader className="flex flex-col gap-3 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground">Combined Stoppage & Idling Report</CardTitle>
                <CardDescription className="mt-0.5">
                  Comprehensive overview of vehicle halt events, engine idle fuel loss, and chronological timeline.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
                <VehicleCombobox
                  vehicles={vehicleList.length > 0 ? vehicleList : [{ label: 'All Vehicles', value: 'all' }]}
                  value={selectedVehicle}
                  onChange={(value) => {
                    setSelectedVehicle(value);
                    setPage(0);
                  }}
                  className="w-full sm:w-[180px]"
                />

                <DateRangePicker date={date} setDate={setDate} />

                <Select value={eventTypeFilter} onValueChange={(val: 'ALL' | 'IDLING' | 'STOPPAGE') => setEventTypeFilter(val)}>
                  <SelectTrigger className="w-full sm:w-[170px] bg-background text-xs font-medium">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {eventTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ChevronsUpDown className="h-4 w-4" /> Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSort('totalHaltTime')} className="text-xs">
                      Total Halt Duration {sortConfig.key === 'totalHaltTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('totalIdlingTime')} className="text-xs">
                      Idling Time {sortConfig.key === 'totalIdlingTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('totalFuelWasted')} className="text-xs">
                      Fuel Wasted {sortConfig.key === 'totalFuelWasted' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('vehicleName')} className="text-xs">
                      Vehicle Name {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPDF} className="text-xs">
                      <FileText className="mr-2 h-4 w-4" /> Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV} className="text-xs">
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Export as Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <WhatsappPopup />
              </div>
            </div>

            {/* SECONDARY FILTER STRIP (SHOW HALTS ABOVE THRESHOLD & DURATION FILTER) */}
            <div className="flex items-center justify-end gap-3 border-t pt-2.5 mt-1 flex-wrap">
              <Select value={intervalFilter} onValueChange={setIntervalFilter}>
                <SelectTrigger className="w-auto min-w-[150px] bg-background text-xs font-medium h-8">
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Duration: {intervalOptions.find(o => o.value === intervalFilter)?.label || intervalFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  {intervalOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-md border text-xs">
                <Label htmlFor="halt-above" className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                  Show Halts above
                </Label>
                <div className="flex h-7 items-center rounded border bg-backg round">
                  <Input
                    id="halt-above"
                    type="number"
                    value={haltAboveValue}
                    onChange={(e) => setHaltAboveValue(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)}
                    className="w-12 border-0 bg-transparent h-full text-xs text-center focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                  <div className="w-[1px] h-3.5 bg-border"></div>
                  <Select value={haltAboveUnit} onValueChange={(val: 'min' | 'hr') => setHaltAboveUnit(val)}>
                    <SelectTrigger className="h-full border-0 bg-transparent text-xs focus:ring-0 focus:ring-offset-0 w-[55px] px-1.5 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="min">min</SelectItem>
                      <SelectItem value="hr">hr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col gap-3">
              {paginatedData.length === 0 && (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No stoppage or idling records found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                  </div>
                </div>
              )}

              {paginatedData.map((row) => {
                const isExpanded = expandedRows.has(row.vehicleId);
                const isCritical = row.status === 'CRITICAL IDLING';
                const isWarning = row.status === 'MODERATE IDLING';

                return (
                  <div key={row.vehicleId} className="group">
                    <div
                      className={cn(
                        "relative bg-card border rounded-xl transition-all duration-300 overflow-hidden",
                        "hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50",
                        isExpanded
                          ? "border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none"
                          : "shadow-sm",
                        isCritical && "border-red-500/40",
                        isWarning && !isExpanded && "border-amber-500/30"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-xl transition-all duration-300",
                          isCritical
                            ? "bg-gradient-to-b from-red-500 to-red-600"
                            : isWarning
                              ? "bg-gradient-to-b from-amber-500 to-amber-600"
                              : isExpanded
                                ? "bg-gradient-to-b from-blue-500 to-blue-600"
                                : "bg-gradient-to-b from-emerald-400 to-emerald-600 group-hover:from-blue-400 group-hover:to-blue-500"
                        )}
                      />

                      <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                        <VehicleIconBadge vehicleType={row.vehicleType} />

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                            {row.vehicleName}
                          </h3>
                          {showDriverName && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                              Driver: {row.driverName || 'Unassigned'}
                            </p>
                          )}
                        </div>

                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                            Total Halt Time
                          </span>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-xl sm:text-2xl font-extrabold tabular-nums leading-tight text-foreground">
                              {formatDurationForReport(row.totalHaltTime)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {row.details.length} total halts
                          </span>
                        </div>

                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-tight">
                            Stoppage (OFF)
                          </span>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">
                              {formatDurationForReport(row.totalStoppageTime)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {row.stoppageCount} stops
                          </span>
                        </div>

                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-tight">
                            Idling (ON)
                          </span>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-tight">
                              {formatDurationForReport(row.totalIdlingTime)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {row.idlingCount} idles ({row.idlingRatio.toFixed(0)}%)
                          </span>
                        </div>

                        <div className="hidden md:flex flex-col items-end mr-2">
                          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest leading-tight">
                            Fuel Wasted
                          </span>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 tabular-nums leading-tight">
                              {row.totalFuelWasted}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">L</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Est. idle loss
                          </span>
                        </div>


                        <button
                          onClick={() => toggleRow(row.vehicleId)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-1",
                            isExpanded
                              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                              : "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          )}
                        >
                          <span className="hidden sm:inline">Detailed Log</span>
                          <span className="sm:hidden">Details</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </div>

                      {/* 🛣️ VEHICLE TRAVELLED DISTANCE TIMELINE BAR LINE (SIMILAR TO DISTANCEREPORT2) */}
                      <div className="px-4 sm:px-6 pb-3 pt-2 border-t border-border/40 flex flex-col gap-1.5 bg-muted/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Route className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Travelled Distance:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.totalDistanceKm.toFixed(1)} km</span>
                            <span className="text-[11px] text-muted-foreground ml-1 font-normal">(with halts & idling timeline)</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Moving ({row.totalDistanceKm.toFixed(1)} km)</span>
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Idling (Engine ON)</span>
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Stoppage (Engine OFF)</span>
                          </div>
                        </div>

                        {/* Multi-color Timeline Segment Progress Bar */}
                        <div className="flex h-2 w-full overflow-visible rounded-full bg-slate-100 dark:bg-slate-800 relative shadow-2xs">
                          {row.timelineSegments.map((segment, idx) => (
                            <SegmentTooltip
                              key={idx}
                              segment={segment}
                              isFirst={idx === 0}
                              isLast={idx === row.timelineSegments.length - 1}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border border-t-0 rounded-b-xl bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5 shadow-inner">
                        <div className="flex items-center justify-between mb-3 border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                              Event Log for {row.vehicleName}
                            </h4>
                            <span className="text-xs text-muted-foreground">({row.details.length} events logged)</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Stoppage (Engine OFF)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Idling (Engine ON)
                            </span>
                          </div>
                        </div>

                        <div className="bg-card border rounded-lg overflow-hidden shadow-2xs">
                          <Table>
                            <TableHeader className="bg-muted/40">
                              <TableRow>
                                <TableHead className="w-[40px] text-center text-xs">#</TableHead>
                                <TableHead className="text-xs">Event Type</TableHead>
                                <TableHead
                                  className="text-xs cursor-pointer"
                                  onClick={() => handleDetailsSort('startDate')}
                                >
                                  Start Time
                                </TableHead>
                                <TableHead className="text-xs">End Time</TableHead>
                                <TableHead
                                  className="text-xs cursor-pointer"
                                  onClick={() => handleDetailsSort('duration')}
                                >
                                  Duration
                                </TableHead>
                                <TableHead className="text-xs">After Idling / Status</TableHead>
                                <TableHead className="text-xs">Location</TableHead>
                                <TableHead className="text-xs">Fuel Wasted</TableHead>
                                <TableHead className="text-xs">POI Location</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {row.details
                                .slice()
                                .sort((a, b) => {
                                  const key = detailsSortConfig.key as keyof CombinedHaltDetail;
                                  const aVal = a[key];
                                  const bVal = b[key];
                                  if (aVal === undefined || bVal === undefined) return 0;
                                  if (aVal < bVal) return detailsSortConfig.direction === 'asc' ? -1 : 1;
                                  if (aVal > bVal) return detailsSortConfig.direction === 'asc' ? 1 : -1;
                                  return 0;
                                })
                                .map((detail, idx) => {
                                  const isIdling = detail.eventType === 'IDLING';
                                  const afterStatus = detail.afterIdlingStatus || (isIdling ? 'Vehicle Moved' : 'Ignition Switch Off');

                                  const formattedStart = formatAppDateTime(detail.startDate, timeFormat);
                                  const formattedStop = formatAppDateTime(detail.stopDate, timeFormat);

                                  return (
                                    <TableRow key={detail.id || idx} className="hover:bg-muted/50 text-xs">
                                      <TableCell className="text-center font-medium text-muted-foreground">
                                        {idx + 1}
                                      </TableCell>

                                      <TableCell>
                                        {isIdling ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1">
                                            <Flame className="h-3 w-3 text-amber-500" />
                                            Idling (Engine ON)
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 gap-1">
                                            <PauseCircle className="h-3 w-3 text-blue-500" />
                                            Stoppage (Engine OFF)
                                          </span>
                                        )}
                                      </TableCell>

                                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                                        {formattedStart}
                                      </TableCell>

                                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                                        {formattedStop}
                                      </TableCell>

                                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                                        {formatDurationForReport(detail.duration)}
                                      </TableCell>

                                      <TableCell className="whitespace-nowrap">
                                        {afterStatus === 'Vehicle Moved' ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                            <ArrowUpRight className="h-3 w-3" /> Vehicle Moved
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <PowerOff className="h-3 w-3" /> Ignition OFF
                                          </span>
                                        )}
                                      </TableCell>

                                      {/* CLICKABLE LOCATION LINK */}
                                      <TableCell className="max-w-[280px] truncate" title="Click to view location map and add POI">
                                        <button
                                          onClick={() => handleLocationClick(detail, row.vehicleName)}
                                          className="flex items-center gap-1.5 text-left text-primary hover:underline font-medium focus:outline-none group/loc"
                                        >
                                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover/loc:text-primary transition-colors" />
                                          <span className="truncate">{detail.location}</span>
                                        </button>
                                      </TableCell>

                                      <TableCell className="font-semibold whitespace-nowrap">
                                        {detail.fuelWastedLiters > 0 ? (
                                          <span className="text-red-600 dark:text-red-400">{detail.fuelWastedLiters} L</span>
                                        ) : (
                                          <span className="text-muted-foreground">0 L</span>
                                        )}
                                      </TableCell>

                                      <TableCell className="text-xs text-muted-foreground">
                                        {detail.poiLocation ? (
                                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-medium">
                                            {detail.poiLocation}
                                          </Badge>
                                        ) : (
                                          <span>N/A</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {sortedData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{page * rowsPerPage + 1}</span> to{' '}
                  <span className="font-medium text-foreground">
                    {Math.min((page + 1) * rowsPerPage, sortedData.length)}
                  </span>{' '}
                  of <span className="font-medium text-foreground">{sortedData.length}</span> vehicles
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows per page:</span>
                    <Select value={String(rowsPerPage)} onValueChange={(val) => { setRowsPerPage(Number(val)); setPage(0); }}>
                      <SelectTrigger className="h-8 w-[70px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
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
                      onClick={() => setPage(prev => Math.max(0, prev - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🗺️ REAL GOOGLE MAP & CREATE POI DIALOG */}
        {selectedMapEvent && (
          <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <MapIcon className="h-4 w-4 text-primary" />
                      <span>Location Details & Add POI ({selectedMapEvent.vehicleName})</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{selectedMapEvent.detail.location}</span>
                    </DialogDescription>
                  </div>
                  <div>
                    {selectedMapEvent.detail.eventType === 'IDLING' ? (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-medium">
                        <Flame className="h-3 w-3 mr-1 text-amber-500" /> Idling
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-medium">
                        <PauseCircle className="h-3 w-3 mr-1 text-blue-500" /> Stoppage
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20">
                {/* REAL GOOGLE MAP CONTAINER */}
                <div className="relative w-full h-[240px] rounded-xl overflow-hidden border shadow-sm bg-muted mb-4">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={15}
                    options={defaultMapOptions}
                  >
                    <Marker position={mapCenter} title={selectedMapEvent.detail.location} />
                    <Circle center={mapCenter} radius={parseInt(newPoiRadius) || 200} options={circleOptions} />
                  </GoogleMap>
                </div>

                {/* CREATE POI FORM INPUTS */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold mb-1 block">Point of Interest (POI) Name</Label>
                    <Input
                      placeholder="Enter POI name"
                      value={newPoiName}
                      onChange={(e) => setNewPoiName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs font-semibold mb-1 block">Radius (m)</Label>
                    <Select value={newPoiRadius} onValueChange={setNewPoiRadius}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 m</SelectItem>
                        <SelectItem value="100">100 m</SelectItem>
                        <SelectItem value="200">200 m</SelectItem>
                        <SelectItem value="500">500 m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-3 border-t bg-card flex items-center justify-between sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMapDialogOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleCreatePoiFromDialog}
                  disabled={isSavingPoi || !newPoiName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5"
                >
                  {isSavingPoi ? (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><PlusCircle className="h-4 w-4" /> Save Location as POI</span>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </LoadScript>
  );
};

export default CombinedStoppageIdlingTable;
