import React, { useState, useMemo, useEffect, useRef } from 'react';
import {  Table,  TableBody,  TableCell,  TableHead,  TableHeader,  TableRow,} from '@/components/ui/table';
import {  Card,  CardContent,  CardDescription,  CardFooter,  CardHeader,  CardTitle,} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {VehicleSpeedSummary} from '@/types';
import {  ArrowUp,  ArrowDown,  ChevronLeft,  ChevronRight,  ChevronsLeft,  ChevronsRight,  Download,  CalendarIcon,  ChevronDown,  TrendingUp,  Gauge,  Activity,  ChevronsUpDown,
  FileSpreadsheet,  FileText,} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, endOfDay,format, startOfDay,  } from 'date-fns';
import { cn } from '@/lib/utils';
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {useVehicleList } from '@/hooks/useApi';
import { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { API_BASE_URL } from '@/config/Api';
import { useSearchParams } from 'react-router-dom';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import LocationDialogCommon from './LocationDialogCommon';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { LoadScript} from '@react-google-maps/api';

import { useReportDownload } from '@/hooks/useApi';

type ReportDataKey = keyof VehicleSpeedSummary;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'overspeedCount', label: 'Overspeed Count' },
  { key: 'totalOverspeedDuration', label: 'Total Duration (s)' },
  { key: 'maxSpeed', label: 'Max. Speed (km/h)' },
  { key: 'avgSpeed', label: 'Avg. Speed (km/h)' },
];

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  // { label: 'Last 2 Months', value: 'last-2-months' },
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
 
  const [searchTerm, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
 const [sortConfig, setSortConfig] = useState({
  key: 'vehicleName' as ReportDataKey,
  direction: 'asc' as 'asc' | 'desc',
  sortColumn: 'vehname',
  sortDirection: 'asc' as 'asc' | 'desc',
});

const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  return {
    from: today,
    to: today,
  };
};

  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dateTime', direction: 'desc' });
  const [date, setDate] = useState<DateRange | undefined>(getDefaultDateRange());
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status');
  const vehicleFromUrl = searchParams.get('vehicle');
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOverspeedOnly, setShowOverspeedOnly] = useState(false);

  //=== bind vehicle list using common API
  const { data: vehicleOptions } = useVehicleList();
  const vehicleSearchOptions = [{ label: 'All', value: 'all' }, ...(vehicleOptions ?? [])];
//============================

  const [speedData, setSpeedData] = useState<VehicleSpeedSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDate, setTempDate] = useState<DateRange | undefined>(getDefaultDateRange());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  // For Live Location Dialog
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);
  //==========================
  const authData = JSON.parse(   localStorage.getItem("trackmaster-auth") || "{}"   );
 
  const requestModel: DataTableRequestModel = {
  sEcho: 1,
  CustId: authData?.custId || 0,
  iDisplayStart: page === 0 ? 0 : page * rowsPerPage + 1,
  iDisplayLength: (page + 1) * rowsPerPage,
  sSearch: searchTerm || "",
  sortColumn: sortConfig.sortColumn,
  sortDirection: sortConfig.sortDirection,
  Status: statusFromUrl || null,
  beginDate: date?.from ? format(startOfDay(date.from), "yyyy-MM-dd HH:mm:ss")  : "",
  endDate: date?.to  ? format(endOfDay(date.to), "yyyy-MM-dd HH:mm:ss")  : "",
 
};

const getSpeedAnalysis = async (
  requestModel: DataTableRequestModel
): Promise<VehicleSpeedSummary[]> => {
  try {
    setLoading(true);

    const queryParams = new URLSearchParams({
      mode: "over",
      sEcho:String(requestModel.sEcho),
      CustId: String(requestModel.CustId),
      iDisplayStart: String(requestModel.iDisplayStart),
      iDisplayLength: String(requestModel.iDisplayLength),
      sSearch: selectedVehicle === "all" ? "" : selectedVehicle,
      sortColumn: requestModel.sortColumn || "",
      sortDirection: requestModel.sortDirection || "",
      Status: requestModel.Status || "",
      beginDate: requestModel.beginDate || "",
      endDate: requestModel.endDate || "",
    });

    const response = await fetch(`${API_BASE_URL}/Reports/getSpeedReport?${queryParams.toString()}` );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error Response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    setTotalRecords(Number(result.iTotalRecords || 0));
  

  const rows = Array.isArray(result?.aaData?.oSmainLst) ? result.aaData.oSmainLst : [];
  return rows.map((item: any) => ({
      vehicleId: item.bbid,
      vehicleName: item.vehName,
      driverName: item.driverName,
      overSpeedVal: Number(item.overSpeedVal ?? 0),
      overspeedCount: item.overspeedCount ?? 0,
      maxSpeed: Number(item.maxSpeed ?? 0),
      avgSpeed: item.overspeedCount > 0 ? parseFloat((item.totalSpeed / item.overspeedCount).toFixed(1)) : 0,
      totalOverspeedDuration: item.overSpeedDuration ?? "",

      details: Array.isArray(item.oSsublst)
        ? item.oSsublst.map((log: any, index: number) => ({
            id: index,
            dateTime: log.dateTime,
            location: log.location ?? "",
            latitude: Number(log.latitude ?? 0),
            longitude: Number(log.longitude ?? 0) ,
            speed: Number(log.speed ?? 0),
          }))
        : [],
    }));
    } catch (error) {
      console.error(error);
      return [ ];
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  const fetchData = async () => {
    const data = await getSpeedAnalysis(requestModel);
    setSpeedData(data);
  };

  fetchData();
}, [page,  rowsPerPage,  searchTerm,  sortConfig,  selectedVehicle,  date,  statusFromUrl,]);
 

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
  let data = speedData;

  if (selectedVehicle && selectedVehicle !== "all") {
    data = data.filter(item => item.vehicleId === selectedVehicle);
  }

  if (showOverspeedOnly) {
    data = data.filter(item => item.overspeedCount > 0);
  }

  return data;
}, [speedData, selectedVehicle, showOverspeedOnly]);
  

  const handleSort = (key: ReportDataKey) => {
  let direction: 'asc' | 'desc' = 'asc';

  if (
    sortConfig.key === key &&
    sortConfig.direction === 'asc'
  ) {
    direction = 'desc';
  }

  setSortConfig({
    key,
    direction,

    sortColumn: key,
    sortDirection: direction,
  });

  setPage(0);
};

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleOpenLiveLocation = (
  vehicle: VehicleSpeedSummary,
  detail: any
) => {
  setSelectedLocation({
    vehicleId: vehicle.vehicleId,
    vehicle: vehicle.vehicleName,
    driverName: vehicle.driverName,
    dateTime: detail.dateTime,
    location: detail.location,
    lat: detail.latitude,
    lng: detail.longitude,
    speed: detail.speed,
    // status: "Running", // or whatever default
    // type:"truck",
    latLongHistory: [
      {
        lat: detail.latitude,
        lng: detail.longitude,
      },
    ],
  });

  setIsLiveLocationOpen(true);
};
//======= DOWNLOAD HANDLERS (PDF & EXCEL) ========
// const { exportExcel, exportPdf } = useReportDownload(
//   "/Reports/getSpeedReport",
//   requestModel,
//   { mode: "over" }
// );
const {
  exportExcel: originalExportExcel,
  exportPdf: originalExportPdf,
} = useReportDownload(
  "/Reports/getSpeedReport",
  requestModel,
  { mode: "over" }
);

const exportExcel = async () => {
  try {
    setLoading(true);
    await originalExportExcel();
  } finally {
    setLoading(false);
  }
};

const exportPdf = async () => {
  try {
   setLoading(true);
    await originalExportPdf();
  } finally {
    setLoading(false);
  }
};
  //=====================

  const paginatedData = sortedData;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage,  totalRecords);
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
      loadingElement={<div className="w-full h-full" />}
    >
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
          
          <VehicleCombobox vehicles={vehicleSearchOptions}
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
            className="w-full sm:w-[180px]" />
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
              <DropdownMenuItem onSelect={exportPdf}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <WhatsappPopup />
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
         {loading && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
      <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
      <span>Please wait...</span>
    </div>
  </div>
  )}

  <div className="overflow-x-auto">
    <Table>
      {/* Existing Table Code */}
    </Table>
  </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                {headers.map((header) => (
                  <SortableHeader key={header.key as string} onClick={() => handleSort(header.key)} 
                  isSorted={sortConfig.sortColumn === header.key}
                  sortDirection={
                    sortConfig.sortColumn === header.key
                      ? sortConfig.sortDirection
                      : undefined
                  }>
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
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalOverspeedDuration}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.maxSpeed.toFixed(1)}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.avgSpeed.toFixed(1)}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {row.details?.length > 0 ? (
                        <Button variant="link" onClick={() => toggleRow(row.vehicleId)} 
                        className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
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
                                        <TableCell className="font-mono text-sm whitespace-nowrap">
                                          {detail.dateTime
                                            ? format(
                                                new Date(detail.dateTime),
                                                'dd-MM-yyyy HH:mm:ss'
                                              )
                                            : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm  whitespace-normal break-words">
                                          <div
                                          className="font-medium text-brand-blue dark:text-blue-400 cursor-pointer hover:underline max-w-xs "
                                            onClick={() =>
                                              handleOpenLiveLocation(row, detail)
                                            }
                                          >
                                            <div
                                              dangerouslySetInnerHTML={{
                                                __html: detail.location,
                                              }}
                                            />
                                          </div>
                                          
                                      
                                          </TableCell>
                                        <TableCell className={cn("font-semibold", detail.speed > row.overSpeedVal  ? "text-red-500" : "text-foreground")}>{detail.speed}</TableCell>
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
          <Select  value={String(rowsPerPage)}  onValueChange={(value) => { setRowsPerPage(Number(value));  setPage(0); }}>
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
            <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{firstRowIndex}-{lastRowIndex} of {totalRecords}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
        
      </CardFooter>
      
      <LocationDialogCommon
          open={isLiveLocationOpen}
          onOpenChange={setIsLiveLocationOpen}
          vehicle={selectedLocation}
        />
    </Card>
    </LoadScript>
  );
};

export default SpeedAnalysisTable;