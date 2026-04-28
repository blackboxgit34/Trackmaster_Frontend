import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { PoiCombobox } from './PoiCombobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { DateRange } from 'react-day-picker';
import { subDays, isWithinInterval, parse, startOfDay, endOfDay, subWeeks, subMonths, format } from 'date-fns';
import { vehicles } from '@/data/mockData';
import { tripReportData, type TripReportData } from '@/data/tripReportData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, ArrowUp, ArrowDown, ChevronsUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, GitBranch, PlayCircle, Calendar as CalendarIcon, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { usePois } from '@/context/PoiContext';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

type SortKey = keyof TripReportData | 'totalTime';

const SortableHeader = ({ children, sortKey, currentSort, onSort }: { children: React.ReactNode; sortKey: SortKey; currentSort: { key: SortKey; direction: 'asc' | 'desc' }; onSort: (key: SortKey) => void; }) => {
  const isSorted = currentSort.key === sortKey;
  const sortDirection = isSorted ? currentSort.direction : undefined;
  return (
    <TableHead
      className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
      onClick={() => onSort(sortKey)}
    >
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
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const TripReport = () => {
  const { pois } = usePois();
  const [startPoi, setStartPoi] = useState<string>('');
  const [endPoi, setEndPoi] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 7), to: new Date() });
  const [tripType, setTripType] = useState<'one-way' | 'two-way'>('one-way');
  const [filteredTrips, setFilteredTrips] = useState<TripReportData[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'desc' });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetSelect = (preset: 'today' | 'yesterday' | 'last-week' | 'last-month' | 'last-2-months') => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (preset) {
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
    }
    setDateRange({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  const handleApplyFilters = () => {
    let results: TripReportData[] = [];
    const baseTrips = tripReportData.filter(trip => {
      const tripDate = parse(trip.startTime, 'yyyy-MM-dd HH:mm', new Date());
      const inDateRange = dateRange?.from && dateRange?.to && isWithinInterval(tripDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
      const vehicleMatch = selectedVehicle === 'all' || trip.vehicleId === selectedVehicle;
      return inDateRange && vehicleMatch;
    });

    if (tripType === 'one-way') {
      results = baseTrips.filter(trip => trip.startPoiId === startPoi && trip.endPoiId === endPoi);
    } else { // 'two-way' logic
      const roundTrips: TripReportData[] = [];
      const tripsByVehicle = baseTrips.reduce((acc, trip) => {
        if (!acc[trip.vehicleId]) {
          acc[trip.vehicleId] = [];
        }
        acc[trip.vehicleId].push(trip);
        return acc;
      }, {} as Record<string, TripReportData[]>);

      for (const vehicleId in tripsByVehicle) {
        const vehicleTrips = tripsByVehicle[vehicleId].sort((a, b) =>
          parse(a.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime() -
          parse(b.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime()
        );

        const outboundTrips = vehicleTrips.filter(t => t.startPoiId === startPoi && t.endPoiId === endPoi);
        const inboundTrips = vehicleTrips.filter(t => t.startPoiId === endPoi && t.endPoiId === startPoi);

        const usedInboundTrips = new Set<string>();

        outboundTrips.forEach(outbound => {
          const outboundEndTime = parse(outbound.endTime, 'yyyy-MM-dd HH:mm', new Date());
          
          const correspondingInbound = inboundTrips.find(inbound =>
            !usedInboundTrips.has(inbound.id) &&
            parse(inbound.startTime, 'yyyy-MM-dd HH:mm', new Date()) > outboundEndTime
          );

          if (correspondingInbound) {
            const combinedTrip: TripReportData = {
              id: `roundtrip-${outbound.id}`,
              vehicleId: outbound.vehicleId,
              startPoiId: outbound.startPoiId,
              endPoiId: outbound.endPoiId,
              startTime: outbound.startTime,
              endTime: correspondingInbound.endTime,
              duration: outbound.duration + correspondingInbound.duration,
              stopTime: outbound.stopTime + correspondingInbound.stopTime,
              distance: outbound.distance + correspondingInbound.distance,
              fuelConsumed: outbound.fuelConsumed + correspondingInbound.fuelConsumed,
              path: [],
            };
            roundTrips.push(combinedTrip);
            usedInboundTrips.add(correspondingInbound.id);
          }
        });
      }
      results = roundTrips.sort((a, b) =>
        parse(a.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime() -
        parse(b.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime()
      );
    }

    setFilteredTrips(results);
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const sortableItems = [...filteredTrips];
    sortableItems.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'totalTime') {
            aValue = a.duration + a.stopTime;
            bValue = b.duration + b.stopTime;
        } else {
            aValue = a[sortConfig.key as keyof TripReportData];
            bValue = b[sortConfig.key as keyof TripReportData];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [filteredTrips, sortConfig]);

  const generateExportData = () => {
    return sortedData.map(trip => ({
      'Vehicle': trip.vehicleId,
      'Start Date & Time': trip.startTime,
      'End Date & Time': trip.endTime,
      'Running Time': formatMinutes(trip.duration),
      'Stop Time': formatMinutes(trip.stopTime),
      'Total Time': formatMinutes(trip.duration + trip.stopTime),
      'Distance Travelled (km)': trip.distance.toFixed(1),
      'Total Fuel Consumed (L)': trip.fuelConsumed.toFixed(1),
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row));
    doc.text("Trip Report", 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows as any, startY: 20 });
    doc.save(`trip-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trip-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedData = sortedData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );
  const pageCount = Math.ceil(sortedData.length / pagination.pageSize);
  const firstRowIndex = pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedData.length);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between p-4">
            <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">Trip Report Filters</h3>
            <div className="flex items-center gap-2">
              <PoiCombobox pois={pois} value={startPoi} onChange={setStartPoi} placeholder="Start Location" className="w-60" />
              <PoiCombobox pois={pois} value={endPoi} onChange={setEndPoi} placeholder="End Location" className="w-60" />
              <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} />
              <Select value={tripType} onValueChange={(v: 'one-way' | 'two-way') => setTripType(v)}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Trip Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One Way</SelectItem>
                  <SelectItem value="two-way">Two Way</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-[260px] justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex" align="end">
                  <div className="flex flex-col space-y-1 p-2 border-r">
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('today')}>Today</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('yesterday')}>Yesterday</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('last-week')}>Last Week</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('last-month')}>Last Month</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('last-2-months')}>Last 2 Months</Button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleApplyFilters} className="bg-indigo-600 hover:bg-indigo-700">
                <Filter className="mr-2 h-4 w-4" />
                Apply
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExportCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Found Trips ({filteredTrips.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader sortKey="vehicleId" currentSort={sortConfig} onSort={handleSort}>Vehicle</SortableHeader>
                    <SortableHeader sortKey="startTime" currentSort={sortConfig} onSort={handleSort}>Start Date & Time</SortableHeader>
                    <SortableHeader sortKey="endTime" currentSort={sortConfig} onSort={handleSort}>End Date & Time</SortableHeader>
                    <SortableHeader sortKey="duration" currentSort={sortConfig} onSort={handleSort}>Running Time</SortableHeader>
                    <SortableHeader sortKey="stopTime" currentSort={sortConfig} onSort={handleSort}>Stop Time</SortableHeader>
                    <SortableHeader sortKey="totalTime" currentSort={sortConfig} onSort={handleSort}>Total Time</SortableHeader>
                    <SortableHeader sortKey="distance" currentSort={sortConfig} onSort={handleSort}>Distance Travelled</SortableHeader>
                    <SortableHeader sortKey="fuelConsumed" currentSort={sortConfig} onSort={handleSort}>Total Fuel Consumed</SortableHeader>
                    <TableHead>Playback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(trip => {
                    const tripDate = trip.startTime.split(' ')[0];
                    return (
                      <TableRow key={trip.id}>
                        <TableCell>{trip.vehicleId}</TableCell>
                        <TableCell>{trip.startTime}</TableCell>
                        <TableCell>{trip.endTime}</TableCell>
                        <TableCell>{formatMinutes(trip.duration)}</TableCell>
                        <TableCell>{formatMinutes(trip.stopTime)}</TableCell>
                        <TableCell>{formatMinutes(trip.duration + trip.stopTime)}</TableCell>
                        <TableCell>{trip.distance.toFixed(1)} km</TableCell>
                        <TableCell>{trip.fuelConsumed.toFixed(1)} L</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon">
                                  <Link to={`/vehicle-status/route-playback?vehicle=${trip.vehicleId}&date=${tripDate}`}>
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Playback</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={String(pagination.pageSize)} onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}>
                <SelectTrigger className="w-20 h-9 text-sm"><SelectValue placeholder={pagination.pageSize} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {firstRowIndex}-{lastRowIndex} of {sortedData.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronsRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </LoadScript>
  );
};

export default TripReport;