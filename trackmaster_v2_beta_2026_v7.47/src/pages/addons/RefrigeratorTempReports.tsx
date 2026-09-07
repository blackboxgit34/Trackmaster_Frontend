import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { actualVehicles, vehicles } from '@/data/mockData';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Download,
  Thermometer,
  Droplets,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  Power,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '@/components/WhatsappPopup';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { useSettings } from '@/context/SettingsContext';
import { formatAppDate, formatAppTime, formatAppDateTime } from '@/lib/date-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- VEHICLE ICON BADGE (MATCHING FUEL THEFT REPORT TABLE) ---
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

// --- INTERVAL OPTIONS ---
const intervalOptions = [
  { value: '1', label: '1 Minute' },
  { value: '5', label: '5 Minutes' },
  { value: '10', label: '10 Minutes' },
  { value: '20', label: '20 Minutes' },
  { value: '30', label: '30 Minutes' },
  { value: '60', label: '1 Hour' },
];

// --- MOCK DATA ---
const reeferVehicles = actualVehicles.filter((v, i) => v.type === 'Reefer' || i % 4 === 0).map((v, i) => {
  const setPoint = i % 2 === 0 ? -18 : 2;
  const minSafe = setPoint === -18 ? -22 : 0;
  const maxSafe = setPoint === -18 ? -15 : 5;

  const currentTemp = parseFloat((setPoint + (Math.random() * 4 - 1.5)).toFixed(1));
  const highestTemp = parseFloat((Math.max(currentTemp, maxSafe) + Math.random() * 1.5).toFixed(1));
  const lowestTemp = parseFloat((Math.min(currentTemp, minSafe) - Math.random() * 1.2).toFixed(1));

  const relativeHumidity = Math.floor(Math.random() * (85 - 40 + 1)) + 40; // 40% to 85%
  const highestHumidity = Math.min(98, relativeHumidity + Math.floor(Math.random() * 12 + 3));
  const lowestHumidity = Math.max(25, relativeHumidity - Math.floor(Math.random() * 10 + 2));
  const targetHumidity = '60% - 80%';

  let status: 'COMPLIANT' | 'WARNING' | 'CRITICAL' = 'COMPLIANT';
  if (currentTemp > maxSafe + 1.5 || currentTemp < minSafe - 1.5) status = 'CRITICAL';
  else if (currentTemp > maxSafe || currentTemp < minSafe) status = 'WARNING';

  let humidityStatus: 'OPTIMAL' | 'HIGH' | 'LOW' = 'OPTIMAL';
  if (relativeHumidity > 80) humidityStatus = 'HIGH';
  else if (relativeHumidity < 45) humidityStatus = 'LOW';

  return {
    vehicleId: v.id,
    vehicleName: v.name,
    vehicleType: v.type || 'Truck',
    setPoint,
    minSafe,
    maxSafe,
    currentTemp,
    highestTemp,
    lowestTemp,
    relativeHumidity,
    highestHumidity,
    lowestHumidity,
    targetHumidity,
    status,
    humidityStatus,
  };
});

// Mock telemetry detail logs generator
const generateTempDetails = (vehicleId: string, intervalMinutes: string = '20', timeFormat: '12h' | '24h' = '12h') => {
  const details = [];
  const baseVehicle = reeferVehicles.find(v => v.vehicleId === vehicleId);
  const baseTemp = baseVehicle?.currentTemp || 2;
  const baseHum = baseVehicle?.relativeHumidity || 60;
  const intervalNum = parseInt(intervalMinutes, 10) || 20;

  for (let i = 0; i < 12; i++) {
    const time = new Date();
    time.setMinutes(time.getMinutes() - (i * intervalNum));

    // AC Status mock logic: ON for most readings, OFF periodically
    const acStatus: 'ON' | 'OFF' = (i % 5 === 2 || i % 5 === 4) ? 'OFF' : 'ON';

    details.push({
      id: `${vehicleId}-${intervalMinutes}-${i}`,
      time: formatAppTime(time, timeFormat),
      fullDate: formatAppDate(time),
      rawTime: format(time, 'dd-MM-yyyy HH:mm:ss'),
      temp: parseFloat((baseTemp + (Math.random() * 2 - 1)).toFixed(1)),
      humidity: Math.max(20, Math.min(98, Math.floor(baseHum + (Math.random() * 6 - 3)))),
      acStatus,
      location: `Checkpoint ${String.fromCharCode(65 + (i % 5))} (KM ${20 * i})`,
      speed: i % 4 === 0 ? 0 : Math.floor(Math.random() * 45 + 35),
    });
  }
  return details;
};

const RefrigeratorTempReports = () => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';

  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof typeof reeferVehicles[0];
    direction: 'asc' | 'desc';
  }>({ key: 'currentTemp', direction: 'desc' });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [intervalFilter, setIntervalFilter] = useState('20');

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const filteredData = useMemo(() => {
    let data = [...reeferVehicles];

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }

    return data;
  }, [selectedVehicle]);

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

  const handleSort = (key: keyof typeof reeferVehicles[0]) => {
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

  const generateExportData = () => {
    return sortedData.map(row => ({
      'Vehicle ID': row.vehicleId,
      'Vehicle Name': row.vehicleName,
      'Current Temp (°C)': row.currentTemp,
      'Temp Range (°C)': `${row.lowestTemp}°C to ${row.highestTemp}°C`,
      'Current Humidity (%)': row.relativeHumidity,
      'Humidity Range (%)': `${row.lowestHumidity}% to ${row.highestHumidity}%`,
      'Target Humidity': row.targetHumidity,
      'Compliance Status': row.status,
      'Humidity Status': row.humidityStatus,
      'Log Interval': `${intervalFilter} Mins`,
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));
    doc.setFontSize(16);
    doc.text('Refrigerator Temperature & Humidity Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatAppDateTime(new Date(), timeFormat)} | Monitored Units: ${exportData.length}`, 14, 22);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 28 });
    doc.save(`refrigerator-temp-humidity-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `refrigerator-temp-humidity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        total: 0,
        compliant: 0,
        warning: 0,
        critical: 0,
        avgTemp: '0.0',
        avgHumidity: 0,
      };
    }
    const compliant = filteredData.filter(item => item.status === 'COMPLIANT').length;
    const warning = filteredData.filter(item => item.status === 'WARNING').length;
    const critical = filteredData.filter(item => item.status === 'CRITICAL').length;
    const sumTemp = filteredData.reduce((acc, item) => acc + item.currentTemp, 0);
    const sumHumidity = filteredData.reduce((acc, item) => acc + item.relativeHumidity, 0);

    return {
      total,
      compliant,
      warning,
      critical,
      avgTemp: (sumTemp / total).toFixed(1),
      avgHumidity: Math.round(sumHumidity / total),
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

        {/* Compliant Units */}
        <Card className="p-3.5 shadow-sm border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Compliant</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.compliant}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">In Safe Range</p>
        </Card>

        {/* Warning Units */}
        <Card className="p-3.5 shadow-sm border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Warning</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-amber-500">{stats.warning}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Near Limits</p>
        </Card>

        {/* Critical Excursions */}
        <Card className="p-3.5 shadow-sm border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Critical</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Temp Excursions</p>
        </Card>

        {/* Avg Fleet Temp */}
        <Card className="p-3.5 shadow-sm border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Fleet Temp</span>
            <Thermometer className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.avgTemp}°C</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Mean Temperature</p>
        </Card>

        {/* Avg Fleet Humidity */}
        <Card className="p-3.5 shadow-sm border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Humidity</span>
            <Droplets className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.avgHumidity}%</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Mean Relative Humidity</p>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        {/* Header Toolbar matching Fuel Theft Report Table */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Refrigerator Temp & Humidity Report</CardTitle>
            <CardDescription>Overview of temperature excursions and relative humidity levels.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <VehicleCombobox vehicles={vehicles.map(v => ({ label: v.name, value: v.id }))} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <DateRangePicker date={date} setDate={setDate} />

            {/* Log Interval Filter Select */}
            <Select value={intervalFilter} onValueChange={setIntervalFilter}>
              <SelectTrigger className="w-full sm:w-[150px] bg-background text-xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Interval: {intervalOptions.find(o => o.value === intervalFilter)?.label || `${intervalFilter}m`}</span>
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                {intervalOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChevronsUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('currentTemp')}>
                  Current Temperature {sortConfig.key === 'currentTemp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('relativeHumidity')}>
                  Relative Humidity {sortConfig.key === 'relativeHumidity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                  Vehicle Name {sortConfig.key === 'vehicleName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('status')}>
                  Compliance Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                <DropdownMenuItem onClick={handleExportPDF} className="text-xs"><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs"><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <WhatsappPopup />
          </div>
        </CardHeader>

        {/* Card Content List matching Fuel Theft Report Table */}
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {paginatedData.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Thermometer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No temperature records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}

            {paginatedData.map((row) => {
              const isExpanded = expandedRows.has(row.vehicleId);
              const isCritical = row.status === 'CRITICAL';
              const isWarning = row.status === 'WARNING';
              const details = generateTempDetails(row.vehicleId, intervalFilter, timeFormat);

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
                      isCritical && "border-red-500/40 bg-red-500/5",
                      isWarning && !isExpanded && "border-amber-500/30 bg-amber-500/5"
                    )}
                  >
                    {/* Left Accent Border */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300",
                        isCritical
                          ? "bg-gradient-to-b from-red-500 to-red-600"
                          : isWarning
                            ? "bg-gradient-to-b from-amber-500 to-amber-600"
                            : isExpanded
                              ? "bg-gradient-to-b from-blue-500 to-blue-600"
                              : "bg-gradient-to-b from-emerald-400 to-emerald-600 group-hover:from-blue-400 group-hover:to-blue-500"
                      )}
                    />

                    <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 pl-5 sm:pl-7">
                      {/* Vehicle Icon Badge */}
                      <VehicleIconBadge vehicleType={row.vehicleType} />

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                          {row.vehicleName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                          {row.vehicleId}
                        </p>
                      </div>

                      {/* Current Temperature Column */}
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Current Temp
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className={cn(
                            "text-xl sm:text-2xl font-extrabold tabular-nums leading-tight",
                            isCritical ? "text-red-600 dark:text-red-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                          )}>
                            {row.currentTemp.toFixed(1)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">°C</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {row.lowestTemp}°C to {row.highestTemp}°C
                        </span>
                      </div>

                      {/* Relative Humidity Column */}
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                          Humidity Level
                        </span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 tabular-nums leading-tight">
                            {row.relativeHumidity}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">%</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Target: {row.targetHumidity}
                        </span>
                      </div>

                      {/* Compliance Status Badge */}
                      <div className="hidden md:flex items-center">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs",
                          isCritical && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse",
                          isWarning && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                          row.status === 'COMPLIANT' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}>
                          {row.status}
                        </span>
                      </div>

                      {/* Detailed log toggle */}
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
                          Temp:
                        </span>
                        <span className="text-base font-bold text-foreground tabular-nums">
                          {row.currentTemp.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Humidity:
                        </span>
                        <span className="text-base font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                          {row.relativeHumidity}%
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                        isCritical ? "bg-red-500/10 text-red-600" : isWarning ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {row.status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details Section matching Fuel Theft Report Table */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/30">
                      <div className="p-4 sm:p-6">
                        <div className="bg-card rounded-lg shadow-sm overflow-hidden border">
                          {/* Details Header */}
                          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div>
                                <h5 className="text-base font-semibold text-foreground">
                                  Telemetry Log: {row.vehicleName}
                                </h5>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Readings captured at {intervalFilter === '1' ? '1 minute' : intervalFilter === '60' ? '1 hour' : `${intervalFilter} minute`} intervals for monitored cargo
                                </p>
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-muted-foreground">Temp. Range: <strong className="text-foreground">{row.minSafe}°C - {row.maxSafe}°C</strong></span>
                                <span className="text-muted-foreground">Humidity Range: <strong className="text-cyan-600 dark:text-cyan-400">{row.targetHumidity}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Details Timeline List */}
                          <ScrollArea className="h-[280px] pr-4 mt-2">
                            {details.length > 0 ? (
                              <div className="relative pl-6 space-y-3 pb-4">
                                {details.map((detail, idx) => {
                                  const isFirst = idx === 0;
                                  const isLast = idx === details.length - 1;

                                  return (
                                    <div key={detail.id} className="relative">
                                      {/* Timeline connection lines */}
                                      {!isFirst && (
                                        <div className="absolute -left-[15px] top-0 bottom-1/2 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}
                                      {!isLast && (
                                        <div className="absolute -left-[15px] top-1/2 -bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700" />
                                      )}

                                      {/* Timeline Dot */}
                                      <div className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-full z-10 shadow-sm" />

                                      {/* Timeline Card */}
                                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors py-3 px-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                          {/* Column 1: Time & Location */}
                                          <div className="lg:col-span-3 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-bold text-foreground">{detail.time}</span>
                                              <span className="text-xs text-muted-foreground">({detail.fullDate})</span>
                                            </div>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                                              {detail.location}
                                            </span>
                                          </div>

                                          {/* Column 2 & 3: Temperature, Humidity & AC Status */}
                                          <div className="lg:col-span-7 grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            {/* Temp */}
                                            <div className="flex items-center gap-2.5">
                                              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg shrink-0">
                                                <Thermometer className="text-amber-600 dark:text-amber-400 h-4 w-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Temperature</div>
                                                <div className="text-sm font-bold text-foreground truncate">{detail.temp}°C</div>
                                              </div>
                                            </div>

                                            {/* Humidity */}
                                            <div className="flex items-center gap-2.5">
                                              <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg shrink-0">
                                                <Droplets className="text-cyan-600 dark:text-cyan-400 h-4 w-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Humidity Level</div>
                                                <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 truncate">{detail.humidity}%</div>
                                              </div>
                                            </div>

                                            {/* AC Status */}
                                            <div className="flex items-center gap-2.5">
                                              <div className={cn(
                                                "p-2 rounded-lg shrink-0 transition-colors",
                                                detail.acStatus === 'ON'
                                                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                                                  : "bg-slate-100 dark:bg-slate-800"
                                              )}>
                                                <Power className={cn(
                                                  "h-4 w-4",
                                                  detail.acStatus === 'ON'
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-slate-400 dark:text-slate-500"
                                                )} />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">AC Status</div>
                                                <div className={cn(
                                                  "text-sm font-bold truncate",
                                                  detail.acStatus === 'ON'
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-slate-600 dark:text-slate-400"
                                                )}>
                                                  {detail.acStatus === 'ON' ? 'ON' : 'OFF'}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Column 4: Speed */}
                                          <div className="lg:col-span-2 text-right flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-3 lg:pt-0 lg:pl-4">
                                            <div>
                                              <div className="text-sm font-bold text-foreground leading-none">
                                                {detail.speed} km/h
                                              </div>
                                              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Vehicle Speed</div>
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
                                  <Thermometer className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">No telemetry readings available.</p>
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

        {/* Footer matching Fuel Theft Report Table */}
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}>
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
              <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{sortedData.length > 0 ? `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedData.length)} of ${sortedData.length}` : '0 results'}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RefrigeratorTempReports;