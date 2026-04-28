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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { batteryDisconnectionData, type BatteryDisconnectionEvent } from '@/data/batteryDisconnectionData';
import { vehicles } from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  CalendarIcon,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, isWithinInterval, parse, format, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type AggregatedData = {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  disconnectionCount: number;
  totalDisconnectionDuration: number; // in seconds
  details: BatteryDisconnectionEvent[];
};

type ReportDataKey = keyof Omit<AggregatedData, 'details'>;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleId', label: 'Registration number' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'disconnectionCount', label: 'Disconnection Count' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;

  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 1) {
    return '< 1min';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}hr`;
  }

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

const SortableHeader = ({ children, isSorted, sortDirection, onClick }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; }) => (
  <TableHead className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group" onClick={onClick}>
    <div className="flex items-center gap-2">
      {children}
      {isSorted ? (
        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
      ) : (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
      )}
    </div>
  </TableHead>
);

const BatteryDisconnectionReportTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'desc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (range) {
      case 'today': fromDate = now; break;
      case 'yesterday': fromDate = subDays(now, 1); toDate = subDays(now, 1); break;
      case 'last-week': fromDate = subWeeks(now, 1); break;
      case 'last-month': fromDate = subMonths(now, 1); break;
      case 'last-2-months': fromDate = subMonths(now, 2); break;
      default: fromDate = now;
    }
    setDate({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    let data = batteryDisconnectionData;

    if (date?.from) {
      const start = date.from;
      const end = date.to || date.from;
      data = data.filter(event => {
        const eventDate = parse(event.date, 'yyyy-MM-dd', new Date());
        return isWithinInterval(eventDate, { start, end });
      });
    }

    const aggregated = data.reduce((acc, event) => {
      if (!acc[event.vehicleId]) {
        const vehicleInfo = vehicles.find(v => v.id === event.vehicleId);
        acc[event.vehicleId] = {
          vehicleId: event.vehicleId,
          vehicleName: vehicleInfo?.name || event.vehicleId,
          driverName: 'N/A',
          disconnectionCount: 0,
          totalDisconnectionDuration: 0,
          details: [],
        };
      }
      acc[event.vehicleId].disconnectionCount++;
      acc[event.vehicleId].totalDisconnectionDuration += event.duration;
      acc[event.vehicleId].details.push(event);
      return acc;
    }, {} as Record<string, AggregatedData>);

    let finalData = Object.values(aggregated);

    if (selectedVehicle !== 'all') {
      finalData = finalData.filter(item => item.vehicleId === selectedVehicle);
    }
    
    if (sortConfig) {
      finalData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return finalData;
  }, [sortConfig, date, selectedVehicle]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Battery Disconnection Report</CardTitle>
          <CardDescription>Detailed log of battery disconnection events.</CardDescription>
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
                {date?.from ? (
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
                  <SortableHeader key={header.key as string} onClick={() => handleSort(header.key)} isSorted={sortConfig.key === header.key} sortDirection={sortConfig.key === header.key ? sortConfig.direction : undefined}>
                    {header.label}
                  </SortableHeader>
                ))}
                <TableHead className="px-6 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => {
                const isExpanded = expandedRows.has(row.vehicleId);
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
                  <React.Fragment key={row.vehicleId}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.vehicleId}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{row.vehicleName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.disconnectionCount}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button variant="link" onClick={() => toggleRow(row.vehicleId)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 2} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                              <div className="p-6 border-b">
                                <h5 className="text-lg font-semibold text-foreground">Disconnection Log for {row.vehicleName}</h5>
                                <p className="text-sm text-muted-foreground">Detailed event breakdown for the selected period.</p>
                              </div>
                              <ScrollArea className="h-[240px]">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                      <SortableHeader onClick={() => handleDetailsSort('startTime')} isSorted={detailsSortConfig.key === 'startTime'} sortDirection={detailsSortConfig.direction}>Disconnection Date</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('startLocation')} isSorted={detailsSortConfig.key === 'startLocation'} sortDirection={detailsSortConfig.direction}>Disconnection Location</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('endTime')} isSorted={detailsSortConfig.key === 'endTime'} sortDirection={detailsSortConfig.direction}>Connection Date</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('endLocation')} isSorted={detailsSortConfig.key === 'endLocation'} sortDirection={detailsSortConfig.direction}>Connection Location</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Disconnection Duration</SortableHeader>
                                      <TableHead className="w-[120px]">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortedDetails.map((detail, index) => {
                                      const isOngoing = index % 4 === 1; // Simulate some ongoing events
                                      const startTime = parse(detail.startTime, 'yyyy-MM-dd HH:mm:ss', new Date());
                                      return (
                                        <TableRow key={detail.id}>
                                          <TableCell className="font-mono text-sm">{format(startTime, 'dd-MM-yyyy HH:mm:ss')}</TableCell>
                                          <TableCell className="text-sm truncate">{detail.startLocation}</TableCell>
                                          <TableCell className="font-mono text-sm">{isOngoing ? '-' : format(parse(detail.endTime, 'yyyy-MM-dd HH:mm:ss', new Date()), 'dd-MM-yyyy HH:mm:ss')}</TableCell>
                                          <TableCell className="text-sm truncate">{detail.endLocation}</TableCell>
                                          <TableCell className="text-right">
                                            {isOngoing ? <OngoingDuration startTime={startTime} /> : <p className="font-mono text-sm">{formatDuration(detail.duration)}</p>}
                                          </TableCell>
                                          <TableCell>
                                            {isOngoing ? (
                                              <span className={cn("w-28 inline-flex justify-center px-2.5 py-1 text-xs font-semibold rounded-full", "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300")}>
                                                Disconnected
                                              </span>
                                            ) : (
                                              <span className={cn("w-28 inline-flex justify-center px-2.5 py-1 text-xs font-semibold rounded-full", "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300")}>
                                                Connected
                                              </span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
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
          <span className="text-sm text-muted-foreground">{firstRowIndex}-{lastRowIndex} of {sortedData.length}</span>
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

export default BatteryDisconnectionReportTable;