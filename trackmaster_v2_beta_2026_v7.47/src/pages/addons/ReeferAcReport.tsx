import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { actualVehicles, vehicles } from '@/data/mockData';
import {
  AirVent,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  FileSpreadsheet,
  Activity,
  Power,
  Clock,
  Repeat,
  Zap,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '@/components/WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useSettings } from '@/context/SettingsContext';
import { formatAppDateTime, formatAppDuration } from '@/lib/date-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- VEHICLE ICON BADGE (MATCHING REFRIGERATOR TEMP REPORTS) ---
const VehicleIconBadge = ({ vehicleType }: { vehicleType: string }) => {
  const imageName = vehicleType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vehicleType}
      className="flex-shrink-0 w-12 h-12 object-contain drop-shadow-sm"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
};

// --- Formatters ---
const formatMainDuration = (totalSeconds: number) => {
  return formatAppDuration(totalSeconds);
};

const formatLogDuration = (totalSeconds: number) => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '00-00:00:00';
  const d = Math.floor(totalSeconds / 86400).toString().padStart(2, '0');
  const h = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${d}-${h}:${m}:${s}`;
};

// --- Mock Data Types ---
export type ReeferAcCycle = {
  id: string;
  onTime: string;
  offTime: string;
  onLocation: string;
  offLocation: string;
  durationSeconds: number;
  startTemp: number;
  endTemp: number;
  powerSource: 'Engine Driven' | 'Electric Standby' | 'Auxiliary Diesel';
  status: 'ON' | 'OFF';
};

export type ReeferAcVehicleData = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  setPoint: number;
  currentStatus: 'ON' | 'OFF';
  totalCycles: number;
  totalDurationSeconds: number;
  lastOnTime: string;
  lastOffTime: string;
  lastOnLocation: string;
  lastOffLocation: string;
  cycles: ReeferAcCycle[];
};

// --- Generate Mock Reefer AC Data ---
const generateMockReeferAcData = (): ReeferAcVehicleData[] => {
  const data: ReeferAcVehicleData[] = [];
  const now = new Date();

  const sampleLocationsOn = [
    'Cold Storage Yard, Sector 18, Gurgaon',
    'Pharma Warehouse Gate 2, Bhiwandi, Thane',
    'Amul Distribution Center, Anand, Gujarat',
    'Fresh Cargo Terminal 3, Nh-48, Manesar',
    'Sub-Zero Logistics Hub, Inland Port, Nhava Sheva',
    'Mother Dairy Plant 4, Patparganj, Delhi',
  ];

  const sampleLocationsOff = [
    'Supermarket Regional Depot, Sector 62, Noida',
    'Central Hospital Cold Cell, Connaught Place, New Delhi',
    'Food Park Bay 9, Chakan Industrial Area, Pune',
    'Export Cold Terminal, Container Port, Chennai',
    'Metro Cash & Carry Hub, Yeshwanthpur, Bengaluru',
    'Apex Logistics Depot, Outer Ring Road, Hyderabad',
  ];

  const reeferVehiclesList = actualVehicles.filter((v, i) => v.type === 'Reefer' || i % 3 === 0);

  reeferVehiclesList.forEach((v, index) => {
    const setPoint = index % 2 === 0 ? -18 : 2;
    const cycles: ReeferAcCycle[] = [];

    const numEvents = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < numEvents; i++) {
      const daysAgo = Math.floor(Math.random() * 3);
      const startMinutesAgo = daysAgo * 1440 + Math.floor(Math.random() * 600) + (i * 180);
      const start = addMinutes(now, -startMinutesAgo);
      const durationSecs = Math.floor(Math.random() * 10800) + 1200; // 20m to 3.5h
      const end = addMinutes(start, durationSecs / 60);

      const locOn = sampleLocationsOn[(index + i) % sampleLocationsOn.length];
      const locOff = sampleLocationsOff[(index + i) % sampleLocationsOff.length];

      const startTemp = parseFloat((setPoint + (Math.random() * 3 + 1.5)).toFixed(1));
      const endTemp = parseFloat((setPoint + (Math.random() * 0.8 - 0.4)).toFixed(1));

      const isCurrentActive = i === 0 && Math.random() > 0.4;

      cycles.push({
        id: `${v.id}-ac-cycle-${i}`,
        onTime: format(start, 'yyyy-MM-dd hh:mm:ss a'),
        offTime: isCurrentActive ? 'Running...' : format(end, 'yyyy-MM-dd hh:mm:ss a'),
        onLocation: locOn,
        offLocation: isCurrentActive ? 'En Route (AC Running)' : locOff,
        durationSeconds: isCurrentActive ? Math.floor((now.getTime() - start.getTime()) / 1000) : durationSecs,
        startTemp,
        endTemp: isCurrentActive ? parseFloat((setPoint + 0.2).toFixed(1)) : endTemp,
        status: isCurrentActive ? 'ON' : 'OFF',
        powerSource: i % 4 === 0 ? 'Electric Standby' : i % 3 === 0 ? 'Auxiliary Diesel' : 'Engine Driven',
      });
    }

    cycles.sort((a, b) => new Date(b.onTime).getTime() - new Date(a.onTime).getTime());

    const totalDurationSeconds = cycles.reduce((sum, c) => sum + c.durationSeconds, 0);

    data.push({
      vehicleId: v.id,
      vehicleName: v.name,
      vehicleType: v.type || 'Truck',
      setPoint,
      currentStatus: cycles[0]?.status || 'OFF',
      totalCycles: cycles.length,
      totalDurationSeconds,
      lastOnTime: cycles[0]?.onTime || '-',
      lastOffTime: cycles[0]?.offTime || '-',
      lastOnLocation: cycles[0]?.onLocation || '-',
      lastOffLocation: cycles[0]?.offLocation || '-',
      cycles,
    });
  });

  return data;
};

const ReeferAcReport: React.FC = () => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';

  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ReeferAcVehicleData;
    direction: 'asc' | 'desc';
  }>({ key: 'totalDurationSeconds', direction: 'desc' });

  // Mock data
  const reeferAcVehicles = useMemo(() => generateMockReeferAcData(), []);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const filteredData = useMemo(() => {
    let data = [...reeferAcVehicles];

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }

    return data;
  }, [reeferAcVehicles, selectedVehicle]);

  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    sortableData.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableData;
  }, [filteredData, sortConfig]);

  const handleSort = (key: keyof ReeferAcVehicleData) => {
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

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;

  // Export Data Generation
  const generateExportData = () => {
    const flatRows: any[] = [];
    sortedData.forEach(vehicle => {
      vehicle.cycles.forEach(cycle => {
        flatRows.push({
          'Vehicle ID': vehicle.vehicleId,
          'Vehicle Name': vehicle.vehicleName,
          'AC Status': cycle.status,
          'ON Time': cycle.onTime,
          'OFF Time': cycle.offTime,
          'ON Location': cycle.onLocation,
          'OFF Location': cycle.offLocation,
          'Duration': formatMainDuration(cycle.durationSeconds),
          'Log Duration': formatLogDuration(cycle.durationSeconds),
          'Start Temp (°C)': cycle.startTemp,
          'End Temp (°C)': cycle.endTemp,
          'Power Source': cycle.powerSource,
        });
      });
    });
    return flatRows;
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF('landscape');
    const tableColumn = ['Vehicle ID', 'Vehicle Name', 'AC Status', 'ON Time', 'OFF Time', 'ON Location', 'OFF Location', 'Duration'];
    const tableRows = exportData.map(row => [
      row['Vehicle ID'],
      row['Vehicle Name'],
      row['AC Status'],
      row['ON Time'],
      row['OFF Time'],
      row['ON Location'],
      row['OFF Location'],
      row['Duration'],
    ]);

    doc.setFontSize(16);
    doc.text('Reefer AC Operation Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatAppDateTime(new Date(), timeFormat)} | Monitored Units: ${sortedData.length}`, 14, 22);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 28, styles: { fontSize: 8 } });
    doc.save(`reefer-ac-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reefer-ac-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        total: 0,
        acOn: 0,
        acOff: 0,
        totalCycles: 0,
        formattedTotalDuration: '0h 0m',
        formattedAvgDuration: '0h 0m',
      };
    }

    const acOn = filteredData.filter(v => v.currentStatus === 'ON').length;
    const acOff = filteredData.filter(v => v.currentStatus === 'OFF').length;
    const totalCycles = filteredData.reduce((acc, v) => acc + v.totalCycles, 0);
    const sumDurationSeconds = filteredData.reduce((acc, v) => acc + v.totalDurationSeconds, 0);
    const avgDurationSeconds = Math.round(sumDurationSeconds / total);

    return {
      total,
      acOn,
      acOff,
      totalCycles,
      formattedTotalDuration: formatMainDuration(sumDurationSeconds),
      formattedAvgDuration: formatMainDuration(avgDurationSeconds),
    };
  }, [filteredData]);

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Monitored Units */}
        <Card className="p-3.5 shadow-sm border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Monitored</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active Fleet Units</p>
        </Card>

        {/* AC Active (ON) */}
        <Card className="p-3.5 shadow-sm border-sky-500/30 bg-sky-500/5">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">AC Status: ON</span>
            <AirVent className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.acOn}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">AC Active</p>
        </Card>

        {/* AC Standby (OFF) */}
        <Card className="p-3.5 shadow-sm border-slate-500/30 bg-slate-500/5">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">AC Status: OFF</span>
            <Power className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.acOff}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">AC Standby</p>
        </Card>

        {/* Total Cycles */}
        <Card className="p-3.5 shadow-sm border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Cycles</span>
            <Repeat className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalCycles}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">ON/OFF Operations</p>
        </Card>

        {/* Total Run Time */}
        <Card className="p-3.5 shadow-sm border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Run Time</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 truncate">{stats.formattedTotalDuration}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative Operation</p>
        </Card>

        {/* Avg Run Time */}
        <Card className="p-3.5 shadow-sm border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Run / Unit</span>
            <Zap className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-foreground truncate">{stats.formattedAvgDuration}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Mean Operation Time</p>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        {/* Header Toolbar matching RefrigeratorTempReports */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Reefer AC Report</CardTitle>
            <CardDescription>Overview of reefer AC ON/OFF time, location, and run duration.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <VehicleCombobox vehicles={vehicles.map(v => ({ label: v.name, value: v.id }))} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <DateRangePicker date={date} setDate={setDate} />

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('totalDurationSeconds')}>
                  Total Run Time {sortConfig.key === 'totalDurationSeconds' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('totalCycles')}>
                  AC On/Off Count {sortConfig.key === 'totalCycles' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle Name {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('currentStatus')}>
                  Current AC Status {sortConfig.key === 'currentStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF} className="text-xs">
                  <FileText className="mr-2 h-4 w-4" />Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <WhatsappPopup />
          </div>
        </CardHeader>

        {/* Card Content List matching RefrigeratorTempReports */}
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {paginatedData.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <AirVent className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No reefer AC records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {paginatedData.map((row) => {
              const isExpanded = expandedRows.has(row.vehicleId);
              const isOn = row.currentStatus === 'ON';

              return (
                <div key={row.vehicleId} className="group">
                  {/* Main Vehicle Card */}
                  <div
                    className={cn(
                      "relative bg-card border rounded-xl transition-all duration-300 overflow-hidden",
                      "hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50",
                      isExpanded
                        ? "border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none"
                        : "shadow-sm",
                      isOn && "border-emerald-500/30 bg-emerald-500/5"
                    )}
                  >
                    {/* Left Accent Border */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300",
                        isOn
                          ? "bg-gradient-to-b from-emerald-400 to-emerald-600 group-hover:from-emerald-500 group-hover:to-emerald-700"
                          : isExpanded
                          ? "bg-gradient-to-b from-blue-500 to-blue-600"
                          : "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600"
                      )}
                    />

                    <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                      {/* Vehicle Icon Badge */}
                      <VehicleIconBadge vehicleType={row.vehicleType} />

                      {/* Vehicle Info (Image with Reg Number & Vehicle Type) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-[15px] font-bold text-foreground truncate leading-tight">
                            {row.vehicleId}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60 uppercase tracking-wider">
                            {row.vehicleType}
                          </span>
                        </div>
                        {row.vehicleName && row.vehicleName !== row.vehicleId && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                            {row.vehicleName}
                          </p>
                        )}
                      </div>

                      {/* Total Duration Column */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Total AC Run Time
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-extrabold tabular-nums leading-tight text-foreground">
                            {formatMainDuration(row.totalDurationSeconds)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium font-mono">
                          {formatLogDuration(row.totalDurationSeconds)}
                        </span>
                      </div>

                      {/* Total Cycles Column */}
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          AC On/Off Count
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 tabular-nums leading-tight">
                            {row.totalCycles}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Total AC Cycles
                        </span>
                      </div>

                      {/* AC Status Badge */}
                      <div className="hidden md:flex items-center">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs gap-1.5",
                          isOn
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isOn ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          )} />
                          AC {row.currentStatus}
                        </span>
                      </div>

                      {/* Detailed log toggle button */}
                      <button
                        onClick={() => toggleRow(row.vehicleId)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-1",
                          isExpanded
                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                            : "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        )}
                      >
                        <span className="hidden sm:inline">Detailed Log</span>
                        <span className="sm:hidden">Details</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    </div>

                    {/* Mobile View Summary Row */}
                    <div className="sm:hidden flex items-center justify-between px-6 pb-3 pl-7 border-t pt-2 border-border/40">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          AC Run Time:
                        </span>
                        <span className="text-base font-bold text-foreground tabular-nums">
                          {formatMainDuration(row.totalDurationSeconds)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Cycles:
                        </span>
                        <span className="text-base font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                          {row.totalCycles}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                        isOn ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600"
                      )}>
                        AC {row.currentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details Section matching RefrigeratorTempReports */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Details Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex items-center gap-3">
                                <VehicleIconBadge vehicleType={row.vehicleType} />
                                <div>
                                  <h5 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <span>{row.vehicleId}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60 uppercase tracking-wider">
                                      {row.vehicleType}
                                    </span>
                                  </h5>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {row.vehicleName && row.vehicleName !== row.vehicleId ? `${row.vehicleName} • ` : ''}AC ON/OFF cycles, geolocation landmarks, and active run durations
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                              </div>
                            </div>
                          </div>

                          {/* Details Timeline List */}
                          <ScrollArea className="h-[320px] pr-4 mt-2">
                            {row.cycles.length > 0 ? (
                              <div className="relative pl-6 space-y-3 pb-4">
                                {row.cycles.map((cycle, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === row.cycles.length - 1;
                                  const isCycleOn = cycle.status === 'ON';

                                  return (
                                    <div key={cycle.id} className="relative">
                                      {/* Timeline connection lines */}
                                      {!isFirst && (
                                        <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}
                                      {!isLast && (
                                        <div className="absolute -left-[15px] top-1/2 -bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}

                                      {/* Timeline Dot */}
                                      <div className={cn(
                                        "absolute -left-[20px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 rounded-full z-10 shadow-sm",
                                        isCycleOn ? "border-emerald-500" : "border-blue-500"
                                      )} />

                                      {/* Timeline Card */}
                                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors py-3.5 px-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                          {/* Column 1: ON/OFF Time */}
                                          <div className="lg:col-span-4 flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">ON:</span>
                                              <span className="font-medium text-foreground">{formatAppDateTime(cycle.onTime, timeFormat)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">OFF:</span>
                                              <span className={cn("font-medium", isCycleOn ? "text-emerald-600 font-semibold animate-pulse" : "text-foreground")}>
                                                {isCycleOn ? cycle.offTime : formatAppDateTime(cycle.offTime, timeFormat)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Column 2: ON & OFF Locations */}
                                          <div className="lg:col-span-5 flex flex-col gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            <div className="flex items-start gap-1.5 text-xs">
                                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                              <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                                                <strong className="text-foreground">ON:</strong> {cycle.onLocation}
                                              </span>
                                            </div>
                                            <div className="flex items-start gap-1.5 text-xs">
                                              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                              <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                                                <strong className="text-foreground">OFF:</strong> {cycle.offLocation}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Column 3: Duration */}
                                          <div className="lg:col-span-3 text-right flex flex-col items-end justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            <div className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400 font-mono leading-none">
                                              {formatMainDuration(cycle.durationSeconds)}
                                            </div>
                                            <div className="text-[10px] font-medium text-muted-foreground font-mono mt-1">
                                              ({formatLogDuration(cycle.durationSeconds)})
                                            </div>
                                          </div>

                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center p-8 mt-4">
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                                  <AirVent className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">No AC cycle events available.</p>
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Footer matching RefrigeratorTempReports */}
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}>
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
              {sortedData.length > 0 ? `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedData.length)} of ${sortedData.length}` : '0 results'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReeferAcReport;
