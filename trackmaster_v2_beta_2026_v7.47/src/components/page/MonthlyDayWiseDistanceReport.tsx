import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import {
  ArrowUp,
  ArrowDown,
  Download,
  Info,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileText,
  FileSpreadsheet,
  Route,
  Clock,
  Activity,
  TrendingUp,
  Truck,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { MonthPicker } from '@/components/ui/month-picker';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import MonthlyReportHelpDialog from './MonthlyReportHelpDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE_URL } from '@/config/Api';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

type DailyData = {
  distance: number;
  stoppage: number;
};

type ReportData = {
  vehicleId: string;
  vehicleName: string;
  status: 'In Use' | 'Inactive';
  dailyData: { [day: string]: DailyData };
  totalDistance: number;
  totalStoppage: string;
  avgDistance: number;
  avgStoppage: number;
  activeDays: number;
  bestDay: { date: string; distance: number };
};

type SortKey = 'vehicleName' | 'totalDistance' | 'totalStoppage';
type ViewMode = 'combined' | 'distance' | 'stoppage';

// --- MEMOIZED VEHICLE ICON BADGE ---
const VehicleIconBadge = React.memo(({ vehicleType = 'Truck' }: { vehicleType?: string }) => {
  const imageName = vehicleType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vehicleType}
      className="flex-shrink-0 w-8 h-8 object-contain drop-shadow-sm"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
});
VehicleIconBadge.displayName = 'VehicleIconBadge';

// --- CELL HEATMAP COLOR CALCULATION ---
const getDistanceCellClass = (distance: number, maxDistance: number) => {
  if (!distance || distance <= 0) {
    return 'text-muted-foreground/60 bg-transparent hover:bg-muted/40';
  }
  const ratio = maxDistance > 0 ? distance / maxDistance : 0;
  if (ratio <= 0.25) {
    return 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-300 font-medium hover:bg-emerald-500/20';
  }
  if (ratio <= 0.7) {
    return 'bg-emerald-500/25 text-emerald-950 dark:text-emerald-200 font-semibold hover:bg-emerald-500/35';
  }
  return 'bg-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-bold hover:bg-emerald-500/55';
};

interface ReportCellProps {
  day: Date;
  data?: DailyData;
  highlightProblems: boolean;
  stoppageThreshold: number;
  maxDistance: number;
  viewMode: ViewMode;
  isDayWeekend: boolean;
}

// --- MEMOIZED REPORT CELL ---
const ReportCell = React.memo<ReportCellProps>(({
  day,
  data,
  highlightProblems,
  stoppageThreshold,
  maxDistance,
  viewMode,
  isDayWeekend,
}) => {
  const distance = data?.distance || 0;
  const stoppage = data?.stoppage || 0;

  const showHighlight = highlightProblems && stoppage > stoppageThreshold;
  const heatmapClass = getDistanceCellClass(distance, maxDistance);

  return (
    <TableCell
      className={cn(
        'text-center p-0 h-12 relative min-w-[85px] transition-colors border-r/50 select-none',
        isDayWeekend && 'bg-slate-500/[0.02] dark:bg-slate-500/[0.04]',
        heatmapClass
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-full flex flex-col justify-center items-center relative py-1 px-1.5 cursor-pointer">
            {showHighlight && (
              <div className="absolute inset-0.5 rounded border-2 border-amber-500/90 pointer-events-none animate-pulse" />
            )}

            {/* Distance Display */}
            {viewMode !== 'stoppage' && (
              <span
                className={cn(
                  'text-xs transition-colors',
                  distance > 0 ? 'font-semibold' : 'text-muted-foreground/60'
                )}
              >
                {distance > 0 ? `${distance.toFixed(0)} km` : '-'}
              </span>
            )}

            {/* Halt Display */}
            {viewMode !== 'distance' && (
              <div className="flex items-center gap-1 mt-0.5">
                {stoppage > 0.1 ? (
                  <span
                    className={cn(
                      'text-[11px] leading-tight font-medium',
                      showHighlight
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-muted-foreground'
                    )}
                  >
                    {stoppage.toFixed(1)}h
                  </span>
                ) : viewMode === 'stoppage' ? (
                  <span className="text-[11px] text-muted-foreground/50">-</span>
                ) : null}
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent className="bg-popover text-popover-foreground border shadow-xl p-3 space-y-2 rounded-lg">
          <div className="flex items-center justify-between gap-4 border-b pb-1.5">
            <span className="font-bold text-sm">{format(day, 'EEEE, MMM d, yyyy')}</span>
            {isDayWeekend && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Weekend
              </Badge>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5 text-emerald-500" />
                Distance Run:
              </span>
              <span className="font-semibold text-foreground">{distance.toFixed(1)} km</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                Halt Duration:
              </span>
              <span
                className={cn(
                  'font-semibold text-foreground',
                  stoppage > stoppageThreshold && 'text-amber-500 font-bold'
                )}
              >
                {stoppage.toFixed(1)} hrs
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
});
ReportCell.displayName = 'ReportCell';

interface SortableHeaderProps {
  sortKey: SortKey;
  currentSort: {
    key: SortKey;
    direction: 'asc' | 'desc';
  };
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}

const SortableHeader = React.memo<SortableHeaderProps>(({
  sortKey,
  currentSort,
  onSort,
  children,
  className,
}) => (
  <TableHead
    className={cn(
      'sticky top-0 bg-muted/90 backdrop-blur-md cursor-pointer group transition-colors select-none',
      className
    )}
    onClick={() => onSort(sortKey)}
  >
    <div
      className={cn(
        'flex items-center gap-2 transition-colors',
        currentSort.key === sortKey
          ? 'text-foreground font-bold'
          : 'text-muted-foreground group-hover:text-foreground'
      )}
    >
      {children}
      {currentSort.key === sortKey &&
        (currentSort.direction === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ))}
    </div>
  </TableHead>
));
SortableHeader.displayName = 'SortableHeader';

const MonthlyDayWiseDistanceReport = () => {
  const { toast } = useToast();
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [highlightProblems, setHighlightProblems] = useState(false);
  const [stoppageThreshold, setStoppageThreshold] = useState<number>(4);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [selectedVehicleForTrend, setSelectedVehicleForTrend] = useState<ReportData | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'vehicleName',
    direction: 'asc',
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [vehicles, setVehicles] = useState<{ label: string; value: string }[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset pagination when primary filters change
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [selectedVehicle, month, sortConfig]);

  // Load Vehicles Dropdown List
  useEffect(() => {
    let isMounted = true;
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = auth.custId;
        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );
        const data = await response.json();

        if (isMounted) {
          const formattedVehicles = [
            {
              label: 'All Vehicles',
              value: 'all',
            },
            ...(data.data || []).map((v: any) => ({
              label: v.vehName,
              value: v.bbid,
            })),
          ];

          setVehicles(formattedVehicles);

          if (vehicleFromUrl) {
            setSelectedVehicle(vehicleFromUrl);
          } else {
            setSelectedVehicle('all');
          }
        }
      } catch (error) {
        console.error('Vehicle API Error', error);
      }
    };

    loadVehicles();
    return () => {
      isMounted = false;
    };
  }, [vehicleFromUrl]);

  // Generate calendar days for selected month with cached weekend flags
  const days = useMemo(() => {
    if (!month) return [];
    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  }, [month]);

  const weekendMap = useMemo(() => {
    const map: { [dayStr: string]: boolean } = {};
    days.forEach((d) => {
      map[d.toString()] = isWeekend(d);
    });
    return map;
  }, [days]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const loadReportData = useCallback(async () => {
    if (!month) return;

    // Cancel prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');

      const body = {
        sEcho: 1,
        iDisplayStart: pagination.pageIndex * pagination.pageSize,
        iDisplayLength: pagination.pageSize,
        sSearch:
          selectedVehicle !== 'all'
            ? vehicles.find((x) => x.value === selectedVehicle)?.label || ''
            : '',
        sortColumn:
          sortConfig.key === 'vehicleName'
            ? 'VehName'
            : sortConfig.key === 'totalDistance'
              ? 'TotalDistance'
              : 'TotalStoppage',
        sortDirection: sortConfig.direction,
        CustId: auth.custId,
        beginDate: format(month, 'MMMM yyyy'),
        endDate: null,
        Status: null,
      };

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetMonthlyDistanceReportData`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      const result = await response.json();
      const apiData = result.data || result || [];

      const currentYear = month.getFullYear();
      const currentMonth = month.getMonth();

      const transformedData: ReportData[] = apiData.map((item: any) => {
        const dailyData: { [key: string]: DailyData } = {};

        (
          item.distanceMonthlyReportSubDataModels ||
          item._distanceMonthlyReportSubDataModels ||
          []
        ).forEach((sub: any) => {
          dailyData[sub.day || sub.Day] = {
            distance: Number(sub.distance || sub.Distance || 0),
            stoppage: Number(sub.duration || sub.Duration || 0),
          };
        });

        const dailyEntries = Object.entries(dailyData);
        let activeDays = 0;
        let best = { date: '', distance: 0 };

        for (let i = 0; i < dailyEntries.length; i++) {
          const [dayKey, data] = dailyEntries[i];
          if (data.distance > 0) {
            activeDays += 1;
          }
          if (data.distance > best.distance) {
            best = { date: dayKey, distance: data.distance };
          }
        }

        const totalDistance = Number(
          item.totalDistance || item.TotalDistance || 0
        );
        const totalStoppage = item.totalStoppage || item.TotalStoppage || '0';

        const avgDistance = activeDays > 0 ? totalDistance / activeDays : 0;
        const avgStoppage =
          activeDays > 0 ? parseFloat(totalStoppage) / activeDays : 0;

        return {
          vehicleId: item.bbid || item.BBID,
          vehicleName: item.vehName || item.VehName,
          status: 'In Use',
          dailyData,
          totalDistance,
          totalStoppage,
          avgDistance,
          avgStoppage,
          activeDays,
          bestDay: {
            date: best.date
              ? format(new Date(currentYear, currentMonth, parseInt(best.date, 10)), 'MMM d')
              : 'N/A',
            distance: best.distance || 0,
          },
        };
      });

      setReportData(transformedData);
      setTotalRecords(
        result.recordsTotal ||
        result.totalRecords ||
        result.count ||
        transformedData.length
      );
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Report API Error:', error);
        toast({
          title: 'Error loading report',
          description: 'Failed to fetch monthly distance data. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [month, selectedVehicle, sortConfig, pagination.pageIndex, pagination.pageSize, vehicles, toast]);

  useEffect(() => {
    loadReportData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadReportData]);

  // --- STATS & AGGREGATE CALCULATIONS ---
  const { maxDistance, fleetStats, dailyFleetTotals } = useMemo(() => {
    let maxDist = 1;
    let totalFleetDist = 0;
    let totalFleetStop = 0;
    let activeVehiclesCount = 0;

    const dayTotals: { [dayStr: string]: { distance: number; stoppage: number } } = {};

    for (let i = 0; i < days.length; i++) {
      const dayNum = format(days[i], 'd');
      dayTotals[dayNum] = { distance: 0, stoppage: 0 };
    }

    for (let i = 0; i < reportData.length; i++) {
      const row = reportData[i];
      totalFleetDist += row.totalDistance;
      totalFleetStop += parseFloat(row.totalStoppage) || 0;
      if (row.totalDistance > 0) {
        activeVehiclesCount += 1;
      }

      const entries = Object.entries(row.dailyData);
      for (let j = 0; j < entries.length; j++) {
        const [dayNum, data] = entries[j];
        if (data.distance > maxDist) {
          maxDist = data.distance;
        }
        if (dayTotals[dayNum]) {
          dayTotals[dayNum].distance += data.distance;
          dayTotals[dayNum].stoppage += data.stoppage;
        }
      }
    }

    let peakDay = { day: '', distance: 0 };
    const dayTotalEntries = Object.entries(dayTotals);
    for (let i = 0; i < dayTotalEntries.length; i++) {
      const [dayNum, totals] = dayTotalEntries[i];
      if (totals.distance > peakDay.distance) {
        peakDay = { day: dayNum, distance: totals.distance };
      }
    }

    return {
      maxDistance: maxDist,
      fleetStats: {
        totalDistance: totalFleetDist,
        totalStoppage: totalFleetStop,
        activeVehicles: activeVehiclesCount,
        totalVehicles: reportData.length,
        avgDistancePerVeh:
          activeVehiclesCount > 0 ? totalFleetDist / activeVehiclesCount : 0,
        peakDay: peakDay.day && month
          ? format(
            new Date(
              month.getFullYear(),
              month.getMonth(),
              parseInt(peakDay.day, 10)
            ),
            'MMM d'
          )
          : 'N/A',
        peakDistance: peakDay.distance,
      },
      dailyFleetTotals: dayTotals,
    };
  }, [reportData, days, month]);

  const pageCount = Math.ceil(totalRecords / pagination.pageSize);
  const firstRowIndex = pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRecords
  );

  // --- EXPORT HANDLERS ---
  const handleExport = useCallback(async (type: 'Excel' | 'Pdf') => {
    setIsExporting(type === 'Excel' ? 'excel' : 'pdf');
    try {
      const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
      const body = {
        sEcho: 1,
        iDisplayStart: 0,
        iDisplayLength: 9999,
        sSearch:
          selectedVehicle !== 'all'
            ? vehicles.find((x) => x.value === selectedVehicle)?.label || ''
            : '',
        sortColumn:
          sortConfig.key === 'vehicleName'
            ? 'VehName'
            : sortConfig.key === 'totalDistance'
              ? 'TotalDistance'
              : 'TotalStoppage',
        sortDirection: sortConfig.direction,
        CustId: auth.custId,
        beginDate: format(month!, 'MMMM yyyy'),
        endDate: null,
        Status: null,
        DownloadType: type,
      };

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetMonthlyDistanceReportData`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download ${type}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `MonthlyDistanceReport_${format(month!, 'MMM_yyyy')}_${auth.custId}.${type === 'Excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Export Successful',
        description: `Your ${type} report has been downloaded.`,
      });
    } catch (error) {
      console.error(`Export ${type} Error:`, error);
      toast({
        title: 'Export Failed',
        description: `Failed to export ${type}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  }, [month, selectedVehicle, vehicles, sortConfig, toast]);

  // --- CHART DATA ON-DEMAND PREPARATION ---
  const chartData = useMemo(() => {
    if (!selectedVehicleForTrend || !month) return [];
    return days.map((day) => {
      const dayNum = format(day, 'd');
      const data = selectedVehicleForTrend.dailyData[dayNum] || {
        distance: 0,
        stoppage: 0,
      };
      return {
        date: format(day, 'd MMM (EEE)'),
        distance: data.distance,
        stoppage: data.stoppage,
      };
    });
  }, [selectedVehicleForTrend, days, month]);

  return (
    <TooltipProvider delayDuration={150}>
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-background text-foreground px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm font-semibold text-foreground">Please wait...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-5 h-full">
        {/* 1. EXECUTIVE FLEET KPI STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-emerald-500/[0.03]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-emerald-500" />
                  Fleet Total Run
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {fleetStats.totalDistance.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">km</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Avg {fleetStats.avgDistancePerVeh.toFixed(0)} km / active vehicle
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-orange-500/[0.03]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                  Fleet Halt Duration
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {fleetStats.totalStoppage.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">hours</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Monthly cumulative halts
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-blue-500/[0.03]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-500" />
                  Fleet Utilization
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {fleetStats.activeVehicles}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {fleetStats.totalVehicles} active</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {fleetStats.totalVehicles > 0
                    ? `${((fleetStats.activeVehicles / fleetStats.totalVehicles) * 100).toFixed(0)}% utilization on page`
                    : 'No vehicles active'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-purple-500/[0.03]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Peak Fleet Day
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {fleetStats.peakDay}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Max run {fleetStats.peakDistance.toFixed(0)} km across fleet
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. MAIN REPORT CARD */}
        <Card className="shadow-sm overflow-hidden flex flex-col flex-1 border">
          {/* HEADER CONTROLS */}
          <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 py-4 border-b bg-card">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Monthly Day-Wise Distance Report
                </CardTitle>
                <Badge variant="outline" className="text-xs font-medium">
                  {month ? format(month, 'MMMM yyyy') : ''}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Daily distance coverage and halt duration analysis per vehicle with interactive heatmaps.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end w-full lg:w-auto">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setIsHelpOpen(true)}
                title="Report Guide & Legend"
              >
                <Info className="h-4 w-4" />
              </Button>

              <MonthPicker date={month} setDate={setMonth} />

              <VehicleCombobox
                vehicles={vehicles}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                className="w-full sm:w-[190px]"
              />

              {/* EXPORT DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={isExporting !== null}
                    className="bg-black text-white hover:bg-black/90 shadow-sm w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 shadow-lg">
                  <DropdownMenuItem onClick={() => handleExport('Pdf')} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-red-500" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('Excel')} className="cursor-pointer">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                    Export as Excel (.xlsx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          {/* SUB-TOOLBAR: VIEW MODE TABS & HALT THRESHOLD */}
          <div className="px-6 py-3 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">View:</span>
              <Tabs
                value={viewMode}
                onValueChange={(val) => setViewMode(val as ViewMode)}
                className="h-8"
              >
                <TabsList className="h-8 p-0.5 bg-muted">
                  <TabsTrigger value="combined" className="text-xs px-3 h-7">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="distance" className="text-xs px-3 h-7">
                    Distance Only
                  </TabsTrigger>
                  <TabsTrigger value="stoppage" className="text-xs px-3 h-7">
                    Halt Only
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Halt Highlight & Configurable Threshold */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center space-x-2">
                <Switch
                  id="highlight-problems"
                  checked={highlightProblems}
                  onCheckedChange={setHighlightProblems}
                />
                <Label
                  htmlFor="highlight-problems"
                  className="text-xs cursor-pointer select-none font-medium"
                >
                  Highlight Over Halt Duration
                </Label>
              </div>

              {highlightProblems && (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                  <span className="text-xs text-muted-foreground font-medium">(&gt;</span>
                  <Select
                    value={String(stoppageThreshold)}
                    onValueChange={(val) => setStoppageThreshold(Number(val))}
                  >
                    <SelectTrigger className="h-7 w-[72px] text-xs bg-card">
                      <SelectValue placeholder="4h" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 hrs</SelectItem>
                      <SelectItem value="4">4 hrs</SelectItem>
                      <SelectItem value="6">6 hrs</SelectItem>
                      <SelectItem value="8">8 hrs</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground font-medium">)</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TABLE GRID */}
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="w-full overflow-auto max-h-[620px] relative">
              <Table className="relative border-collapse min-w-full text-xs">
                <TableHeader>
                  <TableRow className="border-b">
                    {/* Pinned Left: Vehicle Column */}
                    <SortableHeader
                      sortKey="vehicleName"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="sticky left-0 z-30 min-w-[210px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r bg-card"
                    >
                      <div className="flex items-center gap-2 py-1">
                        <Truck className="h-4 w-4 text-primary" />
                        <span>Vehicle No</span>
                      </div>
                    </SortableHeader>

                    {/* Dynamic Calendar Day Columns */}
                    {days.map((day) => {
                      const isDayWeekend = weekendMap[day.toString()];
                      return (
                        <TableHead
                          key={day.toString()}
                          className={cn(
                            'text-center min-w-[85px] px-1 py-2 sticky top-0 z-20 transition-colors border-r/50 select-none bg-muted/90 backdrop-blur-md',
                            isDayWeekend && 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/[0.06]'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase tracking-wider',
                                isDayWeekend
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {format(day, 'EEE')}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {format(day, 'd')}
                            </span>
                          </div>
                        </TableHead>
                      );
                    })}

                    {/* Pinned Right: Monthly Totals Column */}
                    <SortableHeader
                      sortKey="totalDistance"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="sticky right-0 z-20 min-w-[190px] shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l bg-card"
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>MONTHLY TOTALS</span>
                      </div>
                    </SortableHeader>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={days.length + 2}
                        className="h-48 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                          <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            Loading Monthly Day-Wise Distance Report...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : reportData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={days.length + 2}
                        className="h-40 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Truck className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold text-sm">No data available</p>
                          <p className="text-xs">No records found for the selected vehicle and month.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {reportData.map((row) => (
                        <TableRow
                          key={row.vehicleId}
                          className="hover:bg-muted/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedVehicleForTrend(row)}
                        >
                          {/* PINNED LEFT: VEHICLE NAME & METRICS */}
                          <TableCell className="sticky left-0 bg-card font-semibold min-w-[210px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r z-30 py-2.5 px-3">
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2.5">
                                  <VehicleIconBadge />
                                  <div className="flex flex-col text-left">
                                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                      {row.vehicleName}
                                      <BarChart3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      {row.activeDays} active days • {row.avgDistance.toFixed(0)} km/day
                                    </span>
                                  </div>
                                </div>
                              </TooltipTrigger>

                              <TooltipContent className="w-64 bg-popover text-popover-foreground border shadow-xl p-3 space-y-2">
                                <div className="border-b pb-1.5">
                                  <h4 className="font-bold text-popover-foreground text-sm">
                                    {row.vehicleName}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">Click row to open full trend chart</p>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Route className="h-3.5 w-3.5 text-blue-500" />
                                      Avg Distance / Day:
                                    </span>
                                    <span className="font-semibold text-foreground">{row.avgDistance.toFixed(1)} km</span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                                      Avg Halt Duration / Day:
                                    </span>
                                    <span className="font-semibold text-foreground">{row.avgStoppage.toFixed(1)} hrs</span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Active Days:</span>
                                    <span className="font-semibold text-foreground">{row.activeDays} days</span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Best Day:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {row.bestDay.distance.toFixed(0)} km ({row.bestDay.date})
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* DAILY HEATMAP CELLS */}
                          {days.map((day) => {
                            const dayOfMonth = format(day, 'd');
                            const data = row.dailyData[dayOfMonth];
                            const isDayWeekend = weekendMap[day.toString()];

                            return (
                              <ReportCell
                                key={day.toString()}
                                day={day}
                                data={data}
                                highlightProblems={highlightProblems}
                                stoppageThreshold={stoppageThreshold}
                                maxDistance={maxDistance}
                                viewMode={viewMode}
                                isDayWeekend={isDayWeekend}
                              />
                            );
                          })}

                          {/* PINNED RIGHT: MONTHLY TOTALS */}
                          <TableCell className="sticky right-0 bg-card shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l z-20 min-w-[190px] p-2">
                            <div className="flex flex-col gap-1">
                              <div className="bg-muted/40 rounded px-2 py-1 flex items-center justify-between border">
                                <div className="flex items-center gap-1.5">
                                  <Route className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                    Run
                                  </span>
                                </div>
                                <span className="font-bold text-xs text-foreground">
                                  {row.totalDistance.toFixed(0)}
                                  <span className="font-normal text-[10px] text-muted-foreground ml-0.5">km</span>
                                </span>
                              </div>

                              <div className="bg-muted/40 rounded px-2 py-1 flex items-center justify-between border">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                    Halt
                                  </span>
                                </div>
                                <span className="font-bold text-xs text-foreground">
                                  {parseFloat(row.totalStoppage).toFixed(1)}h
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* FLEET DAILY AGGREGATE FOOTER ROW */}
                      <TableRow className="border-t-2 border-primary/20 bg-muted/60 font-bold sticky bottom-0 z-30 shadow-sm">
                        <TableCell className="sticky left-0 bg-muted font-bold min-w-[210px] border-r z-40 py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="text-xs uppercase tracking-wider font-bold">Fleet Day Total</span>
                          </div>
                        </TableCell>

                        {days.map((day) => {
                          const dayOfMonth = format(day, 'd');
                          const totals = dailyFleetTotals[dayOfMonth] || { distance: 0, stoppage: 0 };
                          return (
                            <TableCell
                              key={`footer-${day.toString()}`}
                              className="text-center p-1.5 min-w-[85px] border-r/50"
                            >
                              {viewMode !== 'stoppage' && (
                                <div className="text-xs font-bold text-foreground">
                                  {totals.distance > 0 ? `${totals.distance.toFixed(0)} km` : '-'}
                                </div>
                              )}
                              {viewMode !== 'distance' && totals.stoppage > 0.1 && (
                                <div className="text-[11px] text-muted-foreground font-medium">
                                  {totals.stoppage.toFixed(1)}h
                                </div>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className="sticky right-0 bg-muted border-l z-30 min-w-[190px] p-2">
                          <div className="flex flex-col gap-1">
                            <div className="text-xs font-extrabold flex justify-between items-center text-foreground">
                              <div className="flex items-center gap-1.5">
                                <Route className="h-3 w-3 text-emerald-500" />
                                <span className="text-[10px] text-muted-foreground uppercase">Total Run:</span>
                              </div>
                              <span>{fleetStats.totalDistance.toFixed(0)} km</span>
                            </div>
                            <div className="text-xs font-bold flex justify-between items-center text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span className="text-[10px] text-muted-foreground uppercase">Total Halt:</span>
                              </div>
                              <span>{fleetStats.totalStoppage.toFixed(1)}h</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* 4. PAGINATION FOOTER */}
          <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => {
                  setPagination({
                    pageIndex: 0,
                    pageSize: Number(value),
                  });
                }}
              >
                <SelectTrigger className="w-18 h-8 text-xs focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {totalRecords > 0
                  ? `${firstRowIndex}-${lastRowIndex} of ${totalRecords}`
                  : '0-0 of 0'}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                  disabled={pagination.pageIndex === 0 || loading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                  disabled={pagination.pageIndex === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                  disabled={pagination.pageIndex >= pageCount - 1 || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
                  disabled={pagination.pageIndex >= pageCount - 1 || loading}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* 5. VEHICLE MONTHLY TREND ANALYTICS DIALOG */}
        <Dialog
          open={Boolean(selectedVehicleForTrend)}
          onOpenChange={(open) => {
            if (!open) setSelectedVehicleForTrend(null);
          }}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Truck className="h-5 w-5 text-primary" />
                  {selectedVehicleForTrend?.vehicleName}
                  <Badge variant="secondary" className="ml-2 font-medium">
                    {month ? format(month, 'MMMM yyyy') : ''}
                  </Badge>
                </DialogTitle>
              </div>
              <DialogDescription>
                Day-by-day distance covered (km) and halt duration (hours) breakdown.
              </DialogDescription>
            </DialogHeader>

            {selectedVehicleForTrend && (
              <div className="space-y-6 pt-2">
                {/* Quick vehicle stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">Total Run</span>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {selectedVehicleForTrend.totalDistance.toFixed(0)} km
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">Total Halt Duration</span>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {parseFloat(selectedVehicleForTrend.totalStoppage).toFixed(1)} hrs
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">Daily Average</span>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {selectedVehicleForTrend.avgDistance.toFixed(1)} km
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">Best Day</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedVehicleForTrend.bestDay.distance.toFixed(0)} km
                    </p>
                  </div>
                </div>

                {/* Interactive Trend Chart */}
                <div className="border rounded-xl p-4 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Daily Performance Trend
                    </h4>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                        <span>Distance (km)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-orange-500" />
                        <span>Halt Duration (hrs)</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          interval={1}
                        />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            color: 'hsl(var(--popover-foreground))',
                          }}
                          itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                          labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="distance"
                          name="Distance (km)"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="stoppage"
                          name="Halt Duration (hrs)"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 6. HELP & LEGEND DIALOG */}
        <MonthlyReportHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      </div>
    </TooltipProvider>
  );
};

export default MonthlyDayWiseDistanceReport;