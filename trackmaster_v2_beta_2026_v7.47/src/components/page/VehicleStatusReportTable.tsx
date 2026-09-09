import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  FileSpreadsheet,
  FileText,
  User,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Search,
  Activity,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusColorHex } from './LiveStatusTable';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useVehicleList, useReportDownload } from '@/hooks/useApi';
import { API_BASE_URL } from '@/config/Api';
import { actualVehicles, liveStatusData } from '@/data/mockData';
import { vehicleStatusHistoryData, type VehicleStatus } from '@/data/vehicleStatusHistoryData';
import { formatAppDateTime } from '@/lib/date-utils';
import { useSettings } from '@/context/SettingsContext';

export type StatusLogDetail = {
  id: string | number;
  dateTime: string;
  location: string;
  speed: number;
  status: VehicleStatus;
};

export type VehicleStatusSummary = {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  overspeed: number;
  bbid: string;
  vehicleType: string;
  eventsCount: number;
  currentStatus: string;
  details: StatusLogDetail[];
};

type ReportDataKey = 'vehicleName' | 'driverName' | 'currentStatus';

// --- Vehicle Icon Badge ---
const VehicleIconBadge = ({ vehicleType = 'Truck' }: { vehicleType?: string }) => {
  const imageName = (vehicleType || 'truck').toLowerCase().replace(/\s+/g, '-');
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

// Status badge renderer (matching LiveStatusTable status icons)
const minimalDotCache = new Map<string, string>();

export const formatLocation = (rawLocation: string | null | undefined): string => {
  if (!rawLocation) return '-';
  let str = String(rawLocation).trim();

  // 1. If HTML tags exist, extract inner text from <a>...</a> or strip tags
  if (/<[^>]+>/.test(str)) {
    const anchorMatch = str.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
    if (anchorMatch && anchorMatch[1]) {
      str = anchorMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      str = str.replace(/<[^>]+>/g, '').trim();
    }
  }

  // 2. If the string is a Google Maps URL, extract the query / coordinates
  if (str.includes('google.com/maps') || str.includes('maps.google.com')) {
    try {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`);
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (q) {
        str = decodeURIComponent(q).trim();
      }
    } catch {
      const qMatch = str.match(/[?&](?:q|query)=([^&]+)/i);
      if (qMatch && qMatch[1]) {
        str = decodeURIComponent(qMatch[1]).trim();
      }
    }
  }

  // If after extracting, it's still a URL starting with http:// or https://, clean it up
  if (/^https?:\/\//i.test(str)) {
    try {
      const url = new URL(str);
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (q) {
        str = decodeURIComponent(q).trim();
      }
    } catch {
      // fallback
    }
  }

  return str || '-';
};

const normalizeStatusInfo = (rawStatus: string | null | undefined): { label: string; color: string } => {
  const s = (rawStatus || '').toString().trim();
  const lower = s.toLowerCase();

  let label = s || 'Unknown';
  if (lower === 'moving') label = 'Moving';
  else if (['parked', 'stop', 'stopped'].includes(lower)) label = 'Parked';
  else if (['ignition on', 'ignition_on'].includes(lower)) label = 'Ignition On';
  else if (['idle', 'idling'].includes(lower)) label = 'Idle';
  else if (['high speed', 'hispeed', 'overspeed'].includes(lower)) label = 'High Speed';
  else if (lower === 'breakdown') label = 'Breakdown';
  else if (lower === 'unreachable') label = 'Unreachable';
  else if (['battery disconnect', 'battery_disconnect'].includes(lower)) label = 'Battery Disconnect';
  else if (lower === 'towed') label = 'Towed';

  const color = getStatusColorHex(label);
  return { label, color };
};

const StatusBadge = ({
  status,
  size = 'default',
}: {
  status: VehicleStatus | string;
  size?: 'sm' | 'default';
}) => {
  const { label, color } = normalizeStatusInfo(status);

  if (!minimalDotCache.has(label)) {
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
      label,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    );
  }

  const iconUrl = minimalDotCache.get(label)!;

  return (
    <div className="flex items-center gap-2">
      <img
        src={iconUrl}
        alt={label}
        className="h-5 w-5 shrink-0"
      />
      <span
        className={cn(
          'font-medium text-foreground',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}
      >
        {label}
      </span>
    </div>
  );
};

const SortableHeader = ({
  children,
  isSorted,
  sortDirection,
  onClick,
  className,
}: {
  children: React.ReactNode;
  isSorted?: boolean;
  sortDirection?: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) => (
  <TableHead
    className={cn(
      'cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group select-none',
      className
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-1.5">
      {children}
      {isSorted ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      )}
    </div>
  </TableHead>
);

const VehicleStatusReportTable = () => {
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'vehicleName',
    direction: 'asc',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');

  const { data: vehicleOptions } = useVehicleList();
  const vehicleSearchOptions = useMemo(
    () => [{ label: 'All Vehicles', value: 'all' }, ...(vehicleOptions ?? [])],
    [vehicleOptions]
  );

  const [statusData, setStatusData] = useState<VehicleStatusSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const authData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
    } catch {
      return {};
    }
  }, []);

  const requestModel = useMemo(
    () => ({
      sEcho: 1,
      CustId: authData?.custId || 0,
      iDisplayStart: page === 0 ? 0 : page * rowsPerPage + 1,
      iDisplayLength: (page + 1) * rowsPerPage,
      sSearch: selectedVehicle === 'all' ? '' : selectedVehicle,
      beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
      endDate: date?.to
        ? format(date.to, 'M/d/yyyy h:mm:ss a')
        : date?.from
        ? format(date.from, 'M/d/yyyy h:mm:ss a')
        : '',
    }),
    [authData?.custId, page, rowsPerPage, selectedVehicle, date]
  );

  const fetchStatusReport = useCallback(async (): Promise<VehicleStatusSummary[]> => {
    const custId = authData?.custId;

    if (!custId) {
      // Mock Fallback
      let fallback = vehicleStatusHistoryData.map((item) => {
        const matchingVeh = actualVehicles.find((v) => v.id === item.vehicleId);
        const liveMatch = liveStatusData.find((l) => l.vehicleNo === item.vehicleId);
        const events = [...item.events];
        const currentStatus = liveMatch?.status || (events.length > 0 ? events[0].status : 'Parked');

        return {
          vehicleId: item.vehicleId,
          vehicleName: item.vehicleName,
          driverName: item.driverName,
          overspeed: 60,
          bbid: item.vehicleId,
          vehicleType: matchingVeh?.type || 'Truck',
          eventsCount: events.length,
          currentStatus,
          details: events.map((ev, i) => ({
            id: `${item.vehicleId}-log-${i}`,
            dateTime: ev.dateTime,
            location: ev.location,
            speed: ev.speed,
            status: ev.status,
          })),
        };
      });

      if (selectedVehicle !== 'all') {
        fallback = fallback.filter((v) => v.vehicleId === selectedVehicle);
      }

      setTotalRecords(fallback.length);
      return fallback;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        CustId: String(requestModel.CustId),
        iDisplayStart: String(requestModel.iDisplayStart),
        iDisplayLength: String(requestModel.iDisplayLength),
        sSearch: requestModel.sSearch || '',
        beginDate: requestModel.beginDate || '',
        endDate: requestModel.endDate || '',
      });

      const response = await fetch(`${API_BASE_URL}/Reports/VehicleStatus?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      setTotalRecords(Number(json?.count || 0));

      const rows = Array.isArray(json?.data) ? json.data : [];
      return rows.map((item: any) => {
        const matchingVeh = actualVehicles.find(
          (v) => v.id === item.bbid || v.name === item.vehName
        );
        const liveMatch = liveStatusData.find(
          (l) => l.vehicleNo === (item.bbid || item.vehName)
        );
        const details: StatusLogDetail[] = Array.isArray(item.logs)
          ? item.logs.map((log: any, index: number) => ({
              id: `${item.bbid ?? 'vehicle'}-${index}`,
              dateTime: log.time,
              location: formatLocation(log.location ?? ''),
              speed: Number(log.speed) || 0,
              status: (log.status || 'Parked') as VehicleStatus,
            }))
          : [];

        const currentStatus =
          item.currentStatus ||
          item.status ||
          item.currStatus ||
          item.vehStatus ||
          (details.length > 0 ? details[0].status : (liveMatch?.status || 'Parked'));

        return {
          vehicleId: item.bbid ?? `bbid-${item.rowNo}`,
          vehicleName: item.vehName ?? '',
          driverName: item.driverName ?? null,
          overspeed: Number(item.overspeed) || 60,
          bbid: item.bbid ?? '',
          vehicleType: matchingVeh?.type || 'Truck',
          eventsCount: details.length,
          currentStatus,
          details,
        };
      });
    } catch (error) {
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authData?.custId, requestModel, selectedVehicle]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchStatusReport();
      setStatusData(data);
    };
    load();
  }, [fetchStatusReport]);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredData = useMemo(() => {
    let data = statusData;

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter((item) => item.vehicleId === selectedVehicle);
    }

    if (filterSearchTerm.trim()) {
      const query = filterSearchTerm.toLowerCase().trim();
      data = data.filter(
        (item) =>
          item.vehicleName.toLowerCase().includes(query) ||
          item.vehicleId.toLowerCase().includes(query) ||
          (item.driverName && item.driverName.toLowerCase().includes(query)) ||
          (item.currentStatus && item.currentStatus.toLowerCase().includes(query)) ||
          item.details.some((d) => d.location && d.location.toLowerCase().includes(query))
      );
    }

    const sortable = [...data];
    sortable.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

    return sortable;
  }, [statusData, selectedVehicle, filterSearchTerm, sortConfig]);

  const { exportExcel: originalExportExcel, exportPdf: originalExportPdf } = useReportDownload(
    '/Reports/VehicleStatus',
    requestModel
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

  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const firstRowIndex = totalRecords === 0 ? 0 : page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, totalRecords);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div className="relative bg-white dark:bg-card px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-scaleIn border">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-foreground">Please wait...</span>
          </div>
        </div>
      )}

      <Card className="shadow-sm overflow-hidden border">
        {/* Header matching SpeedAnalysisTable */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b bg-gradient-to-r from-card to-muted/20">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Vehicle Status Report</CardTitle>
            <CardDescription>Detailed log of vehicle status changes and telemetry.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {/* Quick Text Filter */}
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={showDriverName ? "Search driver, vehicle..." : "Search vehicle..."}
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
                setPage(0);
                const p = new URLSearchParams(searchParams);
                p.delete('vehicle');
                setSearchParams(p, { replace: true });
              }}
              className="w-full sm:w-[180px]"
            />

            {/* Sort Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle No {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                {showDriverName && (
                  <DropdownMenuItem onClick={() => handleSort('driverName')}>
                    Driver Name {sortConfig.key === 'driverName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleSort('currentStatus')}>
                  Current Status {sortConfig.key === 'currentStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 h-9 w-full sm:w-auto">
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

        {/* Content Area: Main View showing Vehicle No, Driver Name, Details */}
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3 mt-4">
            {filteredData.length === 0 && !loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30 text-blue-500" />
                  <p className="text-lg font-medium">No vehicle status records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {filteredData.map((row) => {
              const isExpanded = expandedRows.has(row.vehicleId);
              const vehicleType = row.vehicleType || 'Truck';

              const sortedDetails = [...row.details].sort((a, b) => {
                const key = detailsSortConfig.key as keyof typeof a;
                const aValue = a[key];
                const bValue = b[key];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return detailsSortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                  return detailsSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
              });

              return (
                <div key={row.vehicleId} className="group">
                  {/* Main Card View: ONLY Vehicle No, Driver Name, Details */}
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
                          ? 'bg-gradient-to-b from-blue-500 to-emerald-500'
                          : 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-blue-400 group-hover:to-emerald-500'
                      )}
                    />

                    <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                      {/* Column 1: Vehicle No */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <VehicleIconBadge vehicleType={vehicleType} />
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block leading-tight">
                            Vehicle No
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
                            {row.vehicleName}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium tracking-wide">
                            {row.vehicleId}
                          </p>
                        </div>
                      </div>

                      {/* Column 2: Driver Name */}
                      {showDriverName && (
                        <div className="flex flex-col items-start min-w-[120px] sm:min-w-[160px]">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                            Driver Name
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                              {row.driverName || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Column 3: Current Vehicle Status */}
                      <div className="flex flex-col items-start min-w-[130px] sm:min-w-[160px]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Current Status
                        </span>
                        <div className="mt-1">
                          <StatusBadge status={row.currentStatus} />
                        </div>
                      </div>

                      {/* Column 4: Details Button */}
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(row.vehicleId)}
                          disabled={!row.details || row.details.length === 0}
                          className={cn(
                            'h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-lg transition-all',
                            row.details && row.details.length > 0
                              ? isExpanded
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                                : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              : 'opacity-40 cursor-not-allowed text-muted-foreground'
                          )}
                        >
                          <span>{row.details && row.details.length > 0 ? 'Details' : 'No Logs'}</span>
                          {row.details && row.details.length > 0 && (
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 transition-transform duration-300',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Logs Section: ONLY Date Time, Location, Speed, Status */}
                  {isExpanded && (
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30 overflow-hidden transition-all duration-300">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Details Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <h5 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-500" />
                                Status Log: {row.vehicleName}
                              </h5>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Chronological status logs and telemetry for the selected period.
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {sortedDetails.length} Event{sortedDetails.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Table showing: Date Time, Location, Speed, Status */}
                          <div className="max-h-[460px] overflow-y-auto">
                            <Table className="w-full">
                              <TableHeader className="sticky top-0 bg-card/95 backdrop-blur z-10 border-b">
                                <TableRow className="hover:bg-transparent">
                                  {/* Column 1: Date Time */}
                                  <SortableHeader
                                    onClick={() => handleDetailsSort('dateTime')}
                                    isSorted={detailsSortConfig.key === 'dateTime'}
                                    sortDirection={detailsSortConfig.direction}
                                    className="w-[200px] pl-6"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      Date Time
                                    </div>
                                  </SortableHeader>

                                  {/* Column 2: Location */}
                                  <SortableHeader
                                    onClick={() => handleDetailsSort('location')}
                                    isSorted={detailsSortConfig.key === 'location'}
                                    sortDirection={detailsSortConfig.direction}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      Location
                                    </div>
                                  </SortableHeader>

                                  {/* Column 3: Speed */}
                                  <SortableHeader
                                    onClick={() => handleDetailsSort('speed')}
                                    isSorted={detailsSortConfig.key === 'speed'}
                                    sortDirection={detailsSortConfig.direction}
                                    className="w-[140px]"
                                  >
                                    Speed
                                  </SortableHeader>

                                  {/* Column 4: Status */}
                                  <SortableHeader
                                    onClick={() => handleDetailsSort('status')}
                                    isSorted={detailsSortConfig.key === 'status'}
                                    sortDirection={detailsSortConfig.direction}
                                    className="w-[140px] pr-6"
                                  >
                                    Status
                                  </SortableHeader>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedDetails.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                                      No status logs recorded for this vehicle.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  sortedDetails.map((detail) => (
                                    <TableRow
                                      key={detail.id}
                                      className="hover:bg-muted/40 transition-colors border-b last:border-0"
                                    >
                                      {/* Date Time */}
                                      <TableCell className="pl-6 font-mono text-xs whitespace-nowrap text-foreground font-medium">
                                        {detail.dateTime
                                          ? formatAppDateTime(detail.dateTime)
                                          : '-'}
                                      </TableCell>

                                      {/* Location */}
                                      <TableCell className="text-xs text-foreground/90 max-w-md">
                                        {detail.location && formatLocation(detail.location) !== '-' ? (
                                          <div
                                            className="inline-flex items-center gap-1.5 line-clamp-1"
                                            title={formatLocation(detail.location)}
                                          >
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate">{formatLocation(detail.location)}</span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>

                                      {/* Speed */}
                                      <TableCell className="whitespace-nowrap">
                                        <span className="font-mono text-xs font-bold text-foreground">
                                          {detail.speed} km/h
                                        </span>
                                      </TableCell>

                                      {/* Status */}
                                      <TableCell className="pr-6 whitespace-nowrap">
                                        <StatusBadge status={detail.status} size="sm" />
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                <SelectValue placeholder={String(rowsPerPage)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
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

export default VehicleStatusReportTable;