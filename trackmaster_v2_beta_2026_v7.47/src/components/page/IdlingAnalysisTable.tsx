import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { stoppageAnalysisData, type StoppageData, type StoppageDetail } from '@/data/stoppageData';
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
  PlusCircle,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/config/Api';
import { DataTableRequestModel } from '@/hooks/DataTableRequestModel';

type IdlingReportData = {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  idlingCount: number;
  totalIdlingTime: number;
  details: StoppageData['details'];
};

type ReportDataKey = keyof IdlingReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'idlingCount', label: 'Idling Count' },
  { key: 'totalIdlingTime', label: 'Idling Duration' },
  
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Custom Date', value: 'custom' },
];

const intervalOptions = [
  { label: 'All Durations', value: '0-0' },
  { label: '< 1 min', value: '0-1' },
  { label: '1-2 mins', value: '1-2' },
  { label: '2-3 mins', value: '2-3' },
  { label: '3-5 mins', value: '3-5' },
  { label: '5-10 mins', value: '5-10' },
  { label: '10 mins and more', value: '10+' },
];

const formatDurationForReport = (totalSeconds: number) => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '0 second(s)';
  }
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} day(s)`);
  if (hours > 0) parts.push(`${hours} hour(s)`);
  if (minutes > 0) parts.push(`${minutes} minute(s)`);
  if (seconds > 0) parts.push(`${seconds} second(s)`);

  if (parts.length === 0) {
    return '0 second(s)';
  }

  return parts.join(' ');
};

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

const filterByInterval = (details: StoppageDetail[], interval: string) => {
  if (interval === 'all') return details;

  return details.filter(detail => {
    const durationInMinutes = detail.duration / 60;
    switch (interval) {
      case '0-1':
        return durationInMinutes < 1;
      case '1-2':
        return durationInMinutes >= 1 && durationInMinutes < 2;
      case '2-3':
        return durationInMinutes >= 2 && durationInMinutes < 3;
      case '3-5':
        return durationInMinutes >= 3 && durationInMinutes < 5;
      case '5-10':
        return durationInMinutes >= 5 && durationInMinutes < 10;
      case '10+':
        return durationInMinutes >= 10;
      default:
        return true;
    }
  });
};

const IdlingAnalysisTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'vehicleName', direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
 const [tempDate, setTempDate] = useState<any>();
 const [isCalendarOpen, setIsCalendarOpen] = useState(false);
 const [isCustomMode, setIsCustomMode] = useState(false);
  const [intervalFilter, setIntervalFilter] = useState('0-0');
  const [idlingAboveValue, setIdlingAboveValue] = useState(0);
  const [idlingAboveUnit, setIdlingAboveUnit] = useState<'min' | 'hr'>('min');

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
 
   let fromDate: Date = now;
   let toDate: Date = now;
 
   switch (range) {
     case 'today':
       fromDate = now;
       toDate = now;
 
       setDate({ from: fromDate, to: toDate });
       setIsCalendarOpen(false);
       break;
 
     case 'yesterday':
       fromDate = subDays(now, 1);
       toDate = subDays(now, 1);
 
       setDate({ from: fromDate, to: toDate });
       setIsCalendarOpen(false);
       break;
 
     case 'last-week':
       fromDate = subWeeks(now, 1);
       toDate = now;
 
       setDate({ from: fromDate, to: toDate });
       setIsCalendarOpen(false);
       break;
 
     case 'last-month':
       fromDate = subMonths(now, 1);
       toDate = now;
 
       setDate({ from: fromDate, to: toDate });
       setIsCalendarOpen(false);
       break;
 
     case 'custom':
       setIsCustomMode(true);
       setTempDate(date);
       break;
 
     default:
       break;
   }
 };
 
 const handleApply = () => {
   setDate(tempDate);
   setIsCalendarOpen(false);
 };
 
 const handleCancel = () => {
   setTempDate(date);
   setIsCalendarOpen(false);
 };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const idlingAboveSeconds = idlingAboveUnit === 'min' ? idlingAboveValue * 60 : idlingAboveValue * 3600;

    let data = stoppageAnalysisData
      .map(vehicle => {
        const idlingStops = vehicle.details.filter(d => d.ignitionOn && d.duration > idlingAboveSeconds);
        const filteredDetails = filterByInterval(idlingStops, intervalFilter);
        return {
          vehicleId: vehicle.vehicleId,
          vehicleName: vehicle.vehicleName,
          driverName: vehicle.driverName,
          idlingCount: filteredDetails.length,
          totalIdlingTime: filteredDetails.reduce((sum, d) => sum + d.duration, 0),
          details: filteredDetails,
        };
      })
      .filter(v => v.idlingCount > 0);

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle);
    }
    
    const sortableData = [...data];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [sortConfig, date, selectedVehicle, intervalFilter, idlingAboveValue, idlingAboveUnit]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  // const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  // const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  // const firstRowIndex = page * rowsPerPage + 1;
  // const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);
    const columnMap: Record<string, string> = {
  VehName: "VehName", 
};
// 🚗 VEHICLE LIST API
  // ===============================

  useEffect(() => {
    if (!custId) return;
    fetch(`${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`)
      .then(async (res) => {
        const text = await res.text();

        if (!text) {
          console.warn("Empty response");
          return [];
        }

        return JSON.parse(text);
      })
      .then(data => {
        const vehicles = data?.data || [];

        const formatted = [
          { label: 'All', value: '' },
          ...vehicles.map((v: any) => ({
            label: v.vehName,
            value: v.bbid
          }))
        ];
 
        setVehicleList(formatted);
      })
      .catch(err => console.error("API error:", err));
  }, []);
  
  const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
  const custId = auth.custId;
  const [apiData, setApiData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const paginatedData = apiData;

  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const firstRowIndex = totalRecords === 0 ? 0 : page * rowsPerPage + 1;

  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    totalRecords
  );
  const buildRequestModel = (): DataTableRequestModel => {

  const start = date?.from;
  const end = date?.to;

  return {
    CustId: custId,

    sEcho: 1,

    iDisplayStart: page * rowsPerPage,

    iDisplayLength: rowsPerPage,

    sSearch:
      selectedVehicle === ""
        ? ""
        : selectedVehicle || "",

    //sortColumn: "0",
sortColumn:columnMap[sortConfig?.key as string] || "VehName",
     sortDirection:
       (sortConfig?.direction?.toLowerCase() as "asc" | "desc") || "asc",

    interval: intervalFilter || undefined,

    beginDate: start
      ? new Date(
          new Date(start).setHours(0, 0, 0, 0)
        ).toISOString()
      : "",

    endDate: end
      ? new Date(
          new Date(end).setHours(23, 59, 59, 999)
        ).toISOString()
      : "",
  };
};
  // ================= API CALL =================
  const [loading, setLoading] = useState(true);

const fetchStoppageReport = useCallback(async () => {
  setLoading(true);
debugger;
  try {
    const requestModel = buildRequestModel();

    const params = new URLSearchParams(
      Object.entries(requestModel).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>
      )
    );

    const url = `${API_BASE_URL}/Reports/GetIdlingStatusReport?${params.toString()}`;

    const res = await fetch(url);

    const json = await res.json();

    console.log(json);

    setApiData(json.data || []);

    setTotalRecords(
      json.count || json.data?.length || 0
    );
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}, [
  date,
  intervalFilter,
  page,
  rowsPerPage,
  selectedVehicle,
  sortConfig,
]);
  useEffect(() => {
    fetchStoppageReport();
  }, [fetchStoppageReport]);
  if (loading) return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
      <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
      <span>Please wait...</span>
    </div>
  </div>;
  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Idling Analysis</CardTitle>
          <CardDescription>Detailed and filterable breakdown of vehicle idling events.</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
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
             <PopoverContent className="w-auto p-0 flex flex-col" align="end">
               <div className="flex">
                 
                 {/* Left Side Buttons */}
                 <div className="flex flex-col space-y-1 p-2 border-r min-w-[140px]">
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
             
                 {/* Calendar */}
                 <div className="p-3">
                   <Calendar
                     initialFocus
                     mode="range"
                     defaultMonth={tempDate?.from || date?.from}
                     selected={tempDate}
                     onSelect={(range: any) => setTempDate(range)}
                     numberOfMonths={1}
                   />
             
                   {/* Apply / Cancel Buttons */}
                   {isCustomMode && (
                     <div className="flex justify-end gap-2 mt-4">
                       <Button
                         variant="outline"
                         onClick={handleCancel}
                       >
                         Cancel
                       </Button>
             
                       <Button onClick={handleApply}>
                         Apply
                       </Button>
                     </div>
                   )}
                 </div>
               </div>
             </PopoverContent>            
            </Popover>
            {/* <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" /> */}
            <VehicleCombobox vehicles={vehicleList} value={selectedVehicle} onChange={(value) => {setSelectedVehicle(value);// Reset pagination
                setPage(0); setRowsPerPage(10);}}
              className="w-full sm:w-[180px]"/>
            <Select value={intervalFilter} onValueChange={setIntervalFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by duration" />
              </SelectTrigger>
              <SelectContent>
                {intervalOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex items-center gap-2">
            <Label htmlFor="idling-above" className="text-xs text-muted-foreground whitespace-nowrap">Show Idling above</Label>
            <div className="flex h-8 items-center rounded-md border border-input bg-transparent text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <Input
                id="idling-above"
                type="number"
                value={idlingAboveValue}
                onChange={(e) => setIdlingAboveValue(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)}
                className="w-16 border-0 bg-transparent h-full text-xs focus-visible:ring-0 focus-visible:ring-offset-0 text-center"
              />
              <Select value={idlingAboveUnit} onValueChange={(value: 'min' | 'hr') => setIdlingAboveUnit(value)}>
                <SelectTrigger className="w-[60px] h-full border-0 bg-transparent text-xs focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">min</SelectItem>
                  <SelectItem value="hr">hr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
  {loading ? (
    <TableRow>
      <TableCell
        colSpan={5}
        className="text-center py-10"
      >
        Loading...
      </TableCell>
    </TableRow>
  ) : paginatedData.length > 0 ? (
    paginatedData.map((row) => {
      const isExpanded = expandedRows.has(row.bbid);

      const sortedDetails = [...(row.idlingSubStatuslist || [])].sort((a, b) => {
        if (!detailsSortConfig.key) return 0;

        const aValue = a[detailsSortConfig.key];
        const bValue = b[detailsSortConfig.key];

        if (aValue < bValue) {
          return detailsSortConfig.direction === "asc" ? -1 : 1;
        }

        if (aValue > bValue) {
          return detailsSortConfig.direction === "asc" ? 1 : -1;
        }

        return 0;
      });

      return (
                  <React.Fragment key={row.bbid}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{row.vehicleName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.driverName || 'N/A'}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.idlingCount}</TableCell>
                     <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalIdlingTime || "N/A"}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button variant="link" onClick={() => toggleRow(row.bbid)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                              <div className="p-6 border-b">
                                <h5 className="text-lg font-semibold text-foreground">Idling Log for {row.vehicleName}</h5>
                                <p className="text-sm text-muted-foreground">Detailed idling breakdown for the selected period.</p>
                              </div>
                              <div className="p-6">
                                <ScrollArea className="h-[240px] pr-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <SortableHeader onClick={() => handleDetailsSort('startDate')} isSorted={detailsSortConfig.key === 'startDate'} sortDirection={detailsSortConfig.direction}>Start Date</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('stopDate')} isSorted={detailsSortConfig.key === 'stopDate'} sortDirection={detailsSortConfig.direction}>Stop Date</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('afterIdlingStatus')} isSorted={detailsSortConfig.key === 'afterIdlingStatus'} sortDirection={detailsSortConfig.direction}>After Idling</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Location</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Duration</SortableHeader>
                                        <TableHead>Add POI</TableHead>
                                        <TableHead>POI Location</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sortedDetails.length > 0 ? (
                                        sortedDetails.map(detail => (
                                          <TableRow key={detail.id}>
                                            <TableCell className="font-mono text-sm">{detail.startDate}</TableCell>
                                            <TableCell className="font-mono text-sm">{detail.stopDate}</TableCell>
                                            <TableCell className="text-sm">{detail.Vstatus}</TableCell>
                                         <TableCell className="text-sm truncate w-[300px] whitespace-normal break-words">{detail.location}</TableCell>
                                            <TableCell className="text-sm ">{detail.duration}</TableCell>
                                            <TableCell>
                                              <Button variant="outline" size="sm">-
                                                <PlusCircle className="h-4 w-4 mr-2" />
                                                Add POI
                                              </Button>
                                            </TableCell>
                                            <TableCell className="text-sm">{detail.poiLocation || 'N/A'}</TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No idling details available for this period.
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
              })
  ) : (
    <TableRow>
      <TableCell
        colSpan={5}
        className="text-center py-10">
        No data found
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

export default IdlingAnalysisTable;