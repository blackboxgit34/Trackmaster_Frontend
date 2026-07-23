import React, { useState, useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { fuelFillingDetails, vehicles, actualVehicles } from '@/data/mockData';
import { routeData } from '@/data/routeData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Download,
  Fuel,
  Droplets,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  Truck,
  Car,
  Bus,
  Ambulance,
  Tractor,
  BarChart3,
  Clock,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format, differenceInMinutes, parseISO, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '../../WhatsappPopup';
import { VehicleCombobox } from '../../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import FuelFillingGraphDialog from './FuelFillingGraphDialog';

type AggregatedData = {
  id: string;
  date: string;
  vehicleId: string;
  vehicleName: string;
  fillingCount: number;
  totalFilling: number;
};
type AggregatedDataKey = keyof AggregatedData;

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
    className={cn("cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group", className)}
    onClick={onClick}
  >
    <div className={cn("flex items-center gap-2", className?.includes('text-right') && 'justify-end')}>
      {children}
      {isSorted ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
      )}
    </div>
  </TableHead>
);



// --- Mini bar chart component ---
const MiniBarChart = ({ fillings }: { fillings: number[] }) => {
  // Calculate relative heights based on actual filling amounts
  const maxFilling = Math.max(...fillings, 1);
  const bars = fillings.map(f => (f / maxFilling) * 100);

  // Pad to at least 5 bars for visual consistency
  while (bars.length < 5) {
    bars.push(0);
  }

  // Limit to 7 bars max to fit the UI space
  const displayBars = bars.slice(0, 7);

  return (
    <div className="flex items-end gap-[3px] h-[32px]">
      {displayBars.map((height, i) => {
        const isActual = i < fillings.length;
        return (
          <div
            key={i}
            className="rounded-sm transition-all duration-300 cursor-default"
            style={{
              width: '6px',
              height: isActual ? `${Math.max(height, 15)}%` : '15%',
              background: isActual
                ? `linear-gradient(to top, #1e3a5f, #3b82f6 40%, #93c5fd)`
                : `linear-gradient(to top, #94a3b8, #cbd5e1)`,
              opacity: isActual ? 0.6 + (i / displayBars.length) * 0.4 : 0.3,
            }}
            title={isActual ? `${fillings[i].toFixed(1)} L` : undefined}
          />
        );
      })}
    </div>
  );
};

// --- Circular progress badge ---
const FillingCountBadge = ({ count, fuelPercentage }: { count: number, fuelPercentage: number }) => {
  const circumference = 2 * Math.PI * 18;
  const progress = Math.min(Math.max(fuelPercentage, 0), 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46 }}>
      <svg width="46" height="46" viewBox="0 0 46 46" className="absolute top-0 left-0">
        <circle
          cx="23"
          cy="23"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted-foreground/15"
        />
        <circle
          cx="23"
          cy="23"
          r="18"
          fill="none"
          stroke="url(#countGradient)"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 23 23)"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="countGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-bold text-foreground z-10">{count}</span>
    </div>
  );
};

// --- Vehicle icon badge ---
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


const FuelFillingReportTable = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: AggregatedDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'totalFilling', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'beforeFillingDate', direction: 'asc' });

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');

  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [selectedRowForGraph, setSelectedRowForGraph] = useState<AggregatedData | null>(null);

  const handleViewGraph = (row: AggregatedData) => {
    const vehicleInfo = actualVehicles.find(v => v.id === row.vehicleId);
    if (!vehicleInfo) return;

    const tankCapacity = vehicleInfo.fuelTankCapacity;
    const date = parse(row.date, 'yyyy-MM-dd', new Date());
    const start = startOfDay(date);
    const end = endOfDay(date);

    const pathPoints = routeData
      .filter(trip => trip.vehicleId === row.vehicleId && isWithinInterval(parseISO(trip.date), { start, end }))
      .flatMap(trip => trip.path)
      .map(p => ({ ...p, type: 'path' }));

    const fillingEventsForDay = fuelFillingDetails
      .filter(e => e.vehicleId === row.vehicleId && e.date === row.date)
      .map(e => {
        const before = parse(e.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date());
        const after = parse(e.afterFillingDate, 'yyyy-MM-dd HH:mm', new Date());
        return {
          timestamp: e.beforeFillingDate,
          type: 'event',
          event: {
            type: 'filling',
            amount: e.filling,
            duration: differenceInSeconds(after, before),
            speed: 0,
            distance: 0,
            beforeLevel: e.beforeFilling,
            afterLevel: e.afterFilling,
            timestamp: before.getTime(),
            location: e.fillingStation,
          },
          location: e.fillingStation,
        };
      });

    const allPoints = [...pathPoints, ...fillingEventsForDay]
      .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

    if (allPoints.length < 1) {
      toast({ title: "No Data", description: "No detailed activity data available to generate graph.", variant: "destructive" });
      return;
    }

    let currentFuel = tankCapacity * 0.8; // Start with an assumption
    let cumulativeDistance = 0;
    const processedData: any[] = [];

    for (let i = 0; i < allPoints.length; i++) {
      const point = allPoints[i] as any;
      const timestamp = parseISO(point.timestamp);

      if (i > 0) {
        const prevPoint = allPoints[i - 1] as any;
        const prevTimestamp = parseISO(prevPoint.timestamp);
        const timeDeltaSeconds = differenceInSeconds(timestamp, prevTimestamp);
        const timeDeltaHours = timeDeltaSeconds / 3600;

        if (prevPoint.type === 'path' && prevPoint.speed > 0) {
          cumulativeDistance += prevPoint.speed * timeDeltaHours;
          const consumptionRate = 1.5 + (prevPoint.speed / 15);
          currentFuel -= consumptionRate * timeDeltaHours;
        }
      }

      if (point.type === 'event' && point.event.type === 'filling') {
        currentFuel = Math.min(tankCapacity, currentFuel + point.event.amount);
      }

      currentFuel = Math.max(0, currentFuel);

      processedData.push({
        timestamp: timestamp.getTime(),
        fuel: parseFloat(currentFuel.toFixed(2)),
        speed: point.speed || 0,
        distance: parseFloat(cumulativeDistance.toFixed(2)),
        event: point.type === 'event' ? point.event : null,
      });
    }

    setGraphData(processedData);
    setSelectedRowForGraph(row);
    setIsGraphOpen(true);
  };


  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const dailyAggregatedData = useMemo(() => {
    let data = fuelFillingDetails;

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      data = data.filter(item => {
        const itemDate = parse(item.date, 'yyyy-MM-dd', new Date());
        return isWithinInterval(itemDate, { start, end });
      });
    }

    const dailyData = new Map<string, AggregatedData>();
    data.forEach(item => {
      const key = `${item.vehicleId}-${item.date}`;
      if (!dailyData.has(key)) {
        dailyData.set(key, {
          id: key,
          vehicleId: item.vehicleId,
          vehicleName: vehicles.find(m => m.id === item.vehicleId)?.name || item.vehicleId,
          date: item.date,
          fillingCount: 0,
          totalFilling: 0,
        });
      }
      const entry = dailyData.get(key)!;
      entry.fillingCount += 1;
      entry.totalFilling += item.filling;
    });

    return Array.from(dailyData.values());
  }, [selectedVehicle, date]);

  const sortedData = useMemo(() => {
    const sortableData = [...dailyAggregatedData];
    sortableData.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableData;
  }, [dailyAggregatedData, sortConfig]);

  const handleSort = (key: AggregatedDataKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  return (
    <>
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Fuel Filling Report</CardTitle>
            <CardDescription>Overview of fuel filling events.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <DateRangePicker date={date} setDate={setDate} />
            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('totalFilling')}>
                  Total Filling {sortConfig.key === 'totalFilling' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('fillingCount')}>
                  Filling Count {sortConfig.key === 'fillingCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle Name {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('date')}>
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <WhatsappPopup />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {paginatedData.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No filling records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}
            {paginatedData.map((row) => {
              const isExpanded = expandedRows.has(row.id);
              const vehicle = actualVehicles.find(v => v.id === row.vehicleId);
              const vehicleType = vehicle?.type || 'Truck';
              const details = fuelFillingDetails.filter(d => d.vehicleId === row.vehicleId && d.date === row.date);
              const detailsWithDuration = details.map(d => {
                const beforeDate = parse(d.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date());
                const afterDate = parse(d.afterFillingDate, 'yyyy-MM-dd HH:mm', new Date());
                return { ...d, duration: differenceInMinutes(afterDate, beforeDate) };
              });
              const sortedDetails = [...detailsWithDuration].sort((a, b) => {
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
              const tankCapacity = vehicle?.fuelTankCapacity || 0;
              const latestFilling = details.length > 0 ? details[details.length - 1] : null;
              const availableFuel = latestFilling?.afterFilling || 0;

              return (
                <div key={row.id} className="group">
                  {/* Main Vehicle Card */}
                  <div
                    className={cn(
                      "relative bg-card border rounded-xl transition-all duration-300 overflow-hidden",
                      "hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50",
                      isExpanded
                        ? "border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none"
                        : "shadow-sm"
                    )}
                  >
                    {/* Left accent border */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300",
                        isExpanded
                          ? "bg-gradient-to-b from-blue-500 to-blue-600"
                          : "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-blue-400 group-hover:to-blue-500"
                      )}
                    />

                    <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                      {/* Vehicle icon */}
                      <VehicleIconBadge vehicleType={vehicleType} />

                      {/* Vehicle info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                          {row.vehicleName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                          {row.vehicleId}
                        </p>
                      </div>

                      {/* Tank Capacity */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Tank Capacity
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                            {tankCapacity}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">L</span>
                        </div>
                      </div>

                      {/* Fuel in Tank */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Fuel in Tank
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-green-500 tabular-nums leading-tight">
                            {availableFuel.toFixed(0)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">L</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="hidden sm:block w-px h-10 bg-border mx-2"></div>

                      {/* Filling Count */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Filling Count
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                            {row.fillingCount}
                          </span>
                        </div>
                      </div>

                      {/* Total filled */}
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Total Filled
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                            {row.totalFilling.toFixed(0)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">L</span>
                        </div>
                      </div>

                      {/* Mini bar chart */}
                      <div className="hidden md:flex items-center">
                        <MiniBarChart fillings={details.map(d => d.filling)} />
                      </div>

                      {/* Detailed log toggle */}
                      <button
                        onClick={() => toggleRow(row.id)}
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
                            "h-3.5 w-3.5 transition-transform duration-300",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    </div>

                    {/* Mobile: Total filled (shown below the main row on small screens) */}
                    <div className="sm:hidden flex items-center justify-between px-6 pb-3 pl-7">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Total Filled:
                        </span>
                        <span className="text-lg font-bold text-foreground tabular-nums">
                          {row.totalFilling.toFixed(1)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">L</span>
                      </div>
                      <MiniBarChart fillings={details.map(d => d.filling)} />
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Details Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h5 className="text-base font-semibold text-foreground">
                                    Filling Log: {row.vehicleName}
                                  </h5>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Detailed filling breakdown for {format(parse(row.date, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}
                                  </p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleViewGraph(row)} className="gap-1.5">
                                <BarChart3 className="h-4 w-4" />
                                View Graph
                              </Button>
                            </div>
                          </div>
                          {/* Details Timeline */}
                          <ScrollArea className="h-[280px] pr-4 mt-2">
                            {sortedDetails.length > 0 ? (
                              <div className="relative pl-6 space-y-3 pb-4">
                                {sortedDetails.map((detail, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === sortedDetails.length - 1;
                                  const beforeDateObj = parse(detail.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date());
                                  const afterDateObj = parse(detail.afterFillingDate, 'yyyy-MM-dd HH:mm', new Date());

                                  return (
                                    <div key={detail.id} className="relative">
                                      {/* Timeline connection lines */}
                                      {!isFirst && (
                                        <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700"></div>
                                      )}
                                      {!isLast && (
                                        <div className="absolute -left-[15px] top-1/2 -bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700"></div>
                                      )}

                                      {/* Timeline Dot */}
                                      <div className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-full z-10 shadow-sm"></div>

                                      {/* Timeline Card */}
                                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors py-3 px-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                          {/* Column 1: Times & Station */}
                                          <div className="lg:col-span-4 flex flex-col gap-2">
                                            <div className="flex items-start gap-3">
                                              <div className="flex flex-col min-w-[50px]">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</span>
                                                <span className="text-sm font-bold text-foreground">{format(beforeDateObj, 'HH:mm')}</span>
                                              </div>
                                              <div className="flex flex-col flex-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Filling Station</span>
                                                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate" title={detail.fillingStation}>
                                                  {detail.fillingStation}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="flex flex-col min-w-[50px]">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</span>
                                                <span className="text-sm font-bold text-foreground">{format(afterDateObj, 'HH:mm')}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarIcon className="h-3 w-3" />
                                                {format(beforeDateObj, 'dd MMM yyyy')}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Column 2 & 3: Fuel Levels & Duration */}
                                          <div className="lg:col-span-5 grid grid-cols-2 gap-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            <div className="flex items-center gap-2.5">
                                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                                                <Clock className="text-blue-600 dark:text-blue-400 h-4 w-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Filling Duration</div>
                                                <div className="text-sm font-bold text-foreground truncate">{detail.duration} mins</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                                <Droplets className="text-slate-600 dark:text-slate-400 h-4 w-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Fuel Level Change</div>
                                                <div className="text-sm font-bold text-foreground truncate">
                                                  {detail.beforeFilling.toFixed(1)}L → {detail.afterFilling.toFixed(1)}L
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Column 4: Filled Amount */}
                                          <div className="lg:col-span-3 text-right flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            <div className="mb-1">
                                              <div className="text-xl font-bold text-green-600 dark:text-green-400 leading-none flex items-baseline justify-end gap-1">
                                                + {detail.filling.toFixed(1)}
                                                <span className="text-sm">L</span>
                                              </div>
                                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Fuel Filled</div>
                                            </div>
                                          </div>

                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center p-8 mt-4">
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                                  <Fuel className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">No filling details available for this day.</p>
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
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}>
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
              <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{sortedData.length > 0 ? `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedData.length)} of ${sortedData.length}` : '0 results'}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      {selectedRowForGraph && (
        <FuelFillingGraphDialog
          open={isGraphOpen}
          onOpenChange={setIsGraphOpen}
          graphData={graphData}
          vehicleName={selectedRowForGraph.vehicleName}
          date={selectedRowForGraph.date}
        />
      )}
    </>
  );
};

export default FuelFillingReportTable;