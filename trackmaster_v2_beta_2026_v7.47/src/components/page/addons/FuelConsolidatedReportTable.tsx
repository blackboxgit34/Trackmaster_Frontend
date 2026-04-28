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
import { fuelFillingDetails, fuelTheftDetails, consolidatedReportTableData, vehicles } from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format } from 'date-fns';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

type ReportData = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  totalFilling: number;
  totalTheft: number;
  totalConsumption: number;
  netChange: number;
  mileage: number;
  totalDistance: number;
};
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'totalFilling', label: 'Total Filling (L)' },
  { key: 'totalTheft', label: 'Total Theft (L)' },
  { key: 'totalConsumption', label: 'Total Consumption (L)' },
  { key: 'netChange', label: 'Net Change (L)' },
  { key: 'totalDistance', label: 'Total Distance (km)' },
  { key: 'mileage', label: 'Mileage (km/L)' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const SortableHeader = ({ children, isSorted, sortDirection, onClick, className }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; className?: string; }) => (
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

const FuelConsolidatedReportTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>('last-week');

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
    setActiveTimeRange(range);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
  };

  const aggregatedData = useMemo(() => {
    const vehicleData = new Map<string, ReportData>();

    const start = date?.from ? startOfDay(date.from) : null;
    const end = date?.to ? endOfDay(date.to) : null;

    const isInRange = (dateStr: string) => {
      if (!start || !end) return true;
      const itemDate = parse(dateStr, 'yyyy-MM-dd', new Date());
      return isWithinInterval(itemDate, { start, end });
    };

    const vehicleFilter = (item: { vehicleId: string }) => selectedVehicle === 'all' || item.vehicleId === selectedVehicle;

    const initializeVehicle = (vehicleId: string) => {
      if (!vehicleData.has(vehicleId)) {
        vehicleData.set(vehicleId, { id: vehicleId, vehicleId: vehicleId, vehicleName: vehicles.find(v => v.id === vehicleId)?.name || vehicleId, totalFilling: 0, totalTheft: 0, totalConsumption: 0, netChange: 0, mileage: 0, totalDistance: 0 });
      }
    };

    fuelFillingDetails.filter(item => isInRange(item.date) && vehicleFilter(item)).forEach(item => {
      initializeVehicle(item.vehicleId);
      vehicleData.get(item.vehicleId)!.totalFilling += item.filling;
    });

    fuelTheftDetails.filter(item => isInRange(item.date) && vehicleFilter(item)).forEach(item => {
      initializeVehicle(item.vehicleId);
      vehicleData.get(item.vehicleId)!.totalTheft += item.drainage;
    });

    consolidatedReportTableData.filter(item => isInRange(item.date) && vehicleFilter(item)).forEach(item => {
      initializeVehicle(item.vehicleId);
      const entry = vehicleData.get(item.vehicleId)!;
      entry.totalConsumption += item.fuelConsumed;
      entry.totalDistance += item.distance || 0;
    });

    vehicleData.forEach(entry => {
      entry.netChange = entry.totalFilling - entry.totalTheft - entry.totalConsumption;
      entry.mileage = entry.totalConsumption > 0 ? entry.totalDistance / entry.totalConsumption : 0;
    });

    return Array.from(vehicleData.values());
  }, [selectedVehicle, date]);

  const sortedData = useMemo(() => {
    const sortableData = [...aggregatedData];
    sortableData.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableData;
  }, [aggregatedData, sortConfig]);

  const handleSort = (key: ReportDataKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const selectedTimeRangeLabel = timeRanges.find((r) => r.value === activeTimeRange)?.label || 'Select a time range';
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  const generateExportData = () => {
    return sortedData.map(row => ({
      'Vehicle Name': row.vehicleName,
      'Total Filling (L)': row.totalFilling.toFixed(1),
      'Total Theft (L)': row.totalTheft.toFixed(1),
      'Total Consumption (L)': row.totalConsumption.toFixed(1),
      'Net Change (L)': row.netChange.toFixed(1),
      'Total Distance (km)': row.totalDistance.toFixed(1),
      'Mileage (km/L)': row.mileage.toFixed(2),
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));
    doc.text("Fuel Consolidated Report", 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`fuel-consolidated-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fuel-consolidated-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Fuel Consolidated Report</CardTitle>
          <CardDescription>Summary of fuel activities for each vehicle.</CardDescription>
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
                  <SortableHeader key={header.key} onClick={() => handleSort(header.key)} isSorted={sortConfig.key === header.key} sortDirection={sortConfig.key === header.key ? sortConfig.direction : undefined}>
                    {header.label}
                  </SortableHeader>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(row => (
                <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">{row.vehicleName}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.totalFilling.toFixed(1)}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.totalTheft.toFixed(1)}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalConsumption.toFixed(1)}</TableCell>
                  <TableCell className={cn("px-6 py-4 whitespace-nowrap text-sm font-semibold", row.netChange >= 0 ? 'text-green-600' : 'text-red-600')}>{row.netChange.toFixed(1)}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalDistance.toFixed(1)}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.mileage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
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

export default FuelConsolidatedReportTable;