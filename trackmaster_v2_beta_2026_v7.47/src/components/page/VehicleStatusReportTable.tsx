import React, { useState, useMemo, useCallback } from 'react';
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
import type { VehicleStatusHistory, VehicleStatus } from '@/data/vehicleStatusHistoryData';
import { useApi, useVehicleList } from '@/hooks/useApi';
import { API_BASE_URL } from '@/config/Api';
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
  Loader,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { VehicleCombobox } from '../VehicleCombobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

type ReportDataKey = keyof Omit<VehicleStatusHistory, 'events'>;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
];

const timeRanges = [
 // { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
 // { label: 'Last 2 Months', value: 'last-2-months' },
];

const SortableHeader = ({ children, isSorted, sortDirection, onClick }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; }) => (
  <TableHead className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group" onClick={onClick}>
    <div className="flex items-center gap-2">
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

const StatusBadge = ({ status }: { status: VehicleStatus }) => {
  const styles: Record<string, string> = {
  Moving:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',

  Parked:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',

  Hispeed:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',

  Idling:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',

  Towed:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',

  Unknown:
    'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
};
  return (
    <span className={cn('w-28 inline-flex justify-center px-2.5 py-1 text-xs font-semibold rounded-full', styles[status])}>
      {status}
    </span>
  );
};

type VehicleStatusHistoryWithApi = VehicleStatusHistory & {
  bbid: string;
  overspeed: number;
};

const getDefaultDateRange = (): DateRange => {
  const today = new Date();

  return {
    from: today,
    to: today,
  };
};

const VehicleStatusReportTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dateTime', direction: 'desc' });
  const [date, setDate] = useState<DateRange | undefined>(getDefaultDateRange());
  const [tempDate, setTempDate] = useState<DateRange | undefined>(getDefaultDateRange());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: vehicleOptions } = useVehicleList();
  const vehicleSearchOptions = [{ label: 'All', value: 'all' }, ...(vehicleOptions ?? [])];
  // Ignore the vehicle dropdown selection for filtering — use search text only

  const fetchVehicleStatusReport = useCallback(async (): Promise<{
  data: VehicleStatusHistoryWithApi[];
  count: number;
}> => {
    const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
    const custId = auth.custId;
    if (!custId) {
  return {
    data: [],
    count: 0,
  };
}

    const lower = page * rowsPerPage;
    const upper = (page + 1) * rowsPerPage;
    const startDate = date?.from ? startOfDay(date.from) : undefined;
    const endDate = date?.to ? endOfDay(date.to) : undefined;
    const start = startDate
      ? format(startDate, 'yyyy-MM-dd HH:mm:ss')
      : '';

    const end = endDate
      ? format(endDate, 'yyyy-MM-dd HH:mm:ss')
      : '';

    const params = new URLSearchParams({
      custId: String(custId),
      lower: String(lower),
      upper: String(upper),
    });

    // Ignore vehicle dropdown selection; send explicit searchText or 'null'
    if (searchText.trim()) {
  params.append('search', searchText.trim());
}

    if (start) {
      params.append('start', start);
    }
    if (end) {
      params.append('end', end);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/Reports/VehicleStatus?${params}`);
      if (!response.ok) {
        return {
  data: [],
  count: 0,
};
      }
      const json = await response.json();
      console.log('API RESPONSE', json);
      return {
  data: (json?.data || []).map((item: any) => ({
    vehicleId: item.bbid ?? `bbid-${item.rowNo}`,
    vehicleName: item.vehName ?? '',
    driverName: item.driverName ?? null,
    overspeed: Number(item.overspeed) || 0,
    bbid: item.bbid ?? '',
    events: (item.logs || []).map((log: any, index: number) => ({
      id: `${item.bbid ?? 'vehicle'}-log-${index}`,
      dateTime: log.time,
      location: log.location ?? '',
      speed: Number(log.speed) || 0,
      status: log.status as VehicleStatus,
    })),
  })),
  count: json?.count || 0,
};
    } catch (error) {
      return {
  data: [],
  count: 0,
};
    }
  }, [page, rowsPerPage, searchText, date]);

 const { data: apiData, loading } = useApi(fetchVehicleStatusReport);

const reportData = apiData?.data ?? [];
const totalCount = apiData?.count ?? 0;

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
    switch (range) {
      case 'last-hour': fromDate = subHours(now, 1); break;
      case 'last-day': fromDate = subDays(now, 1); break;
      case 'last-week': fromDate = subWeeks(now, 1); break;
      case 'last-month': fromDate = subMonths(now, 1); break;
      case 'last-2-months': fromDate = subMonths(now, 2); break;
      default: fromDate = now;
    }
    setDate({ from: fromDate, to: now });
    setActiveTimeRange(range);
    setPage(0);
  };

  const selectedTimeRangeLabel = timeRanges.find((r) => r.value === activeTimeRange)?.label || 'Select a time range';

  const sortedData = useMemo(() => {
  let data = reportData;

//   if (date?.from) {
//     const start = date.from;
//     const end = date.to || date.from;

//     data = data.filter(vehicle =>
//   vehicle.events.length === 0 ||
//   vehicle.events.some(event => {
//     const eventDate = new Date(event.dateTime);

//     return isWithinInterval(eventDate, {
//       start,
//       end,
//     });
//   })
// );
//   }

  const sortableData = [...data];

  sortableData.sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null) return 1;
    if (bValue === null) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;

    return 0;
  });

  return sortableData;
}, [reportData, sortConfig, date]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const paginatedData = sortedData;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, totalCount);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Vehicle Status Report</CardTitle>
          <CardDescription>Detailed log of vehicle status changes.</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
         
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={'outline'} className={cn('w-full sm:w-[180px] justify-start text-left font-normal', !activeTimeRange && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedTimeRangeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]" align="end">
              {timeRanges.map((range) => (
                <DropdownMenuItem key={range.value} onClick={() => handleTimeRangeClick(range.value)}>
                  {range.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
                <Popover
        open={isCalendarOpen}
        onOpenChange={(open) => {
          setIsCalendarOpen(open);

          if (open) {
            setTempDate(date);
            setSelecting('start');
          }
        }}
           >
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[220px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? `${format(date.from, 'LLL dd, y')} - ${format(date.to, 'LLL dd, y')}` : format(date.from, 'LLL dd, y')
                ) : (
                  'Pick a date'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
            className="w-auto p-0"
            align="end"
            >
              <div className="p-4">
                <Calendar
  mode="range"
  initialFocus
  numberOfMonths={2}
  selected={{
    from: tempDate?.from,
    to: tempDate?.to,
  }}
  onSelect={(range, selectedDay) => {
    if (!selectedDay) return;

    // FIRST CLICK → START DATE
    if (selecting === 'start') {
      setTempDate({
        from: selectedDay,
        to: undefined,
      });

      setSelecting('end');
      return;
    }

    // SECOND CLICK → END DATE
    if (selecting === 'end') {
      const start = tempDate?.from;

      if (!start) return;

      // IF USER PICKS EARLIER DATE
      if (selectedDay < start) {
        setTempDate({
          from: selectedDay,
          to: start,
        });
      } else {
        setTempDate({
          from: start,
          to: selectedDay,
        });
      }

      setSelecting('start');
    }
  }}
/>
              </div>
              <div className="flex justify-end gap-2 border-t p-3">
                <Button size="sm" variant="outline" onClick={() => setIsCalendarOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!tempDate?.from || !tempDate?.to}
                  onClick={() => {
                    if (tempDate?.from && tempDate?.to) {
                      setDate(tempDate);
                      setActiveTimeRange(null);
                      setPage(0);
                      setIsCalendarOpen(false);
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <VehicleCombobox
  vehicles={vehicleSearchOptions}
  value={selectedVehicle}
  onChange={(value) => {
    setSelectedVehicle(value);

    // send selected vehicle in API search param
    if (value === 'all') {
      setSearchText('');
    } else {
      setSearchText(value);
    }

    setPage(0);
  }}
  className="w-full sm:w-[180px]"
/>
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
          {/* {loading && <span className="text-sm text-muted-foreground">Loading live vehicle status...</span>} */}
          <WhatsappPopup />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/90 px-4 py-2 shadow">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium text-foreground">Loading vehicle status...</span>
              </div>
            </div>
          )}
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
                const sortedDetails = [...row.events].sort((a, b) => {
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
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{row.vehicleName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.driverName || 'N/A'}</TableCell>
                   <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {row.events?.length > 0 ? (
                      <Button
                        variant="link"
                        onClick={() => toggleRow(row.vehicleId)}
                        className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1"
                      >
                        Details
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedRows.has(row.vehicleId) ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No logs</span>
                    )}
                  </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                              <div className="p-6 border-b">
                                <h5 className="text-lg font-semibold text-foreground">
                                  Status Log for {row.vehicleName}
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  Detailed status changes for the selected period.
                                </p>
                              </div>
                              <ScrollArea className="h-[240px]">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                      <SortableHeader onClick={() => handleDetailsSort('dateTime')} isSorted={detailsSortConfig.key === 'dateTime'} sortDirection={detailsSortConfig.direction}>Date Time</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Location</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('speed')} isSorted={detailsSortConfig.key === 'speed'} sortDirection={detailsSortConfig.direction}>Speed</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('status')} isSorted={detailsSortConfig.key === 'status'} sortDirection={detailsSortConfig.direction}>Status</SortableHeader>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortedDetails.map(detail => (
                                      <TableRow key={detail.id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-sm">{detail.dateTime}</TableCell>
                                        <TableCell className="text-sm truncate">{detail.location}</TableCell>
                                        <TableCell className="text-sm">{detail.speed} km/h</TableCell>
                                        <TableCell><StatusBadge status={detail.status} /></TableCell>
                                      </TableRow>
                                    ))}
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
      </div>
      </CardContent>
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
  </SelectContent>
</Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{firstRowIndex}-{lastRowIndex} of {totalCount}</span>
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

export default VehicleStatusReportTable;