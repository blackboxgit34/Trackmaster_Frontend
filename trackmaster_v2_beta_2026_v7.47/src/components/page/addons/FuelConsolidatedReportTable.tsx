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
  fuelFillingDetails, 
  fuelTheftDetails, 
  consolidatedReportTableData, 
  vehicles,
  actualVehicles,
  fuelDisconnectionDetails,
  liveStatusData
} from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, isWithinInterval, parse, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  vehicleType: string;
  totalFilling: number;
  totalTheft: number;
  totalConsumption: number;
  netChange: number;
  mileage: number;
  totalDistance: number;
  disconnectCount: number;
  currentRodStatus: string;
};
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string; width?: string }[] = [
  { key: 'vehicleName', label: 'Vehicle Details', width: 'w-[20%]' },
  { key: 'totalFilling', label: 'Total Filling (L)', width: 'w-[10%]' },
  { key: 'totalTheft', label: 'Total Theft (L)', width: 'w-[10%]' },
  { key: 'totalConsumption', label: 'Total Consumption (L)', width: 'w-[11%]' },
  { key: 'netChange', label: 'Net Change (L)', width: 'w-[10%]' },
  { key: 'totalDistance', label: 'Total Distance (km)', width: 'w-[11%]' },
  { key: 'mileage', label: 'Mileage (km/L)', width: 'w-[10%]' },
  { key: 'disconnectCount', label: 'Disconnect Count', width: 'w-[9%]' },
  { key: 'currentRodStatus', label: 'Current Rod Status', width: 'w-[9%]' },
];

const SortableHeader = ({ 
  children, 
  isSorted, 
  sortDirection, 
  onClick, 
  className 
}: { 
  children: React.ReactNode; 
  isSorted?: boolean; 
  sortDirection?: 'asc' | 'desc'; 
  onClick: () => void; 
  className?: string; 
}) => (
  <TableHead
    className={cn(
      "cursor-pointer px-2.5 sm:px-3 py-3 text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider group select-none text-left",
      className
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-1 sm:gap-1.5 justify-start">
      <span className="leading-tight">{children}</span>
      {isSorted ? (
        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 flex-shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
      )}
    </div>
  </TableHead>
);

const getSensorStatusColor = (status: string) => {
  if (status === 'Disconnected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'Dirt Error') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
};

const FuelConsolidatedReportTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');

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
        const liveStatus = liveStatusData.find(v => v.vehicleNo === vehicleId);
        let rodStatus = 'Connected';
        if (liveStatus?.sensorStatus === 'disconnected') rodStatus = 'Disconnected';
        if (liveStatus?.sensorStatus === 'dirt_error') rodStatus = 'Dirt Error';

        const vehicleObj = actualVehicles.find(v => v.id === vehicleId);

        vehicleData.set(vehicleId, { 
          id: vehicleId, 
          vehicleId: vehicleId, 
          vehicleName: vehicleObj?.name || vehicles.find(v => v.id === vehicleId)?.name || vehicleId, 
          vehicleType: vehicleObj?.type || 'Truck',
          totalFilling: 0, 
          totalTheft: 0, 
          totalConsumption: 0, 
          netChange: 0, 
          mileage: 0, 
          totalDistance: 0,
          disconnectCount: 0,
          currentRodStatus: rodStatus
        });
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

    fuelDisconnectionDetails.filter(item => item.type === 'Disconnection' && isInRange(item.date) && vehicleFilter(item)).forEach(item => {
      initializeVehicle(item.vehicleId);
      vehicleData.get(item.vehicleId)!.disconnectCount += 1;
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
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  const generateExportData = () => {
    return sortedData.map(row => ({
      'Vehicle Details': `${row.vehicleName} (${row.vehicleType})`,
      'Total Filling (L)': row.totalFilling.toFixed(1),
      'Total Theft (L)': row.totalTheft.toFixed(1),
      'Total Consumption (L)': row.totalConsumption.toFixed(1),
      'Net Change (L)': row.netChange.toFixed(1),
      'Total Distance (km)': row.totalDistance.toFixed(1),
      'Mileage (km/L)': row.mileage.toFixed(2),
      'Disconnect Count': row.disconnectCount,
      'Current Rod Status': row.currentRodStatus,
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
          <DateRangePicker date={date} setDate={setDate} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-[#ffffff] hover:bg-black/90 w-full sm:w-auto">
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
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-auto sm:table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                {headers.map((header) => (
                  <SortableHeader 
                    key={header.key} 
                    onClick={() => handleSort(header.key)} 
                    isSorted={sortConfig.key === header.key} 
                    sortDirection={sortConfig.key === header.key ? sortConfig.direction : undefined}
                    className={header.width}
                  >
                    {header.label}
                  </SortableHeader>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(row => (
                <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-sm text-foreground text-left">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`/vehicle-images/${row.vehicleType.toLowerCase().replace(/\s+/g, '-')}.png`}
                        alt={row.vehicleType}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/vehicle-images/truck.png';
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-xs sm:text-sm truncate">{row.vehicleName}</span>
                        <span className="text-[11px] text-muted-foreground font-normal capitalize">{row.vehicleType}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-green-600 font-medium">{row.totalFilling.toFixed(1)}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-red-600 font-medium">{row.totalTheft.toFixed(1)}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-muted-foreground">{row.totalConsumption.toFixed(1)}</TableCell>
                  <TableCell className={cn("px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left font-semibold", row.netChange >= 0 ? 'text-green-600' : 'text-red-600')}>{row.netChange.toFixed(1)}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-muted-foreground">{row.totalDistance.toFixed(1)}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-muted-foreground">{row.mileage.toFixed(2)}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left text-muted-foreground">{row.disconnectCount}</TableCell>
                  <TableCell className="px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm text-left">
                    <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full whitespace-nowrap inline-block", getSensorStatusColor(row.currentRodStatus))}>
                      {row.currentRodStatus}
                    </span>
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