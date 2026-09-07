import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { actualVehicles } from '@/data/mockData';
import { useReportDownload, useVehicleList } from '@/hooks/useApi';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  User,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Navigation,
  ArrowRight,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { startOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { API_BASE_URL } from '@/config/Api';

type ReportDataKey = 'vehName' | 'driverName' | 'poisCovered';

const locationMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: true,
  gestureHandling: 'cooperative',
};

// --- Helper: Vehicle icon badge component ---
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

// --- Helper: Safe Date Formatter ---
const safeFormatDate = (value: string | Date | null | undefined) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return format(d, 'MMM dd, yyyy  hh:mm a');
  } catch {
    return String(value);
  }
};

const formatTimeOnly = (value: string | Date | null | undefined) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return format(d, 'hh:mm a');
  } catch {
    return String(value);
  }
};

const formatDateOnly = (value: string | Date | null | undefined) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return format(d, 'MMM dd, yyyy');
  } catch {
    return '';
  }
};

// --- Helper: Parse any duration into seconds ---
const parseItemDurationInSeconds = (d: any): number => {
  if (!d) return 0;

  // 1. Check direct duration properties
  const val =
    d.duration ??
    d.stayDuration ??
    d.stayTime ??
    d.totalStay ??
    d.totalTime ??
    d.diffTime ??
    d.travelTime ??
    d.transitTime;

  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return val;
  }

  if (val !== undefined && val !== null && val !== '') {
    const str = String(val).replace(/<[^>]+>/g, '').trim();

    if (str && str !== '0' && str !== '00:00:00' && str !== '00:00' && str !== '-') {
      // Check for day/hour/minute/second textual patterns (e.g., "1d 2h 15m 30s", "15m", "2 hrs 10 mins", "45 sec")
      const dMatch = str.match(/(\d+)\s*(?:d|day|days)/i);
      const hMatch = str.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/i);
      const mMatch = str.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
      const sMatch = str.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/i);

      if (dMatch || hMatch || mMatch || sMatch) {
        const days = dMatch ? parseInt(dMatch[1], 10) : 0;
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
        const seconds = sMatch ? parseInt(sMatch[1], 10) : 0;
        const totalSec = days * 86400 + hours * 3600 + minutes * 60 + seconds;
        if (totalSec > 0) return totalSec;
      }

      // Check colon format (HH:MM:SS or HH:MM or DD:HH:MM:SS)
      if (str.includes(':')) {
        const parts = str.split(':').map((p) => parseInt(p.trim(), 10) || 0);
        if (parts.length === 4) {
          return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
        }
        if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        if (parts.length === 2) {
          return parts[0] * 3600 + parts[1] * 60;
        }
      }

      // Check pure numeric value in string
      if (!isNaN(Number(str))) {
        const num = Number(str);
        if (num > 0) return num;
      }
    }
  }

  // 2. Fallback: calculate difference from intime and outTime timestamps
  const inVal = d.intime ?? d.inTime ?? d.startTime ?? d.entryTime;
  const outVal = d.outTime ?? d.outtime ?? d.exitTime ?? d.endTime;
  if (inVal && outVal) {
    const inD = new Date(inVal);
    const outD = new Date(outVal);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const diffSec = Math.floor((outD.getTime() - inD.getTime()) / 1000);
      if (diffSec > 0) return diffSec;
    }
  }

  return 0;
};

const calculateTotalStayDuration = (details: any[], row?: any) => {
  let totalSec = 0;
  if (Array.isArray(details) && details.length > 0) {
    details.forEach((d) => {
      totalSec += parseItemDurationInSeconds(d);
    });
  }

  if (totalSec === 0 && row) {
    const rowStay = row.totalStay ?? row.totalStayDuration ?? row.totalDuration ?? row.totalTime;
    if (rowStay) {
      totalSec = parseItemDurationInSeconds({ duration: rowStay });
    }
  }

  return formatSeconds(totalSec);
};

// --- Helper: Duration Formatters matching Ignition On/Off Analysis ---
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

const formatDetailDuration = (detail: any) => {
  const sec = parseItemDurationInSeconds(detail);
  if (sec > 0) {
    return formatSeconds(sec);
  }
  return formatIgnitionDuration(detail?.duration);
};

const formatIgnitionDuration = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '0s';

  if (typeof val === 'number') {
    return formatSeconds(val);
  }

  const str = String(val).replace(/<[^>]+>/g, '').trim();
  if (!str || str === '0' || str === '00:00:00' || str === '00:00') return '0s';

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

  const dMatch = str.match(/(\d+)\s*(?:d|day|days)/i);
  const hMatch = str.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/i);
  const mMatch = str.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
  const sMatch = str.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/i);

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

// --- Helper: Duration Parser ---
const parseDuration = (value: string) => {
  if (!value) {
    return {
      text: '0s',
      color: 'inherit',
    };
  }

  const colorMatch = value.match(/color=['"]?([^'">]+)['"]?/i);
  const text = formatIgnitionDuration(value);

  return {
    text: text || '0s',
    color: colorMatch?.[1] || 'inherit',
  };
};

interface EntryExitReportTableProps {
  initialMode?: 'entry-exit' | 'exit-entry';
}

const EntryExitReportTable: React.FC<EntryExitReportTableProps> = ({
  initialMode = 'entry-exit',
}) => {
  const [reportMode, setReportMode] = useState<'entry-exit' | 'exit-entry'>(initialMode);
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'intime', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'vehName', direction: 'asc' });

  useEffect(() => {
    if (initialMode) {
      setReportMode(initialMode);
    }
  }, [initialMode]);


  const { data: vehicleListData } = useVehicleList();
  const vehicleList = useMemo(
    () => [{ label: 'All Vehicles', value: 'all' }, ...(vehicleListData || [])],
    [vehicleListData]
  );
  const actualVehicles = vehicleListData || [];

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleLocationClick = (detail: any, vehicleName: string) => {
    setSelectedLocation({ ...detail, vehicleName });
    setIsLocationDialogOpen(true);
  };

  const handleSort = (key: ReportDataKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const authData = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
  const activeRType = reportMode === 'entry-exit' ? 'EntryExitReport' : 'ExitEntryReport';

  const request: DataTableRequestModel = {
    CustId: authData?.custId || 0,
    sEcho: 1,
    iDisplayStart: pagination.pageIndex * pagination.pageSize,
    iDisplayLength: pagination.pageSize,
    sSearch: '',
    sortColumn: sortConfig.key,
    sortDirection: sortConfig.direction,
    interval: '1',
    beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
    endDate: date?.to
      ? format(date.to, 'M/d/yyyy h:mm:ss a')
      : date?.from
        ? format(date.from, 'M/d/yyyy h:mm:ss a')
        : '',
    Status: '',
  };

  const { exportExcel: originalExportExcel, exportPdf: originalExportPdf } = useReportDownload(
    '/Reports/GetEntryExitReport',
    request,
    { rtype: activeRType }
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

  const loadData = async () => {
    try {
      setLoading(true);

      (request as any).rtype = activeRType;

      const params = new URLSearchParams();
      Object.entries(request).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      if (selectedVehicle && selectedVehicle !== 'all') {
        params.append('bbid', selectedVehicle);
      }

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetEntryExitReport?${params.toString()}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error('API Failed');

      const result = await response.json();
      setReportData(Array.isArray(result?.data) ? result.data : []);
      setTotalRecords(result?.count || 0);
    } catch (err) {
      console.error(err);
      setReportData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sortConfig,
    date,
    selectedVehicle,
    reportMode,
  ]);

  useEffect(() => {
    setPagination((prev) => {
      if (prev.pageIndex === 0) return prev;
      return { ...prev, pageIndex: 0 };
    });
  }, [selectedVehicle, date, sortConfig, reportMode]);

  const sortedData = useMemo(() => {
    const data = [...reportData];
    data.sort((a, b) => {
      let aVal: any = a[sortConfig.key] ?? (sortConfig.key === 'vehName' ? a.vehicleName : '');
      let bVal: any = b[sortConfig.key] ?? (sortConfig.key === 'vehName' ? b.vehicleName : '');
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [reportData, sortConfig]);

  const totalPages = Math.ceil(totalRecords / pagination.pageSize);
  const firstRowIndex =
    totalRecords === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRecords
  );

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
      loadingElement={<div className="w-full h-full" />}
    >
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
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 py-4 border-b bg-card">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              {reportMode === 'entry-exit'
                ? 'Geofence Entry / Exit Report'
                : 'Geofence Exit / Entry Report'}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {reportMode === 'entry-exit'
                ? 'Detailed breakdown of vehicles entering, staying, and exiting geofences.'
                : 'Detailed breakdown of vehicles exiting one geofence and traveling/entering another.'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            <DateRangePicker date={date} setDate={setDate} />
            <VehicleCombobox
              vehicles={vehicleList}
              value={selectedVehicle}
              onChange={setSelectedVehicle}
              className="w-full sm:w-[180px]"
            />


            {/* Sort Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('vehName')}>
                  Vehicle Name{' '}
                  {sortConfig.key === 'vehName' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('driverName')}>
                  Driver Name{' '}
                  {sortConfig.key === 'driverName' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('poisCovered')}>
                  {reportMode === 'entry-exit' ? 'Geofences Covered ' : 'Transit Legs '}
                  {sortConfig.key === 'poisCovered' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
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

            {/* WhatsApp Share */}
            <WhatsappPopup
              apiUrl="/Reports/GetEntryExitReport"
              requestPayload={request}
              extraPayload={{ rtype: activeRType }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-3">
            {sortedData.length === 0 && !loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                  <p className="text-lg font-medium">No records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {sortedData.map((row) => {
              const isExpanded = expandedRows.has(row.bbid);
              const vehicleName = row.vehName || row.vehicleName || 'Unknown Vehicle';
              const vehicle = actualVehicles.find(
                (v) =>
                  v.vehicleNo === vehicleName ||
                  v.vehicleName === vehicleName ||
                  v.regNo === vehicleName
              );
              const vehicleType = vehicle?.type || 'Truck';
              const details = row.poisCoveredList || row.poiList || row.details || [];
              const sortedDetails = [...details].sort((a, b) => {
                const key = detailsSortConfig.key as keyof typeof a;
                let aValue = a[key];
                let bValue = b[key];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return detailsSortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                  return detailsSortConfig.direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
                }
                return 0;
              });

              const driver =
                row.driverName && row.driverName !== 'undefined' ? row.driverName : 'NA';

              return (
                <div key={row.bbid} className="group">
                  <div
                    className={cn(
                      'relative bg-card border rounded-xl transition-all duration-300 overflow-hidden',
                      'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50',
                      isExpanded
                        ? 'border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none'
                        : 'shadow-sm'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300',
                        isExpanded
                          ? 'bg-gradient-to-b from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-blue-400 group-hover:to-indigo-500'
                      )}
                    />

                    <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-2.5 sm:py-3 pl-5 sm:pl-7">
                      <VehicleIconBadge vehicleType={vehicleType} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                          {vehicleName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                          {row.bbid}
                        </p>
                      </div>

                      <div className="hidden sm:flex flex-col items-end min-w-[110px]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Driver Name
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                            {driver}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          {reportMode === 'entry-exit' ? 'Geofences Covered' : 'Transit Legs'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full text-xs sm:text-sm border border-blue-200 dark:border-blue-800">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            {row.poisCovered ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block w-px h-10 bg-border mx-1" />

                      <button
                        onClick={() => toggleRow(row.bbid)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-1',
                          isExpanded
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                            : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        )}
                      >
                        <span className="hidden sm:inline">Detailed Log</span>
                        <span className="sm:hidden">Details</span>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform duration-300',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                    </div>

                    <div className="sm:hidden flex items-center justify-between px-6 pb-3 pl-7 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {driver}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {row.poisCovered ?? 0} {reportMode === 'entry-exit' ? 'Geofences' : 'Legs'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-3 sm:p-4">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                                <MapPin className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-foreground">
                                  {reportMode === 'entry-exit'
                                    ? `Geofence Stay Log: ${vehicleName}`
                                    : `Geofence Transit Log: ${vehicleName}`}
                                </h5>
                                <p className="text-[11px] text-muted-foreground">
                                  {reportMode === 'entry-exit'
                                    ? 'Detailed geofence entry, exit, and stay duration events.'
                                    : 'Detailed transit legs from geofence exit to subsequent geofence entry.'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Clock className="h-3 w-3" />
                                {reportMode === 'entry-exit' ? 'Total Stay: ' : 'Total Transit: '}
                                {calculateTotalStayDuration(sortedDetails, row)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Navigation className="h-3 w-3" />
                                {sortedDetails.length}{' '}
                                {reportMode === 'entry-exit' ? 'Geofence Event' : 'Transit Leg'}
                                {sortedDetails.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>

                          <ScrollArea className="h-[280px] sm:h-[300px] p-2.5 sm:p-3.5">
                            {sortedDetails.length > 0 ? (
                              <div className="relative pl-6 space-y-2 pb-1">
                                {sortedDetails.map((detail: any, idx: number) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === sortedDetails.length - 1;
                                  const cleanPoiName =
                                    detail.poiName?.replace(/<[^>]*>/g, '') ||
                                    'Unknown Location';
                                  const inDateStr = formatDateOnly(detail.intime);

                                  return (
                                    <div key={idx} className="relative">
                                      {!isFirst && <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700" />}
                                      {!isLast && <div className="absolute -left-[15px] top-1/2 -bottom-3 w-[2px] bg-slate-200 dark:bg-slate-700" />}
                                      <div className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-full z-10 shadow-sm flex items-center justify-center">
                                        <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                      </div>

                                      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3.5 py-2 shadow-xs hover:border-blue-300 dark:hover:border-blue-600/50 transition-colors">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                                          {/* Section 1: Entry & Exit Flow */}
                                          <div className="md:col-span-5 flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700">
                                                <span
                                                  className={cn(
                                                    'inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold border leading-tight',
                                                    reportMode === 'entry-exit'
                                                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                                  )}
                                                >
                                                  {reportMode === 'entry-exit' ? 'ENTRY' : 'EXIT'}
                                                </span>
                                                <span className="text-xs font-bold text-foreground font-mono">
                                                  {formatTimeOnly(detail.intime)}
                                                </span>
                                              </div>

                                              <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />

                                              <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700">
                                                <span
                                                  className={cn(
                                                    'inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold border leading-tight',
                                                    reportMode === 'entry-exit'
                                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                                      : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                                  )}
                                                >
                                                  {reportMode === 'entry-exit' ? 'EXIT' : 'ENTRY'}
                                                </span>
                                                <span className="text-xs font-bold text-foreground font-mono">
                                                  {formatTimeOnly(detail.outTime)}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium pl-0.5">
                                              <CalendarIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                              <span>{inDateStr || '-'}</span>
                                            </div>
                                          </div>

                                          {/* Section 2: Location */}
                                          <div className="md:col-span-4 flex flex-col gap-0.5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-2 md:pt-0 md:pl-3 min-w-0">
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block leading-none">
                                              {reportMode === 'entry-exit' ? 'Geofence / Location' : 'Connecting Geofences'}
                                            </span>
                                            <button
                                              type="button"
                                              className="group/loc flex items-center gap-1 text-left mt-0.5"
                                              title={cleanPoiName}
                                              onClick={() => handleLocationClick(detail, vehicleName)}
                                            >
                                              <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0 group-hover/loc:scale-110 transition-transform" />
                                              <span className="text-xs font-semibold text-foreground group-hover/loc:text-blue-600 dark:group-hover/loc:text-blue-400 truncate block">
                                                {cleanPoiName}
                                              </span>
                                            </button>
                                          </div>

                                          {/* Section 3: Duration */}
                                          <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-2 md:pt-0 md:pl-3 flex md:justify-end items-center">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                                                <Clock className="h-3.5 w-3.5" />
                                              </div>
                                              <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block leading-none">
                                                  {reportMode === 'entry-exit' ? 'Stay Duration' : 'Transit Duration'}
                                                </span>
                                                <span className="text-xs font-bold text-foreground font-mono block mt-0.5">
                                                  {formatDetailDuration(detail)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="bg-muted/60 p-4 rounded-full mb-3 border border-border/60">
                                  <Navigation className="h-6 w-6 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                  {reportMode === 'entry-exit'
                                    ? 'No geofence events recorded'
                                    : 'No transit events recorded'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {reportMode === 'entry-exit'
                                    ? 'No geofence entry/exit logs available for this vehicle in the selected period.'
                                    : 'No geofence exit/entry transit logs available for this vehicle in the selected period.'}
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

        {/* Map Dialog */}
        <Dialog
          open={isLocationDialogOpen}
          onOpenChange={(open) => {
            setIsLocationDialogOpen(open);
            if (!open) setIsInfoWindowOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-3xl w-full p-0">
            <DialogHeader className="p-6">
              <DialogTitle>Location On Map</DialogTitle>
              <DialogDescription>
                View the selected entry location and map details.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              {selectedLocation?.poiLat && selectedLocation?.poiLong ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <GoogleMap
                    mapContainerClassName="w-full h-[320px]"
                    center={{
                      lat: Number(selectedLocation.poiLat),
                      lng: Number(selectedLocation.poiLong),
                    }}
                    zoom={16}
                    options={locationMapOptions}
                  >
                    <Marker
                      position={{
                        lat: Number(selectedLocation.poiLat),
                        lng: Number(selectedLocation.poiLong),
                      }}
                      onMouseOver={() => setIsInfoWindowOpen(true)}
                    />
                    {isInfoWindowOpen && (
                      <InfoWindow
                        position={{
                          lat: Number(selectedLocation.poiLat),
                          lng: Number(selectedLocation.poiLong),
                        }}
                        onCloseClick={() => setIsInfoWindowOpen(false)}
                      >
                        <div
                          className="text-xs text-slate-900"
                          onMouseLeave={() => setIsInfoWindowOpen(false)}
                        >
                          <div className="font-semibold">Vehicle:</div>
                          <div>{selectedLocation?.vehicleName || 'Unknown'}</div>
                          <div className="mt-1 font-semibold">Location:</div>
                          <div>
                            {selectedLocation?.poiName?.replace(/<[^>]*>/g, '') ||
                              'Unknown location'}
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Location coordinates are not available for this POI.
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-end px-6 py-4 border-t">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                onClick={() => setIsLocationDialogOpen(false)}
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer & Pagination */}
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(value),
                });
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue placeholder={String(pagination.pageSize)} />
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
              {firstRowIndex}-{lastRowIndex} of {totalRecords}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: totalPages - 1 }))}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </LoadScript>
  );
};

export default EntryExitReportTable;