import { useMemo, useState } from 'react';
import { consolidatedReportTableData, vehicles } from '@/data/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { VehicleCombobox } from '../VehicleCombobox';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import {
  subDays,
  isWithinInterval,
  subHours,
  subWeeks,
  subMonths,
} from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import WhatsappPopup from '../WhatsappPopup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportData = (typeof consolidatedReportTableData)[0];
type SortKey = keyof ReportData;

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

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const ConsolidatedReportContent = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(
    'last-week'
  );
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>(
    {
      key: 'date',
      direction: 'desc',
    }
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

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

    setDateRange({ from: fromDate, to: now });
    setActiveTimeRange(range);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDateRange(newDate);
    setActiveTimeRange(null);
  };

  const selectedTimeRangeLabel =
    timeRanges.find((r) => r.value === activeTimeRange)?.label ||
    'Select a time range';

  const filteredData = useMemo(() => {
    return consolidatedReportTableData
      .filter((row) => {
        const rowDate = new Date(row.date);
        const isInDateRange =
          dateRange?.from && dateRange?.to
            ? isWithinInterval(rowDate, {
                start: dateRange.from,
                end: dateRange.to,
              })
            : true;

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
  }, [selectedVehicle, dateRange, sort]);

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
      className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sort.key === sortKey ? (
          sort.direction === 'asc' ? (
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

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Day-wise Consolidated Report
          </CardTitle>
          <CardDescription>
            Detailed daily performance metrics for all vehicles.
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
          <DateRangePicker date={dateRange} setDate={handleDateChange} />
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            className="w-full sm:w-[180px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
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
                <SortableHeader sortKey="location">Location</SortableHeader>
                <SortableHeader sortKey="workingHours">
                  Working Hours
                </SortableHeader>
                <SortableHeader sortKey="fuelConsumed">
                  Fuel Consumed (L)
                </SortableHeader>
                <SortableHeader sortKey="cumulativeHours">
                  Cumulative Hours
                </SortableHeader>
                <SortableHeader sortKey="serviceStatus">
                  Service Status
                </SortableHeader>
                <SortableHeader sortKey="alertsCount">Alerts</SortableHeader>
                <SortableHeader sortKey="errorCount">Errors</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-card hover:bg-muted/50 border-b"
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                    {row.vehicleId}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                    {row.vehicleName}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.location}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.workingHours.toFixed(1)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.fuelConsumed.toFixed(1)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {Math.round(row.cumulativeHours)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <Badge variant={getStatusBadgeVariant(row.serviceStatus)}>
                      {row.serviceStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.alertsCount}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.errorCount}
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
            {pagination.pageIndex * pagination.pageSize + 1}-
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
  );
};

export default ConsolidatedReportContent;