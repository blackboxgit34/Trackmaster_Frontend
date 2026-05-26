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

import { Button } from '@/components/ui/button';

import {
  ArrowUp,
  ArrowDown,
  Download,
  Info,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileText,
  FileSpreadsheet,
  Milestone,
  Clock,
} from 'lucide-react';

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

import { cn } from '@/lib/utils';

import { MonthPicker } from '@/components/ui/month-picker';
import { VehicleCombobox } from '../VehicleCombobox';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import MonthlyReportHelpDialog from './MonthlyReportHelpDialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { API_BASE_URL } from '@/config/Api';

import { useSearchParams } from 'react-router-dom';

type DailyData = {
  distance: number;
  stoppage: number;
};

type ReportData = {
  vehicleId: string;
  vehicleName: string;
  status: 'In Use' | 'Inactive';
  dailyData: { [day: string]: DailyData };
  totalDistance: number;
  totalStoppage: string;
  avgDistance: number;
  avgStoppage: number;
  activeDays: number;
  bestDay: { date: string; distance: number };
};

type SortKey =
  | 'vehicleName'
  | 'totalDistance'
  | 'totalStoppage';

const getDistanceColor = () => {
  return 'hover:bg-muted/50';
};

const ReportCell = ({
  day,
  data,
  highlightProblems,
}: {
  day: Date;
  data?: DailyData;
  highlightProblems: boolean;
}) => {
  const distance = data?.distance || 0;
  const stoppage = data?.stoppage || 0;

  const showHighlight =
    highlightProblems && stoppage > 4;

  return (
    <TableCell
      className={cn(
        'text-center p-0 h-12 relative min-w-[90px] transition-colors',
        getDistanceColor()
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="w-full h-full flex flex-col justify-center items-center relative">
            {showHighlight && (
              <div className="absolute inset-0.5 rounded-sm border border-red-500" />
            )}

            <span className="font-semibold text-sm">
              {distance > 0 ? (
                `${distance.toFixed(0)} km`
              ) : (
                <span className="text-muted-foreground">
                  0
                </span>
              )}
            </span>

            {stoppage > 0.1 && (
              <span className="text-xs text-muted-foreground">
                {stoppage.toFixed(1)}h
              </span>
            )}
          </TooltipTrigger>

          <TooltipContent className="bg-popover text-popover-foreground border">
            <p className="font-semibold">
              {format(day, 'MMM d, yyyy')}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <Milestone className="h-4 w-4 text-blue-500" />
              <span>
                Distance: {distance.toFixed(1)} km
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>
                Stoppage: {stoppage.toFixed(1)} hrs
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  );
};

const SortableHeader = ({
  sortKey,
  currentSort,
  onSort,
  children,
  className,
}: {
  sortKey: SortKey;
  currentSort: {
    key: SortKey;
    direction: 'asc' | 'desc';
  };
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <TableHead
    className={cn(
      'sticky top-0 bg-muted/80 backdrop-blur-sm cursor-pointer group',
      className
    )}
    onClick={() => onSort(sortKey)}
  >
    <div
      className={cn(
        'flex items-center gap-2 transition-colors',
        currentSort.key === sortKey
          ? 'text-foreground'
          : 'text-muted-foreground group-hover:text-foreground'
      )}
    >
      {children}

      {currentSort.key === sortKey &&
        (currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        ))}
    </div>
  </TableHead>
);

const MonthlyDayWiseDistanceReport = () => {
  const [month, setMonth] = useState<Date | undefined>(
    new Date()
  );

  const [selectedVehicle, setSelectedVehicle] =
    useState('all');

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'vehicleName',
    direction: 'asc',
  });

  const [isHelpOpen, setIsHelpOpen] =
    useState(false);

  const [highlightProblems, setHighlightProblems] =
    useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [vehicles, setVehicles] = useState<
    { label: string; value: string }[]
  >([]);

  const [reportData, setReportData] = useState<
    ReportData[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [totalRecords, setTotalRecords] =
    useState(0);

  const [searchParams] = useSearchParams();

  const vehicleFromUrl =
    searchParams.get('vehicle');

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(
          localStorage.getItem('trackmaster-auth') ||
          '{}'
        );

        const custId = auth.custId;

        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );

        const data = await response.json();

        const formattedVehicles = [
          {
            label: 'All Vehicles',
            value: 'all',
          },
          ...(data.data || []).map((v: any) => ({
            label: v.vehName,
            value: v.bbid,
          })),
        ];

        setVehicles(formattedVehicles);

        if (vehicleFromUrl) {
          setSelectedVehicle(vehicleFromUrl);
        } else {
          setSelectedVehicle('all');
        }
      } catch (error) {
        console.error('Vehicle API Error', error);
      }
    };

    loadVehicles();
  }, []);

  const days = useMemo(() => {
    if (!month) return [];

    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  }, [month]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key &&
          prev.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  useEffect(() => {
    if (!month) return;

    loadReportData();
  }, [
    month,
    selectedVehicle,
    sortConfig,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const auth = JSON.parse(
        localStorage.getItem('trackmaster-auth') ||
        '{}'
      );

      const body = {
        sEcho: 1,

        iDisplayStart:
          pagination.pageIndex *
          pagination.pageSize,

        iDisplayLength:
          pagination.pageSize,

        sSearch:
          selectedVehicle !== 'all'
            ? vehicles.find(
              (x) =>
                x.value === selectedVehicle
            )?.label || ''
            : '',

        sortColumn:
          sortConfig.key === 'vehicleName'
            ? 'VehName'
            : sortConfig.key === 'totalDistance'
              ? 'TotalDistance'
              : 'TotalStoppage',

        sortDirection:
          sortConfig.direction,

        CustId: auth.custId,

        beginDate: format(
          month!,
          'MMMM yyyy'
        ),

        endDate: null,

        Status: null,
      };

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetMonthlyDistanceReportData`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      const apiData =
        result.data || result || [];

      const transformedData: ReportData[] =
        apiData.map((item: any) => {
          const dailyData: {
            [key: string]: DailyData;
          } = {};

          (
            item.distanceMonthlyReportSubDataModels ||
            item._distanceMonthlyReportSubDataModels ||
            []
          ).forEach((sub: any) => {
            dailyData[sub.day || sub.Day] = {
              distance: Number(
                sub.distance ||
                sub.Distance ||
                0
              ),

              stoppage: Number(
                sub.duration ||
                sub.Duration ||
                0
              ),
            };
          });

          const dailyEntries = Object.entries(
            dailyData
          );

          const activeDays =
            dailyEntries.filter(
              ([, data]) =>
                data.distance > 0
            ).length;

          const totalDistance = Number(
            item.totalDistance ||
            item.TotalDistance ||
            0
          );

          const totalStoppage =
            item.totalStoppage ||
            item.TotalStoppage ||
            '0';

          const avgDistance =
            activeDays > 0
              ? totalDistance / activeDays
              : 0;

          const avgStoppage =
            activeDays > 0
              ? totalStoppage / activeDays
              : 0;

          const best =
            dailyEntries.reduce(
              (
                best: any,
                [day, data]
              ) =>
                data.distance >
                  best.distance
                  ? {
                    date: day,
                    distance:
                      data.distance,
                  }
                  : best,
              {
                date: '',
                distance: 0,
              }
            );

          return {
            vehicleId:
              item.bbid ||
              item.BBID,

            vehicleName:
              item.vehName ||
              item.VehName,

            status: 'In Use',

            dailyData,

            totalDistance,

            totalStoppage,

            avgDistance,

            avgStoppage,

            activeDays,

            bestDay: {
              date: best.date
                ? format(
                  new Date(
                    month!.getFullYear(),
                    month!.getMonth(),
                    parseInt(best.date)
                  ),
                  'MMM d'
                )
                : 'N/A',

              distance:
                best.distance || 0,
            },
          };
        });

      setReportData(transformedData);

      setTotalRecords(
        result.recordsTotal ||
        result.totalRecords ||
        result.count ||
        transformedData.length
      );
    } catch (error) {
      console.error(
        'Report API Error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const pageCount = Math.ceil(
    totalRecords / pagination.pageSize
  );

  const paginatedData = reportData;

  const firstRowIndex =
    pagination.pageIndex *
    pagination.pageSize +
    1;

  const lastRowIndex = Math.min(
    (pagination.pageIndex + 1) *
    pagination.pageSize,
    totalRecords
  );
  if (loading) return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
      <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
      <span>Please wait...</span>
    </div>
  </div>;

  return (
    <>
      <Card className="shadow-sm overflow-hidden flex flex-col h-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              Monthly Day-Wise Distance Report
            </CardTitle>

            <CardDescription>
              Daily distance and stoppage
              time for each vehicle.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setIsHelpOpen(true)
              }
            >
              <Info className="h-4 w-4" />
            </Button>

            <MonthPicker
              date={month}
              setDate={setMonth}
            />

            <VehicleCombobox
              vehicles={vehicles}
              value={selectedVehicle}
              onChange={setSelectedVehicle}
              className="w-full sm:w-[180px]"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <div className="px-6 pb-4 border-b flex justify-end items-center">
          <div className="flex items-center space-x-2">
            <Switch
              id="highlight-problems"
              checked={highlightProblems}
              onCheckedChange={
                setHighlightProblems
              }
            />

            <Label
              htmlFor="highlight-problems"
              className="text-xs"
            >
              Highlight High Stoppage
              (&gt;4h)
            </Label>
          </div>
        </div>

        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="w-full overflow-auto h-full">
            <Table
              className="relative border-collapse min-w-full"
            >
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    sortKey="vehicleName"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    className={cn(
                      'sticky left-0 z-30 min-w-[200px] shadow-md',
                      sortConfig.key ===
                      'vehicleName' &&
                      'bg-muted'
                    )}
                  >
                    Vehicle No
                  </SortableHeader>

                  {days.map((day) => (
                    <TableHead
                      key={day.toString()}
                      className="text-center min-w-[90px] sticky top-0 z-20 bg-background"
                    >
                      {format(day, 'd MMM')}
                    </TableHead>
                  ))}

                  <SortableHeader
                    sortKey="totalDistance"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    className={cn(
                      'sticky right-0 z-20 min-w-[200px] shadow-lg bg-muted'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    MONTHLY TOTALS
                  </SortableHeader>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        days.length + 2
                      }
                      className="h-24 text-center"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : reportData.length ===
                  0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        days.length + 2
                      }
                      className="h-24 text-center text-muted-foreground"
                    >
                      No data available
                      for the selected
                      filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row) => (
                    <TableRow key={row.vehicleId}>

                      {/* VEHICLE COLUMN */}
                      <TableCell className="sticky left-0 bg-card font-semibold min-w-[200px] shadow-md border-r z-40">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {row.vehicleName}
                              </span>
                            </TooltipTrigger>

                            <TooltipContent className="w-64 bg-popover border shadow-xl">
                              <div className="p-3 space-y-2">
                                <h4 className="font-bold text-popover-foreground">
                                  {row.vehicleName}
                                </h4>

                                <div className="border-t -mx-3 my-2" />

                                <div className="space-y-2 text-sm">

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                      <Milestone className="h-4 w-4" />
                                      Avg. Distance/Day
                                    </span>

                                    <span className="font-semibold text-popover-foreground">
                                      {row.avgDistance.toFixed(1)} km
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      Avg. Stoppage/Day
                                    </span>

                                    <span className="font-semibold text-popover-foreground">
                                      {row.avgStoppage.toFixed(1)} hrs
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">
                                      Active Days:
                                    </span>

                                    <span className="font-semibold text-popover-foreground">
                                      {row.activeDays}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">
                                      Best Day:
                                    </span>

                                    <span className="font-semibold text-popover-foreground">
                                      {row.bestDay.distance.toFixed(0)} km ({row.bestDay.date})
                                    </span>
                                  </div>

                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* DAILY CELLS */}
                      {days.map((day) => {
                        const dayOfMonth = format(day, 'd');

                        const data = row.dailyData[dayOfMonth];

                        return (
                          <ReportCell
                            key={day.toString()}
                            day={day}
                            data={data}
                            highlightProblems={highlightProblems}
                          />
                        );
                      })}

                      {/* MONTHLY TOTALS */}
                      <TableCell className="sticky right-0 bg-muted/50 shadow-md border-l z-10 min-w-[200px] p-2 space-y-1.5">

                        <div className="bg-card rounded-md p-2 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-2">
                            <Milestone className="h-4 w-4 text-blue-500" />

                            <span className="text-xs font-medium text-muted-foreground">
                              DISTANCE
                            </span>
                          </div>

                          <span className="font-bold text-sm text-foreground">
                            {row.totalDistance.toFixed(0)}

                            <span className="font-normal text-xs text-muted-foreground ml-1">
                              km
                            </span>
                          </span>
                        </div>

                        <div className="bg-card rounded-md p-2 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />

                            <span className="text-xs font-medium text-muted-foreground">
                              STOPPAGE
                            </span>
                          </div>

                          <span className="font-bold text-sm text-foreground">
                            {row.totalStoppage}
                          </span>
                        </div>

                      </TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>

            <Select
              value={String(
                pagination.pageSize
              )}
              onValueChange={(
                value
              ) => {
                setPagination({
                  pageIndex: 0,
                  pageSize:
                    Number(value),
                });
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue
                  placeholder={
                    pagination.pageSize
                  }
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="5">
                  5
                </SelectItem>

                <SelectItem value="10">
                  10
                </SelectItem>

                <SelectItem value="20">
                  20
                </SelectItem>

              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {totalRecords > 0
                ? `${firstRowIndex}-${lastRowIndex} of ${totalRecords}`
                : '0-0 of 0'}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination(
                    (p) => ({
                      ...p,
                      pageIndex: 0,
                    })
                  )
                }
                disabled={
                  pagination.pageIndex ===
                  0
                }
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination(
                    (p) => ({
                      ...p,
                      pageIndex:
                        p.pageIndex -
                        1,
                    })
                  )
                }
                disabled={
                  pagination.pageIndex ===
                  0
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination(
                    (p) => ({
                      ...p,
                      pageIndex:
                        p.pageIndex +
                        1,
                    })
                  )
                }
                disabled={
                  pagination.pageIndex >=
                  pageCount - 1
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination(
                    (p) => ({
                      ...p,
                      pageIndex:
                        pageCount - 1,
                    })
                  )
                }
                disabled={
                  pagination.pageIndex >=
                  pageCount - 1
                }
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      <MonthlyReportHelpDialog
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />
    </>
  );
};

export default MonthlyDayWiseDistanceReport;