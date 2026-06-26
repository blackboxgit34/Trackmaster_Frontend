import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subHours, subDays, subMonths, isWithinInterval, parse, startOfDay, endOfDay, format } from 'date-fns';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { useReportDownload, useVehicleList } from '@/hooks/useApi';
import { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { API_BASE_URL } from '@/config/Api';

type GeofenceEvent = {
  id: string;
  dateTime: string;
  vehicleId: string;
  vehicleName: string;
  location: string;
  fenceName: string;
  eventType: 'Fence in' | 'Fence out';
};




type AggregatedData = {
  vehicleName: string;
  location: string;
  geoTime: string;
  fenceStatus: string;
  bbid: string;
  fencename: string;
  fenceViolationsCount: number;
};



type ReportDataKey = keyof AggregatedData;

const headers = [
  {
    key: 'vehicleName',
    label: 'Vehicle No'
  },
  {
    key: 'fenceViolationsCount',
    label: 'Fence Violations Count'
  },
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

const EventTypeBadge = ({ eventType }: { eventType: 'Fence in' | 'Fence out' }) => {
  const isEntry = eventType === 'Fence in';
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
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'vehicleName', direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dateTime', direction: 'desc' });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { data: vehicleList } = useVehicleList();
  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(
    'last-week'
  );

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });





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
    setPagination(p => ({ ...p, pageIndex: 0 }));
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
    setPagination(p => ({ ...p, pageIndex: 0 }));
  };

  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    setPagination(p => ({ ...p, pageIndex: 0 }));
  };

  const selectedTimeRangeLabel =
    timeRanges.find((r) => r.value === activeTimeRange)?.label ||
    'Select a time range';



  const sortedData = useMemo(() => {
    return reportData || [];
  }, [reportData]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPagination(p => ({ ...p, pageIndex: 0 }));
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

 


  const paginatedData = reportData || [];

  const totalPages = Math.ceil(
    totalRecords /
    pagination.pageSize
  );

  const firstRowIndex =
    totalRecords === 0
      ? 0
      : pagination.pageIndex *
      pagination.pageSize +
      1;

  const lastRowIndex =
    Math.min(
      (
        pagination.pageIndex + 1
      ) * pagination.pageSize,
      totalRecords
    );

  useEffect(() => {
    loadData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sortConfig,
    selectedVehicle,
    date,
  ]);




  const authData = JSON.parse(
    localStorage.getItem("trackmaster-auth") || "{}"
  );

  const request: DataTableRequestModel = {
    CustId: authData?.custId || 0,

    sEcho: 1,

    iDisplayStart:
      pagination.pageIndex *
      pagination.pageSize,

    iDisplayLength:
      pagination.pageSize,

    sSearch: "",

    sortColumn: sortConfig.key,

    sortDirection: sortConfig.direction,

    beginDate: format(
      startOfDay(date?.from || new Date()),
      "M/d/yyyy h:mm:ss a"
    ),

    endDate: date?.to
      ? format(date.to, "M/d/yyyy h:mm:ss a")
      : "",

    Status: "",
  };



  const {
    exportExcel: originalExportExcel,
    exportPdf: originalExportPdf,
  } = useReportDownload(
    "/GeoFence/GetGeoFenceViolation", request,
    { bbid: "null" }
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

  const loadData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      Object.entries(request).forEach(([key, value]) => {
        if (
          value !== null &&
          value !== undefined
        ) {
          params.append(
            key,
            String(value)
          );
        }
      });

      params.append(
        "bbid",
        selectedVehicle !== "all"
          ? selectedVehicle
          : "null"
      );
      const response = await fetch(
        `${API_BASE_URL}/GeoFence/GetGeoFenceViolation?${params.toString()}`,
        {
          method: "GET",
        }
      );

      if (!response.ok)
        throw new Error("API Failed");

      const result = await response.json();

      setReportData(
        Array.isArray(result?.data)
          ? result.data
          : []
      );

      setTotalRecords(
        result?.recordsTotal || 0
      );
    }
    catch (error) {
      console.log(error);

      setReportData([]);
      setTotalRecords(0);
    }
    finally {
      setLoading(false);
    }
  };


  return (
    <Card className="shadow-sm overflow-hidden flex flex-col h-full">
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
            <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
            <span className="text-sm">Please wait ...</span>
          </div>
        </div>
      )}
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
          <VehicleCombobox vehicles={[{ label: 'All Vehicles', value: 'all' }, ...(vehicleList ?? []),]} value={selectedVehicle} onChange={handleVehicleChange} className="w-full sm:w-[180px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportExcel}>
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
                <TableHead className="px-6 py-3 text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    No data found
                  </TableCell>
                </TableRow>
              ) : paginatedData.map((row) => {
                const isExpanded = expandedRows.has(row.bbid);

                const events = row.events || [];
                const sortedDetails = [...events].sort((a: any, b: any) => {
                  const aVal = a[detailsSortConfig.key] ?? '';
                  const bVal = b[detailsSortConfig.key] ?? '';
                  if (aVal < bVal) return detailsSortConfig.direction === 'asc' ? -1 : 1;
                  if (aVal > bVal) return detailsSortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
                });

                return (
                  <React.Fragment key={row.bbid}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b transition-colors">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                        {row.vehicleName}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.fenceViolationsCount}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button
                          variant="link"
                          onClick={() => toggleRow(row.bbid)}
                          className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center justify-end gap-1 ml-auto"
                        >
                          Details
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                              }`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={3} className="p-0">
                          <div className="bg-muted/50 p-6 sm:p-8">
                            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                              <ScrollArea className="h-[300px]">
                                <Table>
                                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                    <TableRow>
                                      <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Name</TableHead>
                                      <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction as any}>Location</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('geoTime')} isSorted={detailsSortConfig.key === 'geoTime'} sortDirection={detailsSortConfig.direction as any}>GeoTime</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('fenceName')} isSorted={detailsSortConfig.key === 'fenceName'} sortDirection={detailsSortConfig.direction as any}>Fence name</SortableHeader>
                                      <SortableHeader onClick={() => handleDetailsSort('fenceStatus')} isSorted={detailsSortConfig.key === 'fenceStatus'} sortDirection={detailsSortConfig.direction as any}>Fence Status</SortableHeader>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {/* {sortedDetails.map(detail => (
                                      <TableRow key={detail.id} className="hover:bg-muted/30">
                                        <TableCell className="font-semibold text-xs py-2.5">{detail.vehicleName}</TableCell>
                                        <TableCell className="text-xs py-2.5 text-muted-foreground">{detail.location}</TableCell>
                                        <TableCell className="font-mono text-xs py-2.5">{detail.dateTime}</TableCell>
                                        <TableCell className="text-xs py-2.5 text-foreground">{detail.fenceName}</TableCell>
                                        <TableCell className="py-2.5">
                                          <EventTypeBadge eventType={detail.eventType} />
                                        </TableCell>
                                      </TableRow>
                                    ))} */}

                                    {sortedDetails.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">No events found</TableCell>
                                      </TableRow>
                                    ) : sortedDetails.map((detail: any, index: number) => (
                                      <TableRow key={index} className="hover:bg-muted/30">
                                        <TableCell className="font-semibold text-xs py-2.5">
                                          {row.vehicleName}
                                        </TableCell>
                                        <TableCell className="text-xs py-2.5 text-muted-foreground">
                                          {detail.location}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs py-2.5">
                                          {detail.geoTime}
                                        </TableCell>
                                        <TableCell className="text-xs py-2.5 text-foreground">
                                          {detail.fenceName}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                          <EventTypeBadge eventType={detail.fenceStatus as 'Fence in' | 'Fence out'} />
                                        </TableCell>
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
      <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => {
              setPagination({
                pageIndex: 0,
                pageSize: Number(value),
              });
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
              <SelectValue placeholder={pagination.pageSize} />
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
            {firstRowIndex}-{lastRowIndex} of {totalRecords}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
              disabled={pagination.pageIndex >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPagination(p => ({ ...p, pageIndex: totalPages - 1 }))}
              disabled={pagination.pageIndex >= totalPages - 1}
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

