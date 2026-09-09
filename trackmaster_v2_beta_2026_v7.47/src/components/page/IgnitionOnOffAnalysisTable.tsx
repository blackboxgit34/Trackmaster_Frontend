import React, { useState, useEffect, useMemo } from 'react';
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronsUpDown,
  Power,
  Clock,
  User,
  MapPin,
  Flame,
  Activity,
  Zap,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, startOfDay, format, endOfDay } from 'date-fns';
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
import { API_BASE_URL } from '@/config/Api';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { useReportDownload, useVehicleList } from '@/hooks/useApi';
import { actualVehicles } from '@/data/mockData';
import { useSettings } from '@/context/SettingsContext';

type IgnitionDetail = {
  ignitionOnTime: string;
  ignitionOffTime: string;
  sLocation: string;
  eLocation: string;
  duration: string;
};

type IgnitionVehicle = {
  bbid: string;
  vehicleName: string;
  driverName: string;
  ignitionOnOffCounter: string;
  totalIgnitionTime: string;
  objIgnitionStatusReport: IgnitionDetail[];
};

type ReportDataKey =
  | 'vehicleName'
  | 'driverName'
  | 'ignitionOnOffCounter'
  | 'totalIgnitionTime';

const custId = JSON.parse(localStorage.getItem('trackmaster-auth') ?? '{}')?.custId;

// --- Vehicle icon badge helper component ---
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

// Safe date formatter helper
const safeFormatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, 'MMM dd, yyyy  hh:mm a');
  } catch {
    return dateStr;
  }
};

// Format ignition duration string or seconds/minutes into human readable format matching Total Halt Time (e.g. "1d 2h 15m 30s")
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

const formatIgnitionDuration = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '0s';

  if (typeof val === 'number') {
    return formatSeconds(val);
  }

  const str = String(val).trim();
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

const IgnitionOnOffAnalysisTable = () => {
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: new Date(),
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const { data: vehicleListData } = useVehicleList();
  const vehicleList = useMemo(() => {
    const list =
      vehicleListData && vehicleListData.length > 0
        ? vehicleListData
        : actualVehicles.map((v) => ({ label: v.name, value: v.id }));
    return [{ label: 'All Vehicles', value: 'all' }, ...list];
  }, [vehicleListData]);
  const [reportData, setReportData] = useState<IgnitionVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'vehicleName', direction: 'asc' });

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const getIgnitionReport = async () => {
    try {
      setLoading(true);
      const auth = JSON.parse(
        localStorage.getItem('trackmaster-auth') || '{}'
      );

      const lowerBand = page * rowsPerPage;
      const upperBand = rowsPerPage;
      const requestModel: DataTableRequestModel = {
        CustId: auth.custId,
        sEcho: 1,
        iDisplayStart: lowerBand,
        iDisplayLength: upperBand,
        sSearch: search?.trim() || '',
        sortColumn: 'vehicleName',
        sortDirection: 'asc',
      };

      const params = new URLSearchParams({
        CustId: String(requestModel.CustId),
        sEcho: String(requestModel.sEcho),
        iDisplayStart: String(requestModel.iDisplayStart),
        iDisplayLength: String(requestModel.iDisplayLength),
        sSearch: selectedVehicle !== 'all' ? selectedVehicle : '',
        sortColumn: requestModel.sortColumn || '',
        sortDirection: requestModel.sortDirection || '',
        beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
        endDate: date?.to
          ? format(date.to, 'M/d/yyyy h:mm:ss a')
          : date?.from
          ? format(date.from, 'M/d/yyyy h:mm:ss a')
          : '',
        bbid: selectedVehicle === 'all' ? 'null' : selectedVehicle,
        reportName: 'null',
      });
      const response = await fetch(
        `${API_BASE_URL}/Reports/GetConsolidatedIgnitionStatus?${params.toString()}`
      );
      const data = await response.json();
      setReportData(data?.aaData || []);
      setTotalRecords(data?.iTotalRecords || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getIgnitionReport();
  }, [page, rowsPerPage, selectedVehicle, date]);

  const handleSort = (key: ReportDataKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const data = [...reportData];
    data.sort((a, b) => {
      let aVal: any = a[sortConfig.key] ?? '';
      let bVal: any = b[sortConfig.key] ?? '';

      if (sortConfig.key === 'ignitionOnOffCounter') {
        aVal = parseInt(aVal, 10) || 0;
        bVal = parseInt(bVal, 10) || 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [reportData, sortConfig]);

  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const requestModel = {
    CustId: custId,
    sEcho: 1,
    sSearch: selectedVehicle !== 'all' ? selectedVehicle : '',
    sortColumn: 'vehicleName',
    sortDirection: 'asc',
  };

  const extraParams = {
    beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
    endDate: date?.to
      ? format(date.to, 'M/d/yyyy h:mm:ss a')
      : date?.from
      ? format(date.from, 'M/d/yyyy h:mm:ss a')
      : '',
    bbid: selectedVehicle === 'all' ? 'null' : selectedVehicle,
    reportName: 'null',
  };

  const { exportExcel, exportPdf } = useReportDownload(
    '/Reports/GetConsolidatedIgnitionStatus',
    requestModel,
    extraParams
  );

  const handlePdfExport = async () => {
    setLoading(true);
    try {
      await exportPdf();
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      await exportExcel();
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-xl font-bold text-foreground">
              Ignition On/Off Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of vehicle ignition cycles.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <DateRangePicker date={date} setDate={setDate} />
            <VehicleCombobox
              vehicles={vehicleList}
              value={selectedVehicle}
              onChange={(value) => {
                setSelectedVehicle(value);
                const p = new URLSearchParams(searchParams);
                p.delete('vehicle');
                setSearchParams(p, { replace: true });
              }}
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
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle Name{' '}
                  {sortConfig.key === 'vehicleName' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                {showDriverName && (
                  <DropdownMenuItem onClick={() => handleSort('driverName')}>
                    Driver Name{' '}
                    {sortConfig.key === 'driverName' &&
                      (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleSort('ignitionOnOffCounter')}>
                  Ignition On Count{' '}
                  {sortConfig.key === 'ignitionOnOffCounter' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('totalIgnitionTime')}>
                  Ignition Duration{' '}
                  {sortConfig.key === 'totalIgnitionTime' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                <DropdownMenuItem onClick={handlePdfExport}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExcelExport}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <WhatsappPopup />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {sortedData.length === 0 && !loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Power className="h-12 w-12 mx-auto mb-3 opacity-30 text-amber-500" />
                  <p className="text-lg font-medium">No ignition records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {sortedData.map((row) => {
              const isExpanded = expandedRows.has(row.bbid);
              const vehicle = actualVehicles.find(
                (v) => v.id === row.bbid || v.name === row.vehicleName
              );
              const vehicleType = vehicle?.type || 'Truck';
              const sortedDetails = row.objIgnitionStatusReport || [];

              return (
                <div key={row.bbid} className="group">
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
                          ? 'bg-gradient-to-b from-blue-500 to-amber-500'
                          : 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-blue-400 group-hover:to-amber-500'
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
                          {row.bbid}
                        </p>
                      </div>

                      {/* Driver Name Column */}
                      {showDriverName && (
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
                      )}

                      {/* Ignition On Count Column */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Ignition On Count
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full text-xs sm:text-sm border border-amber-500/20">
                            <Zap className="h-3 w-3" />
                            {row.ignitionOnOffCounter || '0'}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="hidden sm:block w-px h-10 bg-border mx-1" />

                      {/* Ignition On Duration Column */}
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Ignition Duration
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-extrabold tabular-nums leading-tight text-foreground">
                            {formatIgnitionDuration(row.totalIgnitionTime)}
                          </span>
                        </div>
                      </div>

                      {/* Details Toggle Button */}
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

                    {/* Mobile Summary Row */}
                    <div className="sm:hidden flex items-center justify-between px-6 pb-3 pl-7 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      {showDriverName && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {row.driverName || 'N/A'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {row.ignitionOnOffCounter || '0'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-bold text-foreground">
                            {formatIgnitionDuration(row.totalIgnitionTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timeline Details View */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <h5 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Power className="h-4 w-4 text-amber-500" />
                                Ignition Log: {row.vehicleName}
                              </h5>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Detailed ignition cycle breakdown for the selected period.
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {sortedDetails.length} Cycle{sortedDetails.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Timeline List */}
                          <ScrollArea className="h-[360px] p-4 sm:p-6">
                            {sortedDetails.length > 0 ? (
                              <div className="relative pl-6 space-y-4 pb-2">
                                {sortedDetails.map((detail, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === sortedDetails.length - 1;

                                  return (
                                    <div key={idx} className="relative">
                                      {/* Vertical Line */}
                                      {!isFirst && (
                                        <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}
                                      {!isLast && (
                                        <div className="absolute -left-[15px] top-1/2 -bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}

                                      {/* Indicator Node */}
                                      <div className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-full z-10 shadow-sm flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                      </div>

                                      {/* Cycle Card */}
                                      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 transition-colors">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start sm:items-center">
                                          {/* Section 1: Ignition Timestamps */}
                                          <div className="md:col-span-4 flex flex-col gap-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shrink-0">
                                                <Power className="h-3 w-3" /> ON
                                              </span>
                                              <span className="text-xs sm:text-sm font-bold text-foreground font-mono truncate">
                                                {safeFormatDate(detail.ignitionOnTime)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                                                <Power className="h-3 w-3" /> OFF
                                              </span>
                                              <span className="text-xs sm:text-sm font-bold text-foreground font-mono truncate">
                                                {safeFormatDate(detail.ignitionOffTime)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Section 2: Locations */}
                                          <div className="md:col-span-5 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-3 md:pt-0 md:pl-4">
                                            <div className="flex items-start gap-2">
                                              <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                              <div className="min-w-0 flex-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">
                                                  ON Location
                                                </span>
                                                <span
                                                  className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1"
                                                  title={detail.sLocation}
                                                >
                                                  {detail.sLocation || 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                              <MapPin className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                              <div className="min-w-0 flex-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">
                                                  OFF Location
                                                </span>
                                                <span
                                                  className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1"
                                                  title={detail.eLocation}
                                                >
                                                  {detail.eLocation || 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Section 3: Duration */}
                                          <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-3 md:pt-0 md:pl-4 flex md:justify-end items-center">
                                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center gap-2.5 border border-amber-200/60 dark:border-amber-800/40 w-full md:w-auto">
                                              <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-md shrink-0">
                                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                              </div>
                                              <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block leading-none">
                                                  Duration
                                                </span>
                                                <span className="text-xs sm:text-sm font-bold text-foreground truncate block mt-0.5">
                                                  {formatIgnitionDuration(detail.duration)}
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
                              <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-2">
                                  <Power className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">
                                  No ignition details available for this vehicle.
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
              {totalRecords === 0
                ? '0-0'
                : `${page * rowsPerPage + 1}-${Math.min(
                    (page + 1) * rowsPerPage,
                    totalRecords
                  )}`}{' '}
              of {totalRecords}
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
    </>
  );
};

export default IgnitionOnOffAnalysisTable;