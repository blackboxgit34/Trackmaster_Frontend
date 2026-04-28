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
import { alertsData } from '@/data/mockData';
import { vehicles } from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarIcon,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay } from 'date-fns';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const geofenceViolationsData = alertsData.Geofencing.map((alert, index) => ({
  id: `GV-${index + 1}`,
  dateTime: alert.dateTime,
  machineId: alert.machineId,
  machineName: alert.machineName,
  fenceName: alert.location,
  eventType: (Math.random() > 0.5 ? 'Entry' : 'Exit') as 'Entry' | 'Exit',
}));

type ReportData = (typeof geofenceViolationsData)[0];
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'dateTime', label: 'Date & Time' },
  { key: 'machineId', label: 'Machine ID' },
  { key: 'machineName', label: 'Machine Name' },
  { key: 'fenceName', label: 'Location' },
  { key: 'eventType', label: 'Event Type' },
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

const EventTypeBadge = ({ eventType }: { eventType: 'Entry' | 'Exit' }) => {
  const isEntry = eventType === 'Entry';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        isEntry
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      )}
    >
      {eventType}
    </span>
  );
};

const GeofenceViolations = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'dateTime', direction: 'desc' });

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(
    'last-week'
  );

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

  const filteredData = useMemo(() => {
    let data = [...geofenceViolationsData];

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      data = data.filter(item => {
        const itemDate = parse(item.dateTime, 'yyyy-MM-dd HH:mm', new Date());
        return isWithinInterval(itemDate, { start, end });
      });
    }

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.machineId === selectedVehicle);
    }

    return data;
  }, [date, selectedVehicle]);

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
    return sortedData.map(row => ({
      'Date & Time': row.dateTime,
      'Machine ID': row.machineId,
      'Machine Name': row.machineName,
      'Location': row.fenceName,
      'Event Type': row.eventType,
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));

    doc.text("Geofence Violations Report", 14, 15);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`geofence-violations-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `geofence-violations-${new Date().toISOString().split('T')[0]}.csv`);
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
            Geofence Violations Report
          </CardTitle>
          <CardDescription>
            Detailed log of geofence entry and exit events.
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
                    key={header.key}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-card hover:bg-muted/50 border-b"
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.dateTime}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {row.machineId}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                    {row.machineName}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.fenceName}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <EventTypeBadge eventType={row.eventType} />
                  </TableCell>
                </TableRow>
              ))}
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

export default GeofenceViolations;