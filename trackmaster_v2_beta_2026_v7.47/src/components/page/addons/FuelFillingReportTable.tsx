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
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format, differenceInMinutes, parseISO, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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

const headers: { key: AggregatedDataKey; label: string }[] = [
  { key: 'vehicleId', label: 'Registration number' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'fillingCount', label: 'Filling Count' },
  { key: 'totalFilling', label: 'Total Filling (L)' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

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

const FuelFillingReportTable = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: AggregatedDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'beforeFillingDate', direction: 'asc' });

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>('last-week');

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

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (range) {
      case 'today':
        fromDate = now;
        break;
      case 'yesterday':
        fromDate = subDays(now, 1);
        toDate = subDays(now, 1);
        break;
      case 'last-week':
        fromDate = subWeeks(now, 1);
        break;
      case 'last-month':
        fromDate = subMonths(now, 1);
        break;
      case 'last-2-months':
        fromDate = subMonths(now, 2);
        break;
      default:
        fromDate = now;
    }

    setDate({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
    setActiveTimeRange(range);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
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
  const selectedTimeRangeLabel = timeRanges.find((r) => r.value === activeTimeRange)?.label || 'Select a time range';

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
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[260px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {activeTimeRange ? selectedTimeRangeLabel : (
                    date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'LLL dd, y')} -{' '}
                          {format(date.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(date.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date</span>
                    )
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="end">
                <div className="flex flex-col space-y-1 p-2 border-r">
                  {timeRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => handleTimeRangeClick(range.value)}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateChange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  {headers.map((header) => (
                    <SortableHeader key={header.key} onClick={() => handleSort(header.key)} isSorted={sortConfig.key === header.key} sortDirection={sortConfig.key === header.key ? sortConfig.direction : undefined}>
                      {header.label}
                    </SortableHeader>
                  ))}
                  <TableHead className="px-6 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
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
                  const vehicle = actualVehicles.find(v => v.id === row.vehicleId);
                  const tankCapacity = vehicle?.fuelTankCapacity || 0;
                  const latestFilling = details.length > 0 ? details[details.length - 1] : null;
                  const availableFuel = latestFilling?.afterFilling || 0;

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className="bg-card hover:bg-muted/50 border-b">
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.vehicleId}</TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">{row.vehicleName}</TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.fillingCount}</TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalFilling.toFixed(1)}</TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <Button variant="link" onClick={() => toggleRow(row.id)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                            Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={headers.length + 1} className="p-0">
                            <div className="bg-muted/50 p-8">
                              <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                                <div className="p-6 border-b">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <h5 className="text-lg font-semibold text-foreground">Filling Log: {row.vehicleName}</h5>
                                        <p className="text-sm text-muted-foreground">Detailed filling breakdown for {format(parse(row.date, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="p-1 border rounded-lg flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30">
                                          <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-md">
                                            <Fuel className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                          </div>
                                          <div>
                                            <p className="text-[9px] font-medium text-blue-600 dark:text-blue-400 leading-tight">FUEL TANK CAPACITY</p>
                                            <p className="text-lg font-bold text-foreground leading-tight">{tankCapacity}L</p>
                                          </div>
                                        </div>
                                        <div className="p-1 border rounded-lg flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30">
                                          <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded-md">
                                            <Droplets className="h-4 w-4 text-green-600 dark:text-green-400" />
                                          </div>
                                          <div>
                                            <p className="text-[9px] font-medium text-green-600 dark:text-green-400 leading-tight">AVAILABLE FUEL IN TANK</p>
                                            <p className="text-lg font-bold text-foreground leading-tight">{availableFuel.toFixed(0)}L</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <Button variant="outline" onClick={() => handleViewGraph(row)}>View Graph</Button>
                                  </div>
                                </div>
                                <ScrollArea className="h-[240px]">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-card z-10">
                                      <TableRow>
                                        <SortableHeader onClick={() => handleDetailsSort('beforeFillingDate')} isSorted={detailsSortConfig.key === 'beforeFillingDate'} sortDirection={detailsSortConfig.direction}>Before Filling Date</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('beforeFilling')} isSorted={detailsSortConfig.key === 'beforeFilling'} sortDirection={detailsSortConfig.direction}>Before Filling (L)</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('afterFillingDate')} isSorted={detailsSortConfig.key === 'afterFillingDate'} sortDirection={detailsSortConfig.direction}>After Filling Date</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('afterFilling')} isSorted={detailsSortConfig.key === 'afterFilling'} sortDirection={detailsSortConfig.direction}>After Filling (L)</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Filling Duration</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('filling')} isSorted={detailsSortConfig.key === 'filling'} sortDirection={detailsSortConfig.direction}>Filling (L)</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('fillingStation')} isSorted={detailsSortConfig.key === 'fillingStation'} sortDirection={detailsSortConfig.direction}>Filling Station</SortableHeader>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sortedDetails.length > 0 ? (
                                        sortedDetails.map((detail) => (
                                            <TableRow key={detail.id} className="hover:bg-muted/50">
                                              <TableCell className="font-mono text-sm">{format(parse(detail.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date()), 'dd-MM-yyyy HH:mm')}</TableCell>
                                              <TableCell className="font-mono text-sm">{detail.beforeFilling.toFixed(1)}</TableCell>
                                              <TableCell className="font-mono text-sm">{format(parse(detail.afterFillingDate, 'yyyy-MM-dd HH:mm', new Date()), 'dd-MM-yyyy HH:mm')}</TableCell>
                                              <TableCell className="font-mono text-sm">{detail.afterFilling.toFixed(1)}</TableCell>
                                              <TableCell className="font-mono text-sm">{detail.duration} min</TableCell>
                                              <TableCell className="font-semibold text-green-600 text-sm">{detail.filling.toFixed(1)}</TableCell>
                                              <TableCell className="text-sm truncate">{detail.fillingStation}</TableCell>
                                            </TableRow>
                                          )
                                        )
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={7} className="h-24 text-center">No filling details available for this day.</TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </ScrollArea>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
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
            <span className="text-sm text-muted-foreground">{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, sortedData.length)} of {sortedData.length}</span>
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