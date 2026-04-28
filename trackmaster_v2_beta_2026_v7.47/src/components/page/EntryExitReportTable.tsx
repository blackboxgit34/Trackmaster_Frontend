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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  consolidatedReportTableData,
  vehicles,
  workingHourDetails,
  actualVehicles,
} from '@/data/mockData';
import { tripReportData } from '@/data/tripReportData';
import { poiData } from '@/data/poiData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  CalendarIcon,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const driverMap = new Map(actualVehicles.map(v => [v.id, v.driver]));
const poiMap = new Map(poiData.map(p => [p.id, p.poiName]));

type ReportData = (typeof consolidatedReportTableData)[0] & { distance: number; driverName: string; poisCovered: string; };
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'poisCovered', label: 'POIs Covered' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
];

const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

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

const EntryExitReportTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'date', direction: 'desc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [intervalFilter, setIntervalFilter] = useState('all');

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
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
      default:
        fromDate = now;
    }
    setDate({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    let data = consolidatedReportTableData.map(d => {
      const tripsForDay = tripReportData.filter(trip => trip.vehicleId === d.vehicleId && trip.startTime.startsWith(d.date));
      const poiIds = new Set<string>();
      tripsForDay.forEach(trip => {
          poiIds.add(trip.startPoiId);
          poiIds.add(trip.endPoiId);
      });
      const poisCovered = Array.from(poiIds).map(id => poiMap.get(id) || 'Unknown POI').join(', ');

      return {
        ...d,
        distance: d.distance || 0,
        driverName: driverMap.get(d.vehicleId) || 'N/A',
        poisCovered: poisCovered || 'No POIs',
      };
    });

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      data = data.filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start, end });
      });
    }

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }

    if (intervalFilter !== 'all') {
      const minDurationMinutes = parseInt(intervalFilter, 10);
      data = data.filter(row => {
        const detailsForThisRow = workingHourDetails.filter(
          detail => detail.vehicleId === row.vehicleId && detail.date === row.date
        );
        return detailsForThisRow.some(detail => (detail.duration * 60) >= minDurationMinutes);
      });
    }

    const sortableData = [...data];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [sortConfig, date, selectedVehicle, intervalFilter]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const generateExportData = () => {
    return sortedData.map(row => ({
      'Vehicle No': row.vehicleName,
      'Driver Name': row.driverName,
      'POIs Covered': row.poisCovered,
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));
    doc.text("Entry/Exit Report", 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`entry-exit-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `entry-exit-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Entry / Exit Report</CardTitle>
          <CardDescription>Daily entry and exit of vehicles.</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
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
                onSelect={setDate}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
          <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
          <Select value={intervalFilter} onValueChange={setIntervalFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="5">5 mins or more</SelectItem>
              <SelectItem value="10">10 mins or more</SelectItem>
              <SelectItem value="20">20 mins or more</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportPDF}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
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
                const isExpanded = expandedRows.has(row.id);
                const details = workingHourDetails.filter(d => d.vehicleId === row.vehicleId && d.date === row.date);
                const sortedDetails = [...details].sort((a, b) => {
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
                  <React.Fragment key={row.id}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">{row.vehicleName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.driverName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground max-w-xs truncate">{row.poisCovered}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button variant="link" onClick={() => toggleRow(row.id)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                              <div className="p-6 border-b">
                                <h5 className="text-lg font-semibold text-foreground">
                                  Trip Details for {row.vehicleName}
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  Detailed trip breakdown for {row.date}
                                </p>
                              </div>
                              <div className="p-6">
                                <ScrollArea className="h-[200px] pr-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <SortableHeader onClick={() => handleDetailsSort('startTime')} isSorted={detailsSortConfig.key === 'startTime'} sortDirection={detailsSortConfig.direction}>Entry Time</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Entry Location</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('endTime')} isSorted={detailsSortConfig.key === 'endTime'} sortDirection={detailsSortConfig.direction}>Exit Time</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Exit Location</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Duration</SortableHeader>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sortedDetails.length > 0 ? (
                                        sortedDetails.map(detail => (
                                          <TableRow key={detail.id}>
                                            <TableCell className="font-mono text-sm text-foreground">{detail.startTime}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground truncate">{detail.location}</TableCell>
                                            <TableCell className="font-mono text-sm text-foreground">{detail.endTime}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground truncate">{detail.location}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{formatDuration(detail.duration)}</TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No trip details available for this day.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </ScrollArea>
                              </div>
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

export default EntryExitReportTable;