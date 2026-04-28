import React, { useState, useMemo } from 'react';
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
import { speedAnalysisData, type VehicleSpeedSummary } from '@/data/speedData';
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
  TrendingUp,
  Gauge,
  Activity,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/context/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type ReportDataKey = keyof VehicleSpeedSummary;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'overspeedCount', label: 'Overspeed Count' },
  { key: 'maxSpeed', label: 'Max. Speed (km/h)' },
  { key: 'avgSpeed', label: 'Avg. Speed (km/h)' },
];

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const SortableHeader = ({ children, isSorted, sortDirection, onClick }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; }) => (
  <TableHead
    className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
    onClick={onClick}
  >
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

const SpeedAnalysisTable = () => {
  const { fleetThresholds } = useSettings();
  const OVER_SPEED_LIMIT = fleetThresholds.overspeed;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dateTime', direction: 'desc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>('last-week');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOverspeedOnly, setShowOverspeedOnly] = useState(false);

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
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
  };

  const selectedTimeRangeLabel = timeRanges.find((r) => r.value === activeTimeRange)?.label || 'Select a time range';

  const sortedData = useMemo(() => {
    let data = speedAnalysisData;
    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }
    if (showOverspeedOnly) {
      data = data.filter(item => item.overspeedCount > 0);
    }
    const sortableData = [...data];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [sortConfig, date, selectedVehicle, showOverspeedOnly]);

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

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Speed Analysis</CardTitle>
          <CardDescription>Detailed breakdown of vehicle speed events.</CardDescription>
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
          <DateRangePicker date={date} setDate={handleDateChange} />
          <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
          <div className="flex items-center space-x-2">
            <Switch id="overspeed-only" checked={showOverspeedOnly} onCheckedChange={setShowOverspeedOnly} />
            <Label htmlFor="overspeed-only" className="text-xs whitespace-nowrap">Over-speeding Only</Label>
          </div>
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
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{row.vehicleName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.driverName || 'N/A'}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.overspeedCount}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.maxSpeed.toFixed(1)}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.avgSpeed.toFixed(1)}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button variant="link" onClick={() => toggleRow(row.vehicleId)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h4 className="text-2xl font-bold text-foreground">
                                  Speed Log: {row.vehicleName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Detailed speed events for the selected period.
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <Card className="shadow-sm w-52">
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Overspeed Count</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold">{row.overspeedCount}</span>
                                      <span className="text-sm text-muted-foreground">Times</span>
                                    </div>
                                  </CardContent>
                                </Card>
                                <Card className="shadow-sm w-52">
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Max Speed</CardTitle>
                                    <Gauge className="h-4 w-4 text-muted-foreground" />
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0">
                                    <div className="text-2xl font-bold text-red-500">{row.maxSpeed.toFixed(1)} <span className="text-base font-medium text-muted-foreground">km/h</span></div>
                                  </CardContent>
                                </Card>
                                <Card className="shadow-sm w-52">
                                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">Average Speed</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0">
                                    <div className="text-2xl font-bold">{row.avgSpeed.toFixed(1)} <span className="text-base font-medium text-muted-foreground">km/h</span></div>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col">
                              <ScrollArea className="h-[300px]">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                      <SortableHeader onClick={() => handleDetailsSort('dateTime')} isSorted={detailsSortConfig.key === 'dateTime'} sortDirection={detailsSortConfig.direction}>Date Time</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Location</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('speed')} isSorted={detailsSortConfig.key === 'speed'} sortDirection={detailsSortConfig.direction}>Speed (km/h)</SortableHeader>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortedDetails.map(detail => (
                                      <TableRow key={detail.id}>
                                        <TableCell className="font-mono text-sm">{detail.dateTime}</TableCell>
                                        <TableCell className="text-sm truncate">{detail.location}</TableCell>
                                        <TableCell className={cn("font-semibold", detail.speed > OVER_SPEED_LIMIT ? "text-red-500" : "text-foreground")}>{detail.speed}</TableCell>
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

export default SpeedAnalysisTable;