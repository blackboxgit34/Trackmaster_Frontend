import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ChevronDown,
  ChevronsUpDown,
  TrendingUp,
  Gauge,
  Activity,
  FileSpreadsheet,
  FileText,
  User,
  MapPin,
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  Search,
  Route,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVehicleList, useReportDownload } from '@/hooks/useApi';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { API_BASE_URL } from '@/config/Api';
import OverspeedRouteMapDialog, { OverspeedModalData } from './OverspeedRouteMapDialog';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { LoadScript } from '@react-google-maps/api';
import { actualVehicles } from '@/data/mockData';
import type { VehicleSpeedSummary } from '@/types';

type ReportDataKey = keyof VehicleSpeedSummary;

// --- Vehicle Icon Badge ---
const VehicleIconBadge = ({ vehicleType }: { vehicleType: string }) => {
  const imageName = vehicleType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vehicleType}
      className="flex-shrink-0 w-12 h-12 object-contain drop-shadow-sm"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
};


// Safe date parser helper
const parseDetailDate = (dateStr: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
};

// Speed status badge renderer (Normal Speed & Overspeeding)
const renderSpeedSeverityBadge = (speed: number, overSpeedVal: number) => {
  const threshold = overSpeedVal > 0 ? overSpeedVal : 60;
  const isOverspeed = speed > threshold;

  if (!isOverspeed) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Normal Speed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
      <AlertTriangle className="h-3 w-3 text-red-500" /> Overspeeding
    </span>
  );
};

// Format duration string/seconds into human-readable format matching Ignition Duration (e.g. "1d 2h 15m 30s")
const formatSeconds = (totalSeconds: number) => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
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

const formatSpeedDuration = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '0s';

  if (typeof val === 'number') {
    return formatSeconds(val);
  }

  const str = String(val).trim();
  if (!str || str === '0' || str === '00:00:00' || str === '00:00') return '0s';

  // Handle "X Day(s) Y Hour(s) Z Minute(s) W Second(s)" backend format
  const lowerStr = str.toLowerCase();
  if (
    lowerStr.includes('hour') ||
    lowerStr.includes('minute') ||
    lowerStr.includes('second') ||
    lowerStr.includes('day')
  ) {
    const dayMatch = str.match(/(\d+)\s*Day/i);
    const hourMatch = str.match(/(\d+)\s*Hour/i);
    const minMatch = str.match(/(\d+)\s*Minute/i);
    const secMatch = str.match(/(\d+)\s*Second/i);

    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
    const seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

    const totalSec = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    return formatSeconds(totalSec);
  }

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      const totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      return formatSeconds(totalSec);
    }
    if (parts.length === 2) {
      const totalSec = parts[0] * 3600 + parts[1] * 60;
      return formatSeconds(totalSec);
    }
  }

  if (!isNaN(Number(str))) {
    const num = Number(str);
    return formatSeconds(num);
  }

  const dMatch = str.match(/(\d+)\s*d/i);
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  const sMatch = str.match(/(\d+)\s*s/i);

  if (dMatch || hMatch || mMatch || sMatch) {
    const days = dMatch ? parseInt(dMatch[1], 10) : 0;
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
    const seconds = sMatch ? parseInt(sMatch[1], 10) : 0;

    const totalSec = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    if (totalSec > 0) {
      return formatSeconds(totalSec);
    }
  }

  return str;
};

// Helper to parse duration string or seconds into total seconds
const parseDurationSeconds = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = String(val).trim();
  if (!str || str === '0' || str === '00:00:00' || str === '00:00') return 0;

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  }

  const dayMatch = str.match(/(\d+)\s*d(ay)?/i);
  const hourMatch = str.match(/(\d+)\s*h(our)?/i);
  const minMatch = str.match(/(\d+)\s*m(in)?/i);
  const secMatch = str.match(/(\d+)\s*s(ec)?/i);

  if (dayMatch || hourMatch || minMatch || secMatch) {
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
    const seconds = secMatch ? parseInt(secMatch[1], 10) : 0;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  const dMatch = str.match(/(\d+)\s*d/i);
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  const sMatch = str.match(/(\d+)\s*s/i);

  if (dMatch || hMatch || mMatch || sMatch) {
    const days = dMatch ? parseInt(dMatch[1], 10) : 0;
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
    const seconds = sMatch ? parseInt(sMatch[1], 10) : 0;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Format duration for individual log entries
const formatLogDuration = (durationVal: string | number | undefined | null): string => {
  if (durationVal === undefined || durationVal === null || durationVal === '') return '-';
  const sec = parseDurationSeconds(durationVal);
  if (sec > 0) return formatSeconds(sec);
  const formatted = formatSpeedDuration(durationVal);
  return formatted && formatted !== '0s' ? formatted : '0s';
};

// Format KM / distance for individual log entries
const formatLogKm = (
  kmVal: string | number | undefined | null,
  speed?: number,
  durationVal?: string | number | undefined | null
): string => {
  if (kmVal !== undefined && kmVal !== null && kmVal !== '') {
    if (typeof kmVal === 'number') {
      if (kmVal <= 0) return '0.00 km';
      return kmVal < 1 ? `${kmVal.toFixed(2)} km` : `${kmVal.toFixed(1)} km`;
    }
    const cleanStr = String(kmVal).trim();
    if (cleanStr.toLowerCase().endsWith('km')) return cleanStr;
    const parsed = parseFloat(cleanStr);
    if (!isNaN(parsed)) {
      if (parsed <= 0) return '0.00 km';
      return parsed < 1 ? `${parsed.toFixed(2)} km` : `${parsed.toFixed(1)} km`;
    }
    return `${cleanStr} km`;
  }

  // Fallback: calculate distance from speed (km/h) and duration (seconds) if available
  if (speed && speed > 0 && durationVal !== undefined && durationVal !== null && durationVal !== '') {
    const sec = parseDurationSeconds(durationVal);
    if (sec > 0) {
      const calcKm = (speed * sec) / 3600;
      return calcKm < 1 ? `${calcKm.toFixed(2)} km` : `${calcKm.toFixed(1)} km`;
    }
  }

  return '-';
};

const SpeedAnalysisTable = () => {
  const [searchTerm, setSearchText] = useState('');
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
  }>({
    key: 'vehicleName',
    direction: 'asc',
    sortColumn: 'vehname',
    sortDirection: 'asc',
  });

  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'dateTime',
    direction: 'desc',
  });

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: new Date(),
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOverspeedOnly, setShowOverspeedOnly] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status');
  const vehicleFromUrl = searchParams.get('vehicle');
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');

  const { data: vehicleOptions } = useVehicleList();
  const vehicleSearchOptions = useMemo(
    () => [{ label: 'All', value: 'all' }, ...(vehicleOptions ?? [])],
    [vehicleOptions]
  );

  const [speedData, setSpeedData] = useState<VehicleSpeedSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedLocation, setSelectedLocation] = useState<OverspeedModalData | null>(null);
  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);

  const authData = useMemo(() => JSON.parse(localStorage.getItem('trackmaster-auth') || '{}'), []);

  const requestModel: DataTableRequestModel = useMemo(
    () => ({
      sEcho: 1,
      CustId: authData?.custId || 0,
      iDisplayStart: page === 0 ? 0 : page * rowsPerPage + 1,
      iDisplayLength: (page + 1) * rowsPerPage,
      sSearch: searchTerm || '',
      sortColumn: sortConfig.sortColumn,
      sortDirection: sortConfig.sortDirection,
      Status: statusFromUrl || null,
      beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
      endDate: date?.to
        ? format(date.to, 'M/d/yyyy h:mm:ss a')
        : date?.from
          ? format(date.from, 'M/d/yyyy h:mm:ss a')
          : '',
    }),
    [authData?.custId, page, rowsPerPage, searchTerm, sortConfig, statusFromUrl, date]
  );

  const getSpeedAnalysis = async (reqModel: DataTableRequestModel): Promise<VehicleSpeedSummary[]> => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        mode: 'over',
        sEcho: String(reqModel.sEcho),
        CustId: String(reqModel.CustId),
        iDisplayStart: String(reqModel.iDisplayStart),
        iDisplayLength: String(reqModel.iDisplayLength),
        sSearch: selectedVehicle === 'all' ? '' : selectedVehicle,
        sortColumn: reqModel.sortColumn || '',
        sortDirection: reqModel.sortDirection || '',
        Status: reqModel.Status || '',
        beginDate: reqModel.beginDate || '',
        endDate: reqModel.endDate || '',
      });

      const response = await fetch(`${API_BASE_URL}/Reports/getSpeedReport?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setTotalRecords(Number(result.iTotalRecords || 0));

      const rows = Array.isArray(result?.aaData?.oSmainLst) ? result.aaData.oSmainLst : [];
      return rows.map((item: any) => ({
        vehicleId: item.bbid,
        vehicleName: item.vehName,
        driverName: item.driverName,
        overSpeedVal: Number(item.overSpeedVal ?? 0),
        overspeedCount: Number(item.overspeedCount ?? 0),
        maxSpeed: Number(item.maxSpeed ?? 0),
        avgSpeed: item.overspeedCount > 0 ? parseFloat((item.totalSpeed / item.overspeedCount).toFixed(1)) : 0,
        totalOverspeedDuration: item.overSpeedDuration ?? '',

        details: Array.isArray(item.oSsublst)
          ? item.oSsublst.map((log: any, index: number, arr: any[]) => {
              let rawDuration =
                log.duration ??
                log.overSpeedDuration ??
                log.overspeedDuration ??
                log.dur ??
                log.durationOfOverspeeding ??
                log.timeDuration ??
                '';

              let rawKm =
                log.km ??
                log.distance ??
                log.overSpeedKm ??
                log.overspeedKm ??
                log.travelledKm ??
                log.totalDistance ??
                log.odoDistance ??
                '';

              // If duration not explicitly provided on the log
              if ((rawDuration === '' || rawDuration === 0 || rawDuration === '0') && item.overspeedCount === 1 && item.overSpeedDuration) {
                rawDuration = item.overSpeedDuration;
              } else if ((rawDuration === '' || rawDuration === 0 || rawDuration === '0') && arr.length > 1) {
                // If adjacent logs exist within same continuous burst
                const curTime = new Date(log.dateTime).getTime();
                const nextLog = arr[index + 1];
                const prevLog = arr[index - 1];
                if (nextLog) {
                  const nextTime = new Date(nextLog.dateTime).getTime();
                  const diffSec = Math.abs(nextTime - curTime) / 1000;
                  if (diffSec > 0 && diffSec <= 600) {
                    rawDuration = diffSec;
                  }
                } else if (prevLog) {
                  const prevTime = new Date(prevLog.dateTime).getTime();
                  const diffSec = Math.abs(curTime - prevTime) / 1000;
                  if (diffSec > 0 && diffSec <= 600) {
                    rawDuration = diffSec;
                  }
                }
              }

              // If km is not explicitly provided on the log, calculate from speed and duration if available
              if ((rawKm === '' || rawKm === 0 || rawKm === '0') && Number(log.speed) > 0 && rawDuration) {
                const sec = parseDurationSeconds(rawDuration);
                if (sec > 0) {
                  rawKm = (Number(log.speed) * sec) / 3600;
                }
              }

              return {
                id: index,
                dateTime: log.dateTime,
                location: log.location ?? '',
                latitude: Number(log.latitude ?? log.lat ?? 0),
                longitude: Number(log.longitude ?? log.lng ?? 0),
                speed: Number(log.speed ?? 0),
                duration: rawDuration,
                km: rawKm,
              };
            })
          : [],
      }));
    } catch (error) {
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getSpeedAnalysis(requestModel);
      setSpeedData(data);
    };

    fetchData();
  }, [requestModel, selectedVehicle]);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    let sortCol = key as string;
    if (key === 'vehicleName') sortCol = 'vehname';

    setSortConfig({
      key,
      direction,
      sortColumn: sortCol,
      sortDirection: direction,
    });
    setPage(0);
  };

  const filteredData = useMemo(() => {
    let data = speedData;

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter((item) => item.vehicleId === selectedVehicle);
    }

    if (showOverspeedOnly) {
      data = data.filter((item) => item.overspeedCount > 0);
    }

    if (filterSearchTerm.trim()) {
      const query = filterSearchTerm.toLowerCase().trim();
      data = data.filter(
        (item) =>
          item.vehicleName.toLowerCase().includes(query) ||
          item.vehicleId.toLowerCase().includes(query) ||
          (item.driverName && item.driverName.toLowerCase().includes(query)) ||
          item.details.some((d) => d.location && d.location.toLowerCase().includes(query))
      );
    }

    return data;
  }, [speedData, selectedVehicle, showOverspeedOnly, filterSearchTerm]);

  const handleOpenLiveLocation = (vehicle: VehicleSpeedSummary, detail: any) => {
    setSelectedLocation({
      vehicleId: vehicle.vehicleId,
      vehicleName: vehicle.vehicleName,
      driverName: vehicle.driverName,
      overSpeedVal: vehicle.overSpeedVal || 60,
      selectedDetail: {
        id: detail.id,
        dateTime: detail.dateTime,
        location: detail.location,
        latitude: detail.latitude,
        longitude: detail.longitude,
        speed: detail.speed,
        duration: detail.duration,
        km: detail.km,
      },
      allDetails: vehicle.details || [],
    });

    setIsLiveLocationOpen(true);
  };

  const { exportExcel: originalExportExcel, exportPdf: originalExportPdf } = useReportDownload(
    '/Reports/getSpeedReport',
    requestModel,
    { mode: 'over' }
  );

  const exportExcel = async () => {
    try {
      setLoading(true);
      await originalExportExcel();
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    try {
      setLoading(true);
      await originalExportPdf();
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const firstRowIndex = totalRecords === 0 ? 0 : page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, totalRecords);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div className="relative bg-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-scaleIn">
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
            <span className="text-sm font-medium">Please wait...</span>
          </div>
        </div>
      )}

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Speed Analysis</CardTitle>
            <CardDescription>Detailed breakdown of vehicle speed events.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {/* Quick Text Filter */}
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search driver, vehicle..."
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <DateRangePicker date={date} setDate={setDate} />
            <VehicleCombobox
              vehicles={vehicleSearchOptions}
              value={selectedVehicle}
              onChange={(value) => {
                setSelectedVehicle(value);
                if (value === 'all') {
                  setSearchText('');
                } else {
                  setSearchText(value);
                }
                setPage(0);
                const p = new URLSearchParams(searchParams);
                p.delete('vehicle');
                setSearchParams(p, { replace: true });
              }}
              className="w-full sm:w-[180px]"
            />
            <div className="flex items-center space-x-2 bg-muted/40 px-3 py-1.5 rounded-lg border">
              <Switch id="overspeed-only" checked={showOverspeedOnly} onCheckedChange={setShowOverspeedOnly} />
              <Label htmlFor="overspeed-only" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                Over-speeding Only
              </Label>
            </div>

            {/* Sort Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle Name {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('driverName')}>
                  Driver Name {sortConfig.key === 'driverName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('overspeedCount')}>
                  Overspeed Count {sortConfig.key === 'overspeedCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('totalOverspeedDuration')}>
                  Total Duration {sortConfig.key === 'totalOverspeedDuration' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('maxSpeed')}>
                  Max Speed {sortConfig.key === 'maxSpeed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('avgSpeed')}>
                  Avg Speed {sortConfig.key === 'avgSpeed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportPdf}>
                  <FileText className="mr-2 h-4 w-4" /> Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <WhatsappPopup />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {filteredData.length === 0 && !loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Gauge className="h-12 w-12 mx-auto mb-3 opacity-30 text-red-500" />
                  <p className="text-lg font-medium">No speed analysis records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {filteredData.map((row) => {
              const isExpanded = expandedRows.has(row.vehicleId);
              const vehicle = actualVehicles.find(
                (v) => v.id === row.vehicleId || v.name === row.vehicleName
              );
              const vehicleType = vehicle?.type || 'Truck';

              const sortedDetails = [...row.details].sort((a, b) => {
                const key = detailsSortConfig.key as keyof typeof a;
                let aValue = a[key];
                let bValue = b[key];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return detailsSortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                  return detailsSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
              });

              return (
                <div key={row.vehicleId} className="group">
                  {/* Main Card View */}
                  <div
                    className={cn(
                      'relative bg-card border rounded-xl transition-all duration-300 overflow-hidden',
                      'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50',
                      isExpanded
                        ? 'border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none'
                        : 'shadow-sm'
                    )}
                  >
                    {/* Left Accent Indicator */}
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300',
                        isExpanded
                          ? 'bg-gradient-to-b from-red-500 to-amber-500'
                          : row.overspeedCount > 0
                            ? 'bg-gradient-to-b from-red-400 to-amber-400'
                            : 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-red-400 group-hover:to-amber-500'
                      )}
                    />

                    <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                      {/* Vehicle Icon */}
                      <VehicleIconBadge vehicleType={vehicleType} />

                      {/* Vehicle Header Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                          {row.vehicleName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                          {row.vehicleId}
                        </p>
                      </div>

                      {/* Driver Name Column */}
                      <div className="hidden sm:flex flex-col items-end min-w-[110px]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Driver Name
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                            {row.driverName || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Overspeed Count Column */}
                      <div className="hidden sm:flex flex-col items-end min-w-[90px]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Overspeed Count
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <AlertTriangle
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              row.overspeedCount > 0 ? 'text-red-500' : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'text-sm font-bold tabular-nums',
                              row.overspeedCount > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-foreground'
                            )}
                          >
                            {row.overspeedCount}
                          </span>
                        </div>
                      </div>

                      {/* Total Duration Column */}
                      <div className="hidden sm:flex flex-col items-end min-w-[90px]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Total Duration
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold text-foreground truncate">
                            {formatSpeedDuration(row.totalOverspeedDuration)}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="hidden sm:block w-px h-10 bg-border mx-1" />

                      {/* Max Speed Column */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Max Speed
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span
                            className={cn(
                              'text-xl sm:text-2xl font-bold tabular-nums leading-tight',
                              row.maxSpeed > row.overSpeedVal && row.overSpeedVal > 0
                                ? 'text-red-500'
                                : 'text-foreground'
                            )}
                          >
                            {row.maxSpeed.toFixed(1)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">km/h</span>
                        </div>
                      </div>

                      {/* Avg Speed Column */}
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Avg Speed
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                            {row.avgSpeed.toFixed(1)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">km/h</span>
                        </div>
                      </div>


                      {/* Details Toggle Button */}
                      <button
                        onClick={() => toggleRow(row.vehicleId)}
                        disabled={!row.details || row.details.length === 0}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-1',
                          row.details && row.details.length > 0
                            ? isExpanded
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                              : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'opacity-40 cursor-not-allowed text-muted-foreground'
                        )}
                      >
                        <span className="hidden sm:inline">
                          {row.details && row.details.length > 0 ? 'Detailed Log' : 'No Logs'}
                        </span>
                        <span className="sm:hidden">Details</span>
                        {row.details && row.details.length > 0 && (
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-300',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        )}
                      </button>
                    </div>

                    {/* Mobile Summary Row */}
                    <div className="sm:hidden flex items-center justify-between px-6 pb-3 pl-7 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {row.driverName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            {row.overspeedCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-bold text-foreground">
                            {formatSpeedDuration(row.totalOverspeedDuration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-bold text-foreground">
                            {row.maxSpeed.toFixed(1)} km/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timeline / Details View */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-[850px] opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Details Card Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <h5 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-red-500" />
                                Speed Log: {row.vehicleName}
                              </h5>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Detailed speed events breakdown for the selected timeframe.
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                              {sortedDetails.length} Event{sortedDetails.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Summary Mini Cards */}
                          <div className="p-4 bg-muted/20 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3">
                              <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-lg shrink-0">
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                                  Overspeed Count
                                </div>
                                <div className="text-base sm:text-lg font-bold text-foreground leading-tight">
                                  {row.overspeedCount} <span className="text-xs font-normal text-muted-foreground">times</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3">
                              <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg shrink-0">
                                <Clock className="h-4 w-4 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                                  Total Duration
                                </div>
                                <div className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                                  {formatSpeedDuration(row.totalOverspeedDuration)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3">
                              <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg shrink-0">
                                <Gauge className="h-4 w-4 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                                  Max Speed
                                </div>
                                <div className="text-base sm:text-lg font-bold text-red-500 leading-tight">
                                  {row.maxSpeed.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km/h</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3">
                              <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg shrink-0">
                                <Activity className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                                  Average Speed
                                </div>
                                <div className="text-base sm:text-lg font-bold text-foreground leading-tight">
                                  {row.avgSpeed.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km/h</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline Log Section (Matching FuelFillingReportTable) */}
                          <ScrollArea className="h-[360px] p-4 sm:p-6">
                            {sortedDetails.length > 0 ? (
                              <div className="relative pl-6 space-y-3 pb-2">
                                {sortedDetails.map((detail, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === sortedDetails.length - 1;
                                  const dateObj = parseDetailDate(detail.dateTime);
                                  const threshold = row.overSpeedVal > 0 ? row.overSpeedVal : 60;
                                  const isOverspeed = detail.speed > threshold;

                                  return (
                                    <div key={detail.id || idx} className="relative">
                                      {/* Timeline connection lines */}
                                      {!isFirst && (
                                        <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}
                                      {!isLast && (
                                        <div className="absolute -left-[15px] top-1/2 -bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}

                                      {/* Timeline Dot */}
                                      <div
                                        className={cn(
                                          'absolute -left-[20px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white dark:bg-slate-900 border-2 rounded-full z-10 shadow-sm flex items-center justify-center',
                                          isOverspeed ? 'border-red-500' : 'border-blue-500'
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full',
                                            isOverspeed ? 'bg-red-500' : 'bg-blue-500'
                                          )}
                                        />
                                      </div>

                                      {/* Timeline Card */}
                                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors py-3.5 px-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
                                          {/* Column 1: Time & Date */}
                                          <div className="lg:col-span-3 flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                              <span className="text-sm font-bold text-foreground font-mono">
                                                {dateObj ? format(dateObj, 'HH:mm:ss') : detail.dateTime || '-'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-5">
                                              <CalendarIcon className="h-3 w-3 shrink-0" />
                                              <span>{dateObj ? format(dateObj, 'dd MMM yyyy') : ''}</span>
                                            </div>
                                          </div>

                                          {/* Column 2: Location */}
                                          <div className="lg:col-span-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-3 md:pt-0 md:pl-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                              Recorded Location
                                            </span>
                                            <div
                                              className="font-medium text-xs sm:text-sm text-brand-blue dark:text-blue-400 cursor-pointer hover:underline flex items-start gap-1.5 group/loc transition-colors"
                                              onClick={() => handleOpenLiveLocation(row, detail)}
                                              title="Click to view route with overspeed path on map"
                                            >
                                              <MapPin
                                                className={cn(
                                                  'h-3.5 w-3.5 shrink-0 mt-0.5 transition-transform group-hover/loc:scale-125',
                                                  isOverspeed ? 'text-red-500' : 'text-blue-500'
                                                )}
                                              />
                                              <div dangerouslySetInnerHTML={{ __html: detail.location || 'N/A' }} />
                                            </div>
                                          </div>

                                          {/* Column 3: KM & Duration of Overspeeding */}
                                          <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700/60 pt-3 lg:pt-0 lg:pl-4 flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                                            {/* Duration of Overspeeding */}
                                            <div className="min-w-0">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                                Duration
                                              </span>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <Clock className={cn("h-3.5 w-3.5 shrink-0", isOverspeed ? "text-red-500" : "text-slate-400")} />
                                                <span className={cn("text-xs sm:text-sm font-bold font-mono", isOverspeed ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                                  {formatLogDuration(detail.duration)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Distance / KM */}
                                            <div className="min-w-0 border-l border-slate-200 dark:border-slate-700/60 pl-4 sm:pl-6">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                                Distance
                                              </span>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <Route className={cn("h-3.5 w-3.5 shrink-0", isOverspeed ? "text-red-500" : "text-blue-500")} />
                                                <span className={cn("text-xs sm:text-sm font-bold font-mono", isOverspeed ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                                  {formatLogKm(detail.km, detail.speed, detail.duration)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Column 4: Speed & Tiered Severity Status */}
                                          <div className="lg:col-span-2 text-right flex flex-col items-end justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700/60 pt-3 lg:pt-0 lg:pl-4">
                                            <div className="flex items-baseline gap-1">
                                              <span
                                                className={cn(
                                                  'text-xl font-extrabold tabular-nums leading-none',
                                                  isOverspeed ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                                                )}
                                              >
                                                {detail.speed}
                                              </span>
                                              <span className="text-xs font-semibold text-muted-foreground">km/h</span>
                                            </div>
                                            <div className="mt-1">
                                              {renderSpeedSeverityBadge(detail.speed, row.overSpeedVal)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-2">
                                  <Gauge className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">
                                  No speed logs available for this vehicle.
                                </p>
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Footer & Pagination */}
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {totalRecords === 0 ? '0-0' : `${firstRowIndex}-${lastRowIndex}`} of {totalRecords}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Scoped Google Maps Script for Overspeed Route Modal */}
      {isLiveLocationOpen && (
        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={['places']}
          loadingElement={<div className="w-full h-full" />}
        >
          <OverspeedRouteMapDialog
            open={isLiveLocationOpen}
            onOpenChange={setIsLiveLocationOpen}
            data={selectedLocation}
          />
        </LoadScript>
      )}
    </>
  );
};

export default SpeedAnalysisTable;