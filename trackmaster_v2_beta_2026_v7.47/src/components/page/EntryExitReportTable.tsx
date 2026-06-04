import React, { useState, useEffect } from 'react';
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
} from '@/data/mockData';

import { useVehicleList } from '@/hooks/useApi';


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
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, startOfDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { API_BASE_URL } from '@/config/Api';

type ReportData = (typeof consolidatedReportTableData)[0] & { distance: number; driverName: string; poisCovered: string; };
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'poisCovered', label: 'POIs Covered' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
];

const SortableHeader = ({ children, isSorted, sortDirection, onClick }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; }) => (
  <TableHead className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group" onClick={onClick}>
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

const locationMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: true,
  gestureHandling: 'cooperative',
};

const EntryExitReportTable = () => {
  // const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'date', direction: 'desc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'asc' });
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [intervalFilter, setIntervalFilter] = useState('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  return format(date, "MMM dd yyyy hh:mm a");
};
  const [searchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    sortColumn: "vehname",
    sortDirection: "asc" as "asc" | "desc",
  });
  const intervalMap: Record<string, string> = {
    all: "1",
    "5": "300",
    "10": "600",
    "20": "1200",
  };


  const {
    data: vehicleList,
  } = useVehicleList();
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

  const handleLocationClick = (detail: any, vehicleName: string) => {
    setSelectedLocation({ ...detail, vehicleName });
    setIsLocationDialogOpen(true);
  };

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSort = (
    column: string
  ) => {

    setSortConfig(prev => ({

      sortColumn: column,

      sortDirection:

        prev.sortColumn === column &&
          prev.sortDirection === "asc"

          ? "desc"

          : "asc"

    }));

    setPagination(p => ({
      ...p,
      pageIndex: 0
    }));

  };


  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const authData = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const request: DataTableRequestModel = {

        CustId: authData?.custId || 0,

        sEcho: 1,

      iDisplayStart: 0,
      iDisplayLength: 1000000, 

        sSearch: searchTerm,

        sortColumn:
          sortConfig.sortColumn,

        sortDirection:
          sortConfig.sortDirection,
        // updated interval mapping
        interval: intervalMap[intervalFilter] || "1",
        beginDate:
          format(

            startOfDay(

              date?.from ||

              new Date()

            ),

            "M/d/yyyy h:mm:ss a"

          ),

        endDate:
          format(
            new Date(),
            "M/d/yyyy h:mm:ss a"
          ),

        Status: "",
        DownloadType: "Excel"
      };
      // ensure server receives report type in body
      (request as any).rtype = 'EntryExitReport';

      const params =
        new URLSearchParams();

      Object.entries(request)
        .forEach(([key, value]) => {

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
      // ADD THIS
      if (
        selectedVehicle &&
        selectedVehicle !== "all"
      ) {

        params.append(
          "bbid",
          selectedVehicle
        );

      }
        // ensure report type is set
        params.append('rtype', 'EntryExitReport');

      const response = await fetch(`${API_BASE_URL}/Reports/GetEntryExitReport?${params.toString()}`, {
        method: 'Post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to download excel');
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download url
      const downloadUrl = window.URL.createObjectURL(blob);

      // Create temp anchor
      const link = document.createElement('a');

      link.href = downloadUrl;

      link.download =
        `EntryExitReport_${authData?.custId || 0}.xlsx`;

      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Export Excel Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const authData = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const request: DataTableRequestModel = {

        CustId: authData?.custId || 0,

        sEcho: 1,

          iDisplayStart: 0,
        iDisplayLength: 1000000, 

        sSearch: searchTerm,

        sortColumn:
          sortConfig.sortColumn,

        sortDirection:
          sortConfig.sortDirection,
        // updated interval mapping
        interval: intervalMap[intervalFilter] || "1",
        beginDate:
          format(

            startOfDay(

              date?.from ||

              new Date()

            ),

            "M/d/yyyy h:mm:ss a"

          ),

        endDate:
          format(
            new Date(),
            "M/d/yyyy h:mm:ss a"
          ),

        Status: "",
        DownloadType: "Pdf"
      };
      // ensure server receives report type in body
      (request as any).rtype = 'EntryExitReport';

      const params =
        new URLSearchParams();

      Object.entries(request)
        .forEach(([key, value]) => {

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
      // ADD THIS
      if (
        selectedVehicle &&
        selectedVehicle !== "all"
      ) {

        params.append(
          "bbid",
          selectedVehicle
        );

      }


      const response = await fetch(`${API_BASE_URL}/Reports/GetEntryExitReport?${params.toString()}`, {
        method: 'Post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to download pdf');
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download url
      const downloadUrl = window.URL.createObjectURL(blob);

      // Create temp anchor
      const link = document.createElement('a');

      link.href = downloadUrl;

      link.download =
        `EntryExitReport_${authData?.custId || 0}.pdf`;

      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Export PDF Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseDuration = (value: string) => {
    if (!value) {
      return {
        text: "",
        color: "inherit",
      };
    }

    const colorMatch =
      value.match(/color=['"]?([^'">]+)['"]?/i);

    const text =
      value.replace(/<[^>]+>/g, "").trim();

    return {
      text,
      color:
        colorMatch?.[1] || "inherit",
    };
  };

  const loadData = async () => {

    try {

      setLoading(true);

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

        sSearch: searchTerm,

        sortColumn:
          sortConfig.sortColumn,

        sortDirection:
          sortConfig.sortDirection,
        // updated interval mapping
        interval: intervalMap[intervalFilter] || "1",
        beginDate:
          format(

            startOfDay(

              date?.from ||

              new Date()

            ),

            "M/d/yyyy h:mm:ss a"

          ),

        endDate:
          format(
            new Date(),
            "M/d/yyyy h:mm:ss a"
          ),

        Status: ""
      };
      // ensure server receives report type in body
      (request as any).rtype = 'EntryExitReport';

      const params =
        new URLSearchParams();

      Object.entries(request)
        .forEach(([key, value]) => {

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
      // ADD THIS
      if (
        selectedVehicle &&
        selectedVehicle !== "all"
      ) {

        params.append(
          "bbid",
          selectedVehicle
        );

      }

      const response =
        await fetch(

          `${API_BASE_URL}/Reports/GetEntryExitReport?${params.toString()}`,

          {
            method: "POST",
          }

        );

      if (!response.ok)
        throw new Error(
          "API Failed"
        );

      const result =
        await response.json();

      console.log("result", result);

      setReportData(

        Array.isArray(
          result?.data
        )

          ? result.data

          : []

      );

      setTotalRecords(

        result?.count || 0

      );
    }
    catch (err) {

      console.log(err);

      setReportData([]);

      setTotalRecords(0);

    }
    finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadData();

  }, [

    pagination.pageIndex,
    pagination.pageSize,

    searchTerm,

    sortConfig,

    date,

    intervalFilter,

    selectedVehicle

  ]);

  useEffect(() => {

    setPagination(prev => {

      if (prev.pageIndex === 0) return prev;

      return {
        ...prev,
        pageIndex: 0
      };

    });

  }, [

    selectedVehicle,
    date,
    intervalFilter,
    searchTerm,
    sortConfig

  ]);


  
  const paginatedData =
    Array.isArray(reportData)
      ? reportData
      : [];

  const totalPages =
    Math.ceil(
      totalRecords /
      pagination.pageSize
    );
  const firstRowIndex =

    totalRecords === 0

      ? 0

      :

      pagination.pageIndex *

      pagination.pageSize + 1;

  const lastRowIndex =

    Math.min(

      (

        pagination.pageIndex + 1

      )

      *

      pagination.pageSize,

      totalRecords

    );

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
      loadingElement={<div className="w-full h-full" />}
    >
      <Card className="shadow-sm overflow-hidden">
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
          <CardTitle className="text-xl font-bold text-foreground">Entry / Exit Report</CardTitle>
          <CardDescription>Daily entry and exit of vehicles.</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <Popover
            open={isCalendarOpen}
            onOpenChange={(open) => {
              setIsCalendarOpen(open);

              if (open) {
                setTempDate(date);
              }
            }}
          >
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
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                <div className="flex flex-col space-y-1 p-2 border-r">
                  {timeRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        const now = new Date();
                        let fromDate: Date;
                        let toDate: Date = now;

                        switch (range.value) {
                          case "today":
                            fromDate = now;
                            break;
                          case "yesterday":
                            fromDate = subDays(now, 1);
                            toDate = subDays(now, 1);
                            break;
                          case "last-week":
                            fromDate = subWeeks(now, 1);
                            break;
                          case "last-month":
                            fromDate = subMonths(now, 1);
                            break;
                          default:
                            fromDate = now;
                        }

                        setTempDate({
                          from: fromDate,
                          to: toDate,
                        });
                      }}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-col">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={tempDate?.from}
                    selected={tempDate}
                    onSelect={setTempDate}
                    numberOfMonths={1}
                  />

                  <div className="flex justify-end gap-2 border-t p-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempDate(date); // restore old date
                        setIsCalendarOpen(false);
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={() => {
                        setDate(tempDate); // apply selected date
                        setIsCalendarOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <VehicleCombobox vehicles={[{ label: 'All Vehicles', value: 'all' }, ...(vehicleList ?? []),]} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
          <Select value={intervalFilter} onValueChange={setIntervalFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="5">5 mins or more</SelectItem>
              <SelectItem value="10">10 mins or more</SelectItem>
              <SelectItem value="20">20 mins or more</SelectItem>
            </SelectContent>
          </Select>
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

                  <SortableHeader

                    key={String(header.key)}

                    onClick={() =>
                      handleSort(
                        String(header.key)
                      )
                    }

                    isSorted={
                      sortConfig.sortColumn ===
                      String(header.key)
                    }

                    sortDirection={
                      sortConfig.sortColumn ===
                        String(header.key)

                        ? sortConfig.sortDirection

                        : undefined
                    }

                  >

                    {header.label}

                  </SortableHeader>

                ))}

                <TableHead className="px-6 py-3" />

              </TableRow>

            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => {
                const isExpanded = expandedRows.has(row.bbid);
                const details = row.poisCoveredList || [];
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

                return (
                  <React.Fragment key={row.bbid}>
                    <TableRow className="bg-card hover:bg-muted/50 border-b">
                      <TableCell
                        className="px-6 py-4"

                      >

                        {row.vehName}

                      </TableCell>

                      <TableCell
                        className="px-6 py-4"
                      >

                        {
                          row.driverName &&
                            row.driverName !== "undefined"
                            ? row.driverName
                            : "NA"
                        }

                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {row.poisCovered ?? 0}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button variant="link" onClick={() => toggleRow(row.bbid)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                          Details
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={headers.length + 1} className="p-0">
                          <div className="bg-muted/50 p-8">
                            <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                              <div className="p-6 border-b">
                                <h5 className="text-lg font-semibold text-foreground">
                                  Trip Details for {row.vehicleName}
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  Detailed trip breakdown for {row.date}
                                </p>
                              </div>
                              <div className="p-6">
                                <ScrollArea className="h-[200px] pr-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <SortableHeader onClick={() => handleDetailsSort('startTime')} isSorted={detailsSortConfig.key === 'intime'} sortDirection={detailsSortConfig.direction}>Entry Time</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Entry Location</SortableHeader>
                                        <SortableHeader onClick={() => handleDetailsSort('endTime')} isSorted={detailsSortConfig.key === 'endTime'} sortDirection={detailsSortConfig.direction}>Exit Time</SortableHeader>
                                        {/* <SortableHeader onClick={() => handleDetailsSort('location')} isSorted={detailsSortConfig.key === 'location'} sortDirection={detailsSortConfig.direction}>Exit Location</SortableHeader> */}
                                        <SortableHeader onClick={() => handleDetailsSort('duration')} isSorted={detailsSortConfig.key === 'duration'} sortDirection={detailsSortConfig.direction}>Duration</SortableHeader>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sortedDetails.length > 0 ? (
                                        sortedDetails.map((detail: any, index: number) => (
                                          <TableRow key={index}>

                                            {/* Entry Time */}
                                            <TableCell className="font-mono text-sm text-foreground">
                                             {formatDateTime(detail.intime)}
                                            </TableCell>

                                            {/* Entry Location (lat used here as you requested) */}
                                            <TableCell className="text-sm text-muted-foreground">
                                              <button
                                                type="button"
                                                className="text-blue-600 hover:underline"
                                                onClick={() => handleLocationClick(detail, row.vehicleName || row.vehName)}
                                              >
                                                {detail.poiName?.replace(/<[^>]*>/g, "")}
                                              </button>
                                            </TableCell>

                                            {/* Exit Time */}
                                            <TableCell className="font-mono text-sm text-foreground">
                                              {formatDateTime(detail.outTime)}
                                            </TableCell>

                                            {/* Exit Location (long used here as you requested) */}
                                            {/* <TableCell className="text-sm text-muted-foreground">
                                              {detail.poiLong}
                                            </TableCell> */}

                                            {/* Duration */}
                                            <TableCell
                                              className="text-sm font-medium"
                                              style={{
                                                color: parseDuration(detail.duration).color,
                                              }}
                                            >
                                              {parseDuration(detail.duration).text}
                                            </TableCell>

                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No trip details available for this day.
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
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={isLocationDialogOpen} onOpenChange={(open) => {
        setIsLocationDialogOpen(open);
        if (!open) setIsInfoWindowOpen(false);
      }}>
        <DialogContent className="sm:max-w-3xl w-full p-0">
          <DialogHeader className="p-6">
            <DialogTitle>Location On Map</DialogTitle>
            <DialogDescription>
              View the selected entry location and map details.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedLocation?.poiLat && selectedLocation?.poiLong ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <GoogleMap
                  mapContainerClassName="w-full h-[320px]"
                  center={{
                    lat: Number(selectedLocation.poiLat),
                    lng: Number(selectedLocation.poiLong),
                  }}
                  zoom={16}
                  options={locationMapOptions}
                >
                  <Marker
                    position={{
                      lat: Number(selectedLocation.poiLat),
                      lng: Number(selectedLocation.poiLong),
                    }}
                    onMouseOver={() => setIsInfoWindowOpen(true)}
                  />
                  {isInfoWindowOpen && (
                    <InfoWindow
                      position={{
                        lat: Number(selectedLocation.poiLat),
                        lng: Number(selectedLocation.poiLong),
                      }}
                      onCloseClick={() => setIsInfoWindowOpen(false)}
                    >
                      <div className="text-xs text-slate-900" onMouseLeave={() => setIsInfoWindowOpen(false)}>
                        <div className="font-semibold">Vehicle:</div>
                        <div>{selectedLocation?.vehicleName || 'Unknown'}</div>
                        <div className="mt-1 font-semibold">Location:</div>
                        <div>{selectedLocation?.poiName?.replace(/<[^>]*>/g, '') || 'Unknown location'}</div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Location coordinates are not available for this POI.
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end px-6 py-4 border-t">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(
              pagination.pageSize
            )}
            onValueChange={(value) => {

              setPagination({

                pageIndex: 0,

                pageSize: Number(value)

              });

            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
              <SelectValue
                placeholder={String(
                  pagination.pageSize
                )}
              />
            </SelectTrigger>
            <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{firstRowIndex}-{lastRowIndex} of {totalRecords}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>

                setPagination(p => ({

                  ...p,

                  pageIndex: 0

                }))

              }
              disabled={
                pagination.pageIndex === 0
              }
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>

                setPagination(p => ({

                  ...p,

                  pageIndex:
                    p.pageIndex - 1

                }))

              }
              disabled={
                pagination.pageIndex === 0
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>

                setPagination(p => ({

                  ...p,

                  pageIndex:
                    p.pageIndex + 1

                }))

              }
              disabled={

                pagination.pageIndex >=

                totalPages - 1

              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>

                setPagination(p => ({

                  ...p,

                  pageIndex:

                    totalPages - 1

                }))

              }
              disabled={

                pagination.pageIndex >=

                totalPages - 1

              }
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
    </LoadScript>
  );
};

export default EntryExitReportTable;