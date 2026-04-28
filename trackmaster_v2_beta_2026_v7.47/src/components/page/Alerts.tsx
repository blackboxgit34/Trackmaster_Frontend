import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Thermometer,
  ShieldAlert,
  MapPin,
  BatteryWarning,
  Wrench,
  FileText,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { alertsData, vehicles, actualVehicles } from '@/data/mockData';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format } from 'date-fns';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import NotFound from './NotFound';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const alertTypes = [
  { name: 'High RPM', slug: 'high-rpm', icon: Gauge },
  { name: 'Engine Temp', slug: 'engine-temp', icon: Thermometer },
  { name: 'Error Code', slug: 'error-code', icon: ShieldAlert },
  { name: 'Geofencing', slug: 'geofencing', icon: MapPin },
  { name: 'Low Battery', slug: 'low-battery', icon: BatteryWarning },
  { name: 'Service', slug: 'service', icon: Wrench },
];

type AlertDataKey = keyof typeof alertsData;
type AlertRecord = (typeof alertsData)['Error Code'][0];
type AlertRecordKey = keyof AlertRecord;

type ColumnConfig = {
  key: AlertRecordKey;
  header: string;
};

const alertColumnConfig: Record<string, ColumnConfig[]> = {
  'High RPM': [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'RPM Value' },
    { key: 'location', header: 'Location' },
  ],
  'Engine Temp': [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'Temperature' },
    { key: 'location', header: 'Location' },
  ],
  'Error Code': [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'Error Code' },
    { key: 'description', header: 'Description' },
    { key: 'location', header: 'Location' },
  ],
  Geofencing: [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'Event' },
    { key: 'location', header: 'Location' },
  ],
  'Low Battery': [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'Voltage' },
    { key: 'location', header: 'Location' },
  ],
  Service: [
    { key: 'dateTime', header: 'Date & Time' },
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'vehicleName', header: 'Vehicle Name' },
    { key: 'value', header: 'Details' },
    { key: 'location', header: 'Location' },
  ],
};

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const vehicleTypes = ['All Types', ...Array.from(new Set(actualVehicles.map(m => m.type)))];
const vehicleTypeMap = new Map(actualVehicles.map(m => [m.id, m.type]));

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

const Alerts = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const activeAlertInfo = alertTypes.find((t) => t.slug === subpage);
  if (!activeAlertInfo) {
    return <NotFound />;
  }
  const activeAlert = activeAlertInfo.name as AlertDataKey;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: AlertRecordKey;
    direction: 'asc' | 'desc';
  }>({ key: 'dateTime', direction: 'desc' });

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      try {
        const fromDate = parse(fromParam, 'yyyy-MM-dd', new Date());
        const toDate = parse(toParam, 'yyyy-MM-dd', new Date());
        return { from: startOfDay(fromDate), to: endOfDay(toDate) };
      } catch (e) {
        console.error("Invalid date in URL params", e);
      }
    }
    return { from: subWeeks(new Date(), 1), to: new Date() };
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');

  const currentAlerts = alertsData[activeAlert] || [];
  const columns = alertColumnConfig[activeAlert] || [];

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    const params = new URLSearchParams(searchParams);
    if (newDate?.from) {
      params.set('from', format(newDate.from, 'yyyy-MM-dd'));
    } else {
      params.delete('from');
    }
    if (newDate?.to) {
      params.set('to', format(newDate.to, 'yyyy-MM-dd'));
    } else {
      params.delete('to');
    }
    setSearchParams(params, { replace: true });
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
    handleDateChange({ from: fromDate, to: now });
  };

  const filteredAndSortedData = useMemo(() => {
    let filteredData = [...currentAlerts];

    // Filter by date
    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      
      filteredData = filteredData.filter(alert => {
        try {
          const alertDate = parse(alert.dateTime, 'yyyy-MM-dd HH:mm', new Date());
          return isWithinInterval(alertDate, { start, end });
        } catch (e) {
          console.error("Error parsing date:", alert.dateTime, e);
          return false;
        }
      });
    }

    // Filter by vehicle type
    if (selectedVehicleType !== 'all') {
      filteredData = filteredData.filter(alert => {
        const vehicleType = vehicleTypeMap.get(alert.vehicleId);
        return vehicleType === selectedVehicleType;
      });
    }

    // Filter by vehicle
    if (selectedVehicle !== 'all') {
      filteredData = filteredData.filter(alert => alert.vehicleId === selectedVehicle);
    }

    // Sort data
    const sortableData = [...filteredData];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
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
  }, [currentAlerts, sortConfig, date, selectedVehicle, selectedVehicleType]);

  const handleSort = (key: AlertRecordKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const handleExportCSV = () => {
    if (filteredAndSortedData.length === 0) return;
    const dataToExport = filteredAndSortedData.map(row => {
      const newRow: { [key: string]: any } = {};
      columns.forEach(col => {
        newRow[col.header] = row[col.key];
      });
      return newRow;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeAlert}-alerts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredAndSortedData.length === 0) return;
    const doc = new jsPDF();
    
    const tableColumn = columns.map(col => col.header);
    const tableRows = filteredAndSortedData.map(row => {
      return columns.map(col => {
        const value = row[col.key];
        return value !== null && value !== undefined ? String(value) : '';
      });
    });

    doc.text(`${activeAlert} Alerts Report`, 14, 15);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`${activeAlert}-alerts-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const paginatedData = filteredAndSortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    filteredAndSortedData.length
  );

  return (
    <div className="flex h-full bg-muted/40 p-4 gap-4">
      <aside className="w-64 flex-shrink-0 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
        <div className="flex flex-col gap-2">
          {alertTypes.map((alert) => (
            <Button
              key={alert.name}
              variant={activeAlert === alert.name ? 'default' : 'outline'}
              className={cn(
                'w-full justify-start gap-3 px-4 py-6 text-sm',
                activeAlert === alert.name
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-card text-foreground hover:bg-muted'
              )}
              onClick={() => {
                navigate(`/alerts/${alert.slug}`);
                setPage(0);
              }}
            >
              <alert.icon className="h-5 w-5" />
              {alert.name}
            </Button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <Card className="shadow-sm overflow-hidden flex-1 flex flex-col">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                {activeAlert} Report
              </CardTitle>
              <CardDescription>
                Detailed log of {activeAlert.toLowerCase()} alerts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
              <Popover>
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
              <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type} value={type === 'All Types' ? 'all' : type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VehicleCombobox
                vehicles={vehicles}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                className="w-full sm:w-[180px]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
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
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                    {columns.map((header) => (
                      <SortableHeader
                        key={header.key as string}
                        onClick={() => handleSort(header.key)}
                        isSorted={sortConfig.key === header.key}
                        sortDirection={
                          sortConfig.key === header.key
                            ? sortConfig.direction
                            : undefined
                        }
                      >
                        {header.header}
                      </SortableHeader>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow
                        key={index}
                        className="bg-card hover:bg-muted/50 border-b"
                      >
                        {columns.map((col) => (
                          <TableCell
                            key={col.key as string}
                            className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground"
                          >
                            {row[col.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No Data
                      </TableCell>
                    </TableRow>
                  )}
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
                <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-indigo-500">
                  <SelectValue placeholder={rowsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {filteredAndSortedData.length > 0
                  ? `${firstRowIndex}-${lastRowIndex} of ${filteredAndSortedData.length}`
                  : '0-0 of 0'}
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
                  onClick={() =>
                    setPage((prev) => Math.max(prev - 1, 0))
                  }
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages - 1))
                  }
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
      </main>
    </div>
  );
};

export default Alerts;