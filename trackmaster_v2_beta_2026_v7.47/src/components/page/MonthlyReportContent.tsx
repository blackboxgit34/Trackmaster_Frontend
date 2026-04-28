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
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Fuel,
  Gauge,
  Milestone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subMonths, format, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  consolidatedReportTableData,
  vehicles,
} from '@/data/mockData';
import { MonthPicker } from '@/components/ui/month-picker';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const monthPickerPresets = [
  { label: 'This Month', date: new Date() },
  { label: 'Last Month', date: subMonths(new Date(), 1) },
  { label: 'last 2 month', date: subMonths(new Date(), 2) },
];

const PercentageChange = ({ value }: { value: number }) => {
  const isPositive = value > 0;
  const colorClasses = isPositive
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';
  const icon = isPositive ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );

  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={cn(
        'inline-flex items-center justify-start gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        colorClasses
      )}
    >
      {formattedValue}%{icon}
    </div>
  );
};

const MonthlyStatCard = ({
  title,
  value,
  unit,
  change,
  previousValue,
  Icon,
}: {
  title: string;
  value: string;
  unit: string;
  change: number;
  previousValue: string;
  Icon: React.ElementType;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-gray-400" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className="text-2xl font-bold">
        {value}{' '}
        <span className="text-base font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <span
          className={cn(
            'flex items-center gap-0.5',
            change > 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {change > 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {Math.abs(change).toFixed(2)}%
        </span>
        vs {previousValue} {unit}
      </p>
    </CardContent>
  </Card>
);

const getStatusBadgeVariant = (
  status: string
): 'destructive' | 'secondary' | 'default' => {
  switch (status.toLowerCase()) {
    case 'ok':
      return 'secondary';
    case 'due soon':
      return 'default';
    case 'overdue':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
);

type ReportData = (typeof consolidatedReportTableData)[0];
type SortKey = keyof ReportData;

const MonthlyReportContent = () => {
  const [month, setMonth] = useState<Date | undefined>(
    subMonths(new Date(), 1)
  );
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>(
    {
      key: 'date',
      direction: 'desc',
    }
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { monthlyStats, performanceMetrics } = useMemo(() => {
    if (!month) {
      return { monthlyStats: [], performanceMetrics: [] };
    }

    const currentMonthStart = startOfMonth(month);
    const currentMonthEnd = endOfMonth(month);
    const previousMonth = subMonths(month, 1);
    const previousMonthStart = startOfMonth(previousMonth);
    const previousMonthEnd = endOfMonth(previousMonth);

    const calculateTotals = (startDate: Date, endDate: Date) => {
      const filtered = consolidatedReportTableData.filter(row => {
        const rowDate = parseISO(row.date);
        const isInDateRange = isWithinInterval(rowDate, { start: startDate, end: endDate });
        const matchesVehicle = selectedVehicle === 'all' || row.vehicleId === selectedVehicle;
        return isInDateRange && matchesVehicle;
      });

      const totalHours = filtered.reduce((sum, row) => sum + row.workingHours, 0);
      const totalFuel = filtered.reduce((sum, row) => sum + row.fuelConsumed, 0);
      const totalDistance = filtered.reduce((sum, row) => sum + (row.distance || 0), 0);
      
      return { totalHours, totalFuel, totalDistance };
    };

    const currentMonthTotals = calculateTotals(currentMonthStart, currentMonthEnd);
    const previousMonthTotals = calculateTotals(previousMonthStart, previousMonthEnd);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const newMonthlyStats = [
      {
        title: 'Total Distance',
        value: currentMonthTotals.totalDistance.toFixed(0),
        unit: 'km',
        change: calcChange(currentMonthTotals.totalDistance, previousMonthTotals.totalDistance),
        previousValue: previousMonthTotals.totalDistance.toFixed(0),
        Icon: Milestone,
      },
      {
        title: 'Total Fuel Consumed',
        value: currentMonthTotals.totalFuel.toFixed(0),
        unit: 'L',
        change: calcChange(currentMonthTotals.totalFuel, previousMonthTotals.totalFuel),
        previousValue: previousMonthTotals.totalFuel.toFixed(0),
        Icon: Fuel,
      },
      {
        title: 'Avg. Efficiency',
        value: (currentMonthTotals.totalFuel > 0 ? currentMonthTotals.totalDistance / currentMonthTotals.totalFuel : 0).toFixed(2),
        unit: 'km/L',
        change: calcChange(
          currentMonthTotals.totalFuel > 0 ? currentMonthTotals.totalDistance / currentMonthTotals.totalFuel : 0,
          previousMonthTotals.totalFuel > 0 ? previousMonthTotals.totalDistance / previousMonthTotals.totalFuel : 0
        ),
        previousValue: (previousMonthTotals.totalFuel > 0 ? previousMonthTotals.totalDistance / previousMonthTotals.totalFuel : 0).toFixed(2),
        Icon: Gauge,
      },
    ];

    const newPerformanceMetrics = [
      {
        parameter: 'Total Fuel Consumption (L)',
        previous: previousMonthTotals.totalFuel,
        current: currentMonthTotals.totalFuel,
        change: currentMonthTotals.totalFuel - previousMonthTotals.totalFuel,
        percentChange: calcChange(currentMonthTotals.totalFuel, previousMonthTotals.totalFuel),
      },
      {
        parameter: 'Total Distance (km)',
        previous: previousMonthTotals.totalDistance,
        current: currentMonthTotals.totalDistance,
        change: currentMonthTotals.totalDistance - previousMonthTotals.totalDistance,
        percentChange: calcChange(currentMonthTotals.totalDistance, previousMonthTotals.totalDistance),
      },
    ];

    return { monthlyStats: newMonthlyStats, performanceMetrics: newPerformanceMetrics };
  }, [month, selectedVehicle]);

  const filteredData = useMemo(() => {
    if (!month) return [];

    const startOfMonthDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonthDate = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    return consolidatedReportTableData
      .filter((row) => {
        const rowDate = parseISO(row.date);
        const isInDateRange = isWithinInterval(rowDate, {
          start: startOfMonthDate,
          end: endOfMonthDate,
        });

        const matchesVehicle =
          selectedVehicle === 'all' || row.vehicleId === selectedVehicle;

        return isInDateRange && matchesVehicle;
      })
      .sort((a, b) => {
        const aValue = a[sort.key];
        const bValue = b[sort.key];
        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [selectedVehicle, month, sort]);

  const pageCount = Math.ceil(filteredData.length / pagination.pageSize);
  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const handleSort = (key: SortKey) => {
    if (sort.key === key) {
      setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key, direction: 'desc' });
    }
  };

  const SortableHeader = ({
    sortKey,
    children,
  }: {
    sortKey: SortKey;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center">
        {children}
        {sort.key === sortKey ? (
          sort.direction === 'asc' ? (
            <ArrowUp className="h-4 w-4 ml-1.5" />
          ) : (
            <ArrowDown className="h-4 w-4 ml-1.5" />
          )
        ) : null}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Monthly Fleet Report
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedVehicle === 'all' ? 'All Vehicles' : selectedVehicle} |{' '}
            {month ? format(month, 'MMMM yyyy') : 'No month selected'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <MonthPicker
            date={month}
            setDate={setMonth}
            presets={monthPickerPresets}
          />
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={setSelectedVehicle}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <WhatsappPopup />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthlyStats.map((stat) => (
          <MonthlyStatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
          <p className="text-sm text-muted-foreground">
            {month ? `Comparison between ${format(subMonths(month, 1), 'MMMM')} and ${format(month, 'MMMM yyyy')}.` : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="uppercase text-xs font-semibold h-10 px-4">
                  <div className="flex items-center gap-2 cursor-pointer">
                    Parameter{' '}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </TableHead>
                <TableHead className="uppercase text-xs font-semibold h-10 px-4">
                  {month ? format(subMonths(month, 1), 'MMMM') : 'Previous Month'}
                </TableHead>
                <TableHead className="uppercase text-xs font-semibold h-10 px-4">
                  {month ? format(month, 'MMMM') : 'Current Month'}
                </TableHead>
                <TableHead className="uppercase text-xs font-semibold h-10 px-4">
                  <div className="flex items-center justify-start gap-2 cursor-pointer">
                    Change{' '}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </TableHead>
                <TableHead className="uppercase text-xs font-semibold h-10 px-4">
                  <div className="flex items-center justify-start gap-2 cursor-pointer">
                    % Change{' '}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceMetrics.map((metric) => (
                <TableRow key={metric.parameter}>
                  <TableCell className="font-medium py-2 px-4">
                    {metric.parameter}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 px-4">
                    {metric.previous.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground py-2 px-4">
                    {metric.current.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 px-4">
                    {metric.change.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <PercentageChange value={metric.percentChange} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-lg font-semibold">Monthly Activity Log</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Detailed daily breakdown for the selected month.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <SortableHeader sortKey="date">Date</SortableHeader>
                  <SortableHeader sortKey="vehicleId">Vehicle ID</SortableHeader>
                  <SortableHeader sortKey="vehicleName">
                    Vehicle Name
                  </SortableHeader>
                  <SortableHeader sortKey="distance">Distance (km)</SortableHeader>
                  <SortableHeader sortKey="fuelConsumed">
                    Fuel Consumed (L)
                  </SortableHeader>
                  <SortableHeader sortKey="serviceStatus">
                    Service Status
                  </SortableHeader>
                  <SortableHeader sortKey="alertsCount">Alerts</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.date}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.vehicleId}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        {row.vehicleName}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {(row.distance || 0).toFixed(1)}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.fuelConsumed.toFixed(1)}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={row.serviceStatus} />
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.alertsCount}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No results found for the selected criteria.
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
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({ pageIndex: 0, pageSize: Number(value) });
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
              {pagination.pageIndex * pagination.pageSize + 1} -{' '}
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                filteredData.length
              )}{' '}
              of {filteredData.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
                }
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))
                }
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MonthlyReportContent;