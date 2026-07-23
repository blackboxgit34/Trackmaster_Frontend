import React, { useState, useMemo, useEffect } from 'react';
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
import { fuelDisconnectionDetails, vehicles, actualVehicles } from '@/data/mockData';
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
  ChevronsUpDown,
  PowerOff,
  Cable,
  Clock,
  Link,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, isWithinInterval, parse, startOfDay, endOfDay, format, differenceInSeconds } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';

type AggregatedData = {
  id: string;
  date: string;
  vehicleId: string;
  vehicleName: string;
  disconnectionCount: number;
  totalDisconnectionDuration: number;
  details: (typeof fuelDisconnectionDetails)[0][];
};
type AggregatedDataKey = keyof AggregatedData;

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 1) return '< 1min';
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}hr`;
  return `${hours}hr ${minutes}min`;
};

const OngoingDuration = ({ startTime }: { startTime: Date }) => {
    const [duration, setDuration] = useState(differenceInSeconds(new Date(), startTime));
    useEffect(() => {
        const timer = setInterval(() => {
            setDuration(differenceInSeconds(new Date(), startTime));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);
    return <p className="font-mono text-sm text-muted-foreground">{formatDuration(duration)}</p>;
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
    className={cn("cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group", className)}
    onClick={onClick}
  >
    <div className={cn("flex items-center gap-2", className?.includes('text-right') && 'justify-end')}>
      {children}
      {isSorted ? (
        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
      ) : (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
      )}
    </div>
  </TableHead>
);

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

const DisconnectionReportTable = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: AggregatedDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'asc' });

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const dailyAggregatedData = useMemo(() => {
    let data = fuelDisconnectionDetails.filter(item => item.type === 'Disconnection');

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
          disconnectionCount: 0,
          totalDisconnectionDuration: 0,
          details: [],
        });
      }
      const entry = dailyData.get(key)!;
      entry.disconnectionCount += 1;
      entry.totalDisconnectionDuration += item.duration;
      entry.details.push(item);
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
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Disconnection Report</CardTitle>
          <CardDescription>Overview of fuel rod disconnection events.</CardDescription>
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
              <DropdownMenuItem onClick={() => handleSort('disconnectionCount')}>
                Disconnection Count {sortConfig.key === 'disconnectionCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                <Cable className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No disconnection records found</p>
                <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
              </div>
            </div>
          )}
          {paginatedData.map((row) => {
            const isExpanded = expandedRows.has(row.id);
            const vehicle = actualVehicles.find(v => v.id === row.vehicleId);
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
              <div key={row.id} className="group">
                {/* Main Vehicle Card */}
                <div
                  className={cn(
                    "relative bg-card border rounded-xl transition-all duration-300 overflow-hidden",
                    "hover:shadow-md hover:border-red-200 dark:hover:border-red-800/50",
                    isExpanded
                      ? "border-red-200 dark:border-red-800/50 shadow-md rounded-b-none"
                      : "shadow-sm"
                  )}
                >
                  {/* Left accent border */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300",
                      isExpanded
                        ? "bg-gradient-to-b from-red-500 to-red-600"
                        : "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-red-400 group-hover:to-red-500"
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

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-10 bg-border mx-2"></div>

                    {/* Disconnection Count */}
                    <div className="hidden sm:flex flex-col items-end mr-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Disconnections
                      </span>
                      <div className="flex items-baseline gap-0.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                          {row.disconnectionCount}
                        </span>
                      </div>
                    </div>

                    {/* Detailed log toggle */}
                    <button
                      onClick={() => toggleRow(row.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-1",
                        isExpanded
                          ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                          : "text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
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
                </div>

                {/* Expanded Details Section */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="border border-t-0 border-red-200 dark:border-red-800/50 rounded-b-xl bg-muted/30">
                    <div className="p-4 sm:p-6">
                      <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                        {/* Details Header */}
                        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30">
                          <div>
                            <h5 className="text-base font-semibold text-foreground">
                              Disconnection Log: {row.vehicleName}
                            </h5>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Detailed breakdown for {format(parse(row.date, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}
                            </p>
                          </div>
                        </div>
                        {/* Details Timeline */}
                        <ScrollArea className="h-[280px] pr-4 mt-2">
                          {sortedDetails.length > 0 ? (
                            <div className="relative pl-6 space-y-3 pb-4">
                              {sortedDetails.map((detail, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === sortedDetails.length - 1;
                                const beforeDateObj = parse(detail.startTime, 'yyyy-MM-dd HH:mm:ss', new Date());
                                const afterDateObj = parse(detail.endTime, 'yyyy-MM-dd HH:mm:ss', new Date());
                                const isOngoing = idx % 4 === 1; // Simulate ongoing for demo purposes just like original table

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
                                    <div className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-red-500 rounded-full z-10 shadow-sm"></div>

                                    {/* Timeline Card */}
                                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:border-red-400 dark:hover:border-red-500/50 transition-colors py-3 px-4">
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                        {/* Column 1: Times & Location */}
                                        <div className="lg:col-span-5 grid grid-cols-2 gap-3 items-center py-1">
                                          {/* Times */}
                                          <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">Start</span>
                                              <span className="text-sm font-bold text-foreground leading-none">{format(beforeDateObj, 'HH:mm:ss')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">End</span>
                                              <span className="text-sm font-bold text-foreground leading-none">{isOngoing ? '--:--:--' : format(afterDateObj, 'HH:mm:ss')}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Date & Location */}
                                          <div className="flex flex-col gap-1.5 min-w-0 border-l border-slate-200 dark:border-slate-700 pl-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                              <span className="truncate font-medium">{format(beforeDateObj, 'dd MMM yyyy')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 truncate" title={detail.location}>
                                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                                              <span className="truncate font-medium">{detail.location}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Column 2 & 3: Details */}
                                        <div className="lg:col-span-4 grid grid-cols-1 gap-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0">
                                              <Clock className="text-red-600 dark:text-red-400 h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</div>
                                              <div className="text-sm font-bold text-foreground truncate">
                                                {isOngoing ? <OngoingDuration startTime={beforeDateObj} /> : formatDuration(detail.duration)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Column 4: Status */}
                                        <div className="lg:col-span-3 text-right flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                          <div className="flex justify-end">
                                            {isOngoing ? (
                                              <span className="w-28 inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                <AlertTriangle className="h-3.5 w-3.5" /> Disconnected
                                              </span>
                                            ) : (
                                              <span className="w-28 inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <Link className="h-3.5 w-3.5" /> Connected
                                              </span>
                                            )}
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
                                <Cable className="h-6 w-6 text-slate-400" />
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">No disconnection details available for this day.</p>
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
  );
};

export default DisconnectionReportTable;