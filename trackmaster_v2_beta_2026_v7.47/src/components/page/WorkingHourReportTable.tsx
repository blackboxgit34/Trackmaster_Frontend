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
import {
  consolidatedReportTableData,
  vehicles,
  workingHourDetails,
} from '@/data/mockData';
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
  Clock,
  Activity,
  Timer,
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
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { ScrollArea } from '@/components/ui/scroll-area';

const reportData = consolidatedReportTableData;

type ReportData = (typeof reportData)[0];
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'vehicleId', label: 'Vehicle ID' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'workingHours', label: 'Working Hours (hrs)' },
];

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const SortableHeader = ({
  children,
  isSorted,
  sortDirection,
  onClick,
}: {
  children: React.ReactNode;
  isSorted?: boolean;
  sortDirection?: 'asc' | 'desc';
  onClick: () => void;
}) => (
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

const WorkingHourReportTable = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'asc' });

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(
    'last-week'
  );

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;

    switch (range) {
      case 'last-hour':
        fromDate = subHours(now, 1);
        break;
      case 'last-day':
        fromDate = subDays(now, 1);
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

    setDate({ from: fromDate, to: now });
    setActiveTimeRange(range);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
  };

  const selectedTimeRangeLabel =
    timeRanges.find((r) => r.value === activeTimeRange)?.label ||
    'Select a time range';

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

  const filteredData = useMemo(() => {
    let data = [...reportData];

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      
      data = data.filter(item => {
        try {
          const itemDate = parseISO(item.date);
          return isWithinInterval(itemDate, { start, end });
        } catch (e) {
          console.error("Invalid date format in reportData:", item.date);
          return false;
        }
      });
    }

    return data;
  }, [selectedVehicle, date]);

  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const generateExportData = () => {
    const dataToExport: any[] = [];
    sortedData.forEach(row => {
      const details = workingHourDetails
        .filter(d => d.vehicleId === row.vehicleId && d.date === row.date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (details.length > 0) {
        details.forEach(detail => {
          dataToExport.push({
            'Date': format(parseISO(row.date), 'dd-MM-yyyy'),
            'Vehicle ID': row.vehicleId,
            'Vehicle Name': row.vehicleName,
            'Total Working Hours (hrs)': row.workingHours.toFixed(1),
            'Location': row.location,
            'Session Start Time': detail.startTime,
            'Session End Time': detail.endTime,
            'Session Duration (hrs)': detail.duration.toFixed(1),
          });
        });
      } else {
        dataToExport.push({
          'Date': format(parseISO(row.date), 'dd-MM-yyyy'),
          'Vehicle ID': row.vehicleId,
          'Vehicle Name': row.vehicleName,
          'Total Working Hours (hrs)': row.workingHours.toFixed(1),
          'Location': row.location,
          'Session Start Time': 'N/A',
          'Session End Time': 'N/A',
          'Session Duration (hrs)': 'N/A',
        });
      }
    });
    return dataToExport;
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));

    doc.text("Vehicle Working Hours Report with Activity Log", 14, 15);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`vehicle-working-hours-detailed-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicle-working-hours-detailed-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    sortedData.length
  );

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Vehicle Working Hours
          </CardTitle>
          <CardDescription>
            Overview of vehicle usage and performance.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full sm:w-[180px] justify-start text-left font-normal',
                  !activeTimeRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedTimeRangeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]" align="end">
              {timeRanges.map((range) => (
                <DropdownMenuItem
                  key={range.value}
                  onClick={() => handleTimeRangeClick(range.value)}
                >
                  {range.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DateRangePicker date={date} setDate={handleDateChange} />
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            className="w-full sm:w-[180px]"
          />
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
          <WhatsappPopup />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                {headers.map((header) => (
                  <SortableHeader
                    key={header.key as string}
                    onClick={() => handleSort(header.key as ReportDataKey)}
                    isSorted={sortConfig.key === header.key}
                    sortDirection={
                      sortConfig.key === header.key
                        ? sortConfig.direction
                        : undefined
                    }
                  >
                    {header.label}
                  </SortableHeader>
                ))}
                <TableHead className="px-6 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => {
                const isExpanded = expandedRows.has(row.id);
                const details = workingHourDetails
                  .filter(
                    (d) => d.vehicleId === row.vehicleId && d.date === row.date
                  );

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

                const longestSession =
                  details.length > 0
                    ? details.reduce(
                        (max, current) =>
                          current.duration > max.duration ? current : max,
                        details[0]
                      )
                    : {
                        duration: 0,
                        startTime: 'N/A',
                        endTime: 'N/A',
                        id: null,
                      };

                const avgSessionDuration =
                  details.length > 0
                    ? details.reduce((sum, d) => sum + d.duration, 0) /
                      details.length
                    : 0;

                return (
                  <React.Fragment key={row.id}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {format(parseISO(row.date), 'dd-MM-yyyy')}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.vehicleId}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                        {row.vehicleName}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.workingHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button
                          variant="link"
                          onClick={() => toggleRow(row.id)}
                          className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1"
                        >
                          Details
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div>
                              <div className="mb-8">
                                <h4 className="text-2xl font-bold text-foreground">
                                  Activity Log: {row.vehicleName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Detailed session breakdown for {format(parseISO(row.date), 'dd-MM-yyyy')}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4 space-y-6">
                                  {/* Stat Card */}
                                  <div className="bg-card rounded-lg p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="text-sm font-medium text-muted-foreground">
                                        Total Working Hours
                                      </p>
                                      <Clock className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground">
                                      {row.workingHours.toFixed(1)} hrs
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Across {details.length} sessions
                                    </p>
                                  </div>
                                  {/* Stat Card */}
                                  <div className="bg-card rounded-lg p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="text-sm font-medium text-muted-foreground">
                                        Longest Session
                                      </p>
                                      <Timer className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground">
                                      {longestSession.duration.toFixed(1)} hrs
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      From {longestSession.startTime} to{' '}
                                      {longestSession.endTime}
                                    </p>
                                  </div>
                                  {/* Stat Card */}
                                  <div className="bg-card rounded-lg p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="text-sm font-medium text-muted-foreground">
                                        Avg. Session Duration
                                      </p>
                                      <Activity className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground">
                                      {avgSessionDuration.toFixed(1)} hrs
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Average time per work session
                                    </p>
                                  </div>
                                </div>

                                <div className="lg:col-span-8">
                                  <div className="bg-card rounded-lg p-6 shadow-sm h-full flex flex-col">
                                    <h5 className="text-lg font-semibold text-foreground mb-4">
                                      Session Details
                                    </h5>
                                    <ScrollArea className="h-[240px] pr-4">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <SortableHeader onClick={() => handleDetailsSort('startTime')} isSorted={detailsSortConfig.key === 'startTime'} sortDirection={detailsSortConfig.direction}>Start Time</SortableHeader>
                                            <SortableHeader onClick={() => handleDetailsSort('endTime')} isSorted={detailsSortConfig.key === 'endTime'} sortDirection={detailsSortConfig.direction}>End Time</SortableHeader>
                                            <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Duration (hrs)</SortableHeader>
                                            <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Location</SortableHeader>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {sortedDetails.length > 0 ? (
                                            sortedDetails.map((detail) => (
                                              <TableRow key={detail.id}>
                                                <TableCell className="font-mono text-sm">{detail.startTime}</TableCell>
                                                <TableCell className="font-mono text-sm">{detail.endTime}</TableCell>
                                                <TableCell className="text-sm font-semibold">{detail.duration.toFixed(1)}</TableCell>
                                                <TableCell className="text-sm truncate">{detail.location}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow>
                                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No session details available for this day.
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </ScrollArea>
                                  </div>
                                </div>
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
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default WorkingHourReportTable;