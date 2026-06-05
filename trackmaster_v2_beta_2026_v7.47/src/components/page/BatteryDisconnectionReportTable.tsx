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
import { useApi, useVehicleList } from '@/hooks/useApi';
import { API_BASE_URL } from '@/config/Api';

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
  ChevronsUpDown,
  Loader,
} from 'lucide-react';

import { DateRange } from 'react-day-picker';

import {
  subWeeks,
  subDays,
  subMonths,
  format,
  differenceInSeconds,
  startOfDay,
  endOfDay,
} from 'date-fns';

import { cn } from '@/lib/utils';
import { VehicleCombobox } from '../VehicleCombobox';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import WhatsappPopup from '../WhatsappPopup';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { Calendar } from '@/components/ui/calendar';

type BatteryDisconnectionEvent = {
  id: string;
  startTime: string;
  endTime: string;
  startLocation: string;
  endLocation: string;
  duration: number;
  status: string;
};

type AggregatedData = {
  vehicleId: string;
  vehicleName: string;
  driverName: string | null;
  disconnectionCount: number;
  totalDisconnectionDuration: number;
  details: BatteryDisconnectionEvent[];
};

type ReportDataKey = keyof Omit<AggregatedData, 'details'>;
//const [isSelectingEnd, setIsSelectingEnd] = useState(false);

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleId', label: 'Registration number' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'disconnectionCount', label: 'Disconnection Count' },
];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  //{ label: 'Last 2 Months', value: 'last-2-months' },
];

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;

  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 1) {
    return '< 1min';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}hr`;
  }

  return `${hours}hr ${minutes}min`;
};

const durationToSeconds = (val: string) => {
  if (!val) return 0;

  const parts = val.split(':').map(Number);

  if (parts.length !== 3) return 0;

  const [h, m, s] = parts;

  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
};

const OngoingDuration = ({ startTime }: { startTime: Date }) => {
  const [duration, setDuration] = useState(
    differenceInSeconds(new Date(), startTime)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(differenceInSeconds(new Date(), startTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <p className="font-mono text-sm text-muted-foreground">
      {formatDuration(duration)}
    </p>
  );
};

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

const BatteryDisconnectionReportTable = () => {
  const [page, setPage] = useState(0);

  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'vehicleName',
    direction: 'asc',
  });

  const [detailsSortConfig, setDetailsSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'startTime',
    direction: 'desc',
  });
  

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);

  const [selectedVehicle, setSelectedVehicle] = useState('all');

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: vehicleOptions } = useVehicleList();

  const vehicleSearchOptions = [
    { label: 'All', value: 'all' },
    ...(vehicleOptions ?? []),
  ];

  const fetchBatteryDisconnectionReport = useCallback(async () => {
    const auth = JSON.parse(
      localStorage.getItem('trackmaster-auth') || '{}'
    );

    const custId = auth.custId;

    if (!custId) {
      return {
        data: [],
        count: 0,
      };
    }

    const iDisplayStart = page === 0 ? 0 : page * rowsPerPage + 1;
    const iDisplayLength = (page + 1) * rowsPerPage;

    const beginDate = date?.from
      ? startOfDay(date.from)
      : startOfDay(new Date());

    const endDate = date?.to
      ? endOfDay(date.to)
      : endOfDay(new Date());

    const params = new URLSearchParams({
      custId: String(custId),
      iDisplayStart: String(iDisplayStart),
      iDisplayLength: String(iDisplayLength),
      beginDate: format(beginDate, 'yyyy-MM-dd HH:mm:ss'),
      endDate: format(endDate, 'yyyy-MM-dd HH:mm:ss'),
    });

    if (selectedVehicle !== 'all') {
      params.append('search', selectedVehicle);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/Reports/BatteryDisconnection?${params}`
      );

      if (!response.ok) {
        return {
          data: [],
          count: 0,
        };
      }

      const json = await response.json();

      return {
        data: (json?.data || []).map((item: any) => ({
          vehicleId: item.bbid ?? '',
          vehicleName: item.vehName ?? '',
          driverName: null,

          disconnectionCount: (item.logs || []).length,

          totalDisconnectionDuration: 0,

          details: (item.logs || []).map(
            (log: any, index: number) => ({
              id: `${item.bbid}-${index}`,

              startTime: log.batterydisc,

              endTime: log.batterycon,

              startLocation: log.startloc,

              endLocation: log.endloc,

              duration: durationToSeconds(log.duration),

              status: log.status,
            })
          ),
        })),

        count: json?.count || 0,
      };
    } catch (error) {
      console.error(error);

      return {
        data: [],
        count: 0,
      };
    }
  }, [page, rowsPerPage, selectedVehicle, date]);

  const { data: apiData, loading } = useApi(
    fetchBatteryDisconnectionReport
  );

  const reportData = apiData?.data ?? [];

  const totalCount = apiData?.count ?? 0;

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

    let toDate: Date = now;

    switch (range) {
      case 'today':
        fromDate = now;
        break;

      case 'yesterday':
        fromDate = subDays(now, 1);
        toDate = subDays(now, 1);
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

    setDate({
      from: fromDate,
      to: toDate,
    });

    setIsCalendarOpen(false);
    setPage(0);
  };

  const handleCalendarSelect = (
  range: DateRange | undefined
) => {
  if (!range?.from) return;

  if (!tempDate?.from || tempDate?.to) {
    setTempDate({
      from: range.from,
      to: undefined,
    });
  } else {
    setTempDate({
      from: tempDate.from,
      to: range.from,
    });
  }
};

  const handleDetailsSort = (key: string) => {
    setDetailsSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const sortableData = [...reportData];

    sortableData.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null) return 1;

      if (bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }

      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }

      return 0;
    });

    return sortableData;
  }, [reportData, sortConfig]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';

    if (
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    setSortConfig({ key, direction });

    setPage(0);
  };

  const paginatedData = sortedData;

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const firstRowIndex = page * rowsPerPage + 1;

  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    totalCount
  );

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Battery Disconnection Report
          </CardTitle>

          <CardDescription>
            Detailed log of battery disconnection events.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <VehicleCombobox
            vehicles={vehicleSearchOptions}
            value={selectedVehicle}
            onChange={(value) => {
              setSelectedVehicle(value);
              setPage(0);
            }}
            className="w-full sm:w-[180px]"
          />

          <Popover
            open={isCalendarOpen}
            onOpenChange={(open) => {
            setIsCalendarOpen(open);

            if (open) {
              setTempDate(date); // reset temp when opening
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

            <PopoverContent className="w-auto p-0 flex" align="end">
            <div className="flex flex-col space-y-1 p-2 border-r">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    handleTimeRangeClick(range.value);

                    // IMPORTANT: sync temp + applied state
                    setTempDate(date);
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
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
              />

              {/* ✅ ADD THIS FOOTER */}
              <div className="flex justify-end gap-2 border-t p-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTempDate(date); // revert changes
                    setIsCalendarOpen(false);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  disabled={!tempDate?.from || !tempDate?.to}
                  onClick={() => {
                    setDate(tempDate);   // 🔥 API triggers here
                    setPage(0);
                    setIsCalendarOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                Export as PDF
              </DropdownMenuItem>

              <DropdownMenuItem>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <WhatsappPopup />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
                <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                <span>Please wait...</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  {headers.map((header) => (
                    <SortableHeader
                      key={header.key as string}
                      onClick={() =>
                        handleSort(header.key)
                      }
                      isSorted={
                        sortConfig.key === header.key
                      }
                      sortDirection={
                        sortConfig.key === header.key
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      {header.label}
                    </SortableHeader>
                  ))}

                  <TableHead className="px-6 py-3"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.map((row) => {
                  const isExpanded = expandedRows.has(
                    row.vehicleId
                  );

                  const sortedDetails = [
                    ...row.details,
                  ].sort((a, b) => {
                    const key =
                      detailsSortConfig.key as keyof typeof a;

                    let aValue = a[key];
                    let bValue = b[key];

                    if (
                      typeof aValue === 'string' &&
                      typeof bValue === 'string'
                    ) {
                      return detailsSortConfig.direction ===
                        'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                    }

                    if (
                      typeof aValue === 'number' &&
                      typeof bValue === 'number'
                    ) {
                      return detailsSortConfig.direction ===
                        'asc'
                        ? aValue - bValue
                        : bValue - aValue;
                    }

                    return 0;
                  });

                  return (
                    <React.Fragment key={row.vehicleId}>
                      <TableRow className="bg-card hover:bg-muted/50 border-b">
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {row.vehicleId}
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                          {row.vehicleName}
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {row.disconnectionCount}
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {row.details?.length > 0 ? (
                              <Button
                                variant="link"
                                onClick={() => toggleRow(row.vehicleId)}
                                className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1"
                              >
                                Details
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${
                                    expandedRows.has(row.vehicleId) ? 'rotate-180' : ''
                                  }`}
                                />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No logs
                              </span>
                            )}
                          </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell
                            colSpan={headers.length + 5}
                            className="p-0"
                          >
                            <div className="bg-muted/50 px-2 py-3">
                              <div className="bg-card rounded-md border flex flex-col overflow-hidden">
                                <div className="p-6 border-b">
                                  <h5 className="text-lg font-semibold text-foreground">
                                    Disconnection Log for{' '}
                                    {row.vehicleName}
                                  </h5>

                                  <p className="text-sm text-muted-foreground">
                                    Detailed event breakdown
                                    for the selected period.
                                  </p>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto w-full rounded-md">
                                  <div className="w-full">
                                    <Table className="w-full table-fixed">
                                    <TableHeader className="sticky top-0 bg-card z-10">
                                      <TableRow>
                                        <SortableHeader
                                          onClick={() =>
                                            handleDetailsSort('startTime')
                                          }
                                          isSorted={
                                            detailsSortConfig.key ===
                                            'startTime'
                                          }
                                          sortDirection={
                                            detailsSortConfig.direction
                                          }
                                        >
                                          <div className="w-[170px]">
                                            Disconnection Date
                                          </div>
                                        </SortableHeader>

                                        <SortableHeader
                                          onClick={() =>
                                            handleDetailsSort(
                                              'startLocation'
                                            )
                                          }
                                          isSorted={
                                            detailsSortConfig.key ===
                                            'startLocation'
                                          }
                                          sortDirection={
                                            detailsSortConfig.direction
                                          }
                                        >
                                          <div className="w-[300px]">
                                            Disconnection Location
                                          </div>
                                        </SortableHeader>

                                        <SortableHeader
                                          onClick={() =>
                                            handleDetailsSort(
                                              'endTime'
                                            )
                                          }
                                          isSorted={
                                            detailsSortConfig.key ===
                                            'endTime'
                                          }
                                          sortDirection={
                                            detailsSortConfig.direction
                                          }
                                        >
                                          <div className="w-[170px]">
                                            Connection Date
                                          </div>
                                        </SortableHeader>

                                        <SortableHeader
                                          onClick={() =>
                                            handleDetailsSort(
                                              'endLocation'
                                            )
                                          }
                                          isSorted={
                                            detailsSortConfig.key ===
                                            'endLocation'
                                          }
                                          sortDirection={
                                            detailsSortConfig.direction
                                          }
                                        >
                                          <div className="w-[300px]">
                                            Connection Location
                                          </div>
                                        </SortableHeader>

                                        <SortableHeader
                                          onClick={() =>
                                            handleDetailsSort('duration')
                                          }
                                          isSorted={
                                            detailsSortConfig.key === 'duration'
                                          }
                                          sortDirection={detailsSortConfig.direction}
                                        >
                                          <div className="w-[140px] text-left">
                                            Disconnection Duration
                                          </div>
                                        </SortableHeader>

                                        <TableHead className="w-[120px]">
                                          Status
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                      {sortedDetails.map(
                                        (detail) => {
                                          const isOngoing = detail.status?.toLowerCase() !== 'connected';

                                          const startTime =
                                            new Date(
                                              detail.startTime
                                            );

                                          return (
                                            <TableRow
                                              key={detail.id}
                                            >
                                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                                {detail.startTime
                                                  ? format(
                                                      startTime,
                                                      'MMM dd yyyy hh:mm a'
                                                    )
                                                  : '-'}
                                              </TableCell>

                                              <TableCell className="text-sm whitespace-normal break-words">
                                                {
                                                  detail.startLocation
                                                }
                                              </TableCell>

                                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                                {detail.endTime &&
                                                detail.endTime !== '0001-01-01T00:00:00' &&
                                                detail.endTime !== '0001-01-01 00:00:00' ? (
                                                  format(
                                                    new Date(detail.endTime),
                                                    'MMM dd yyyy hh:mm a'
                                                  )
                                                ) : (
                                                  'N/A'
                                                )}
                                              </TableCell>

                                              <TableCell className="text-sm whitespace-normal break-words">
                                                {
                                                  detail.endLocation
                                                }
                                              </TableCell>

                                              <TableCell className="w-[140px] text-center">
                                                <p className="font-mono text-sm">
                                                  {formatDuration(Number(detail.duration) || 0)}
                                                </p>
                                              </TableCell>

                                              <TableCell className="w-[120px]">
                                                <span
                                                  className={cn(
                                                    'w-28 inline-flex justify-center px-2.5 py-1 text-xs font-semibold rounded-full',
                                                    isOngoing
                                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                  )}
                                                >
                                                  {isOngoing
                                                    ? 'Disconnected'
                                                    : 'Connected'}
                                                </span>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        }
                                      )}
                                    </TableBody>
                                  </Table>
                                  </div>
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
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Rows per page:
          </span>

          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
              <SelectValue
                placeholder={rowsPerPage}
              />
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
            {firstRowIndex}-{lastRowIndex} of{' '}
            {totalCount}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setPage(totalPages - 1)
              }
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

export default BatteryDisconnectionReportTable;