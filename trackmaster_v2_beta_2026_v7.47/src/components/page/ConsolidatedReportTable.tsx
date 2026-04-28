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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { consolidatedReportTableData } from '@/data/mockData';
import {
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

type ReportData = (typeof consolidatedReportTableData)[0];
type ReportDataKey = keyof ReportData;

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'machineId', label: 'Machine ID' },
  { key: 'machineName', label: 'Machine Name' },
  { key: 'distance', label: 'Distance (km)' },
  { key: 'cumulativeHours', label: 'Driving Hours' },
  { key: 'nextServiceAt', label: 'Next Service At (Hrs)' },
  { key: 'serviceStatus', label: 'Service Status' },
  { key: 'alertsCount', label: 'Alerts Count' },
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

const StatusBadge = ({ status }: { status: string }) => {
  const baseClasses = 'text-xs font-semibold px-2.5 py-0.5 rounded-full';
  const variants = {
    OK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Due Soon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    Overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const variant =
    variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

  return <span className={cn(baseClasses, variant)}>{status}</span>;
};

const ConsolidatedReportTable = ({ dateRange, selectedVehicle }: { dateRange?: DateRange, selectedVehicle?: string }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const sortedData = useMemo(() => {
    let data = [...consolidatedReportTableData];

    if (dateRange?.from) {
      const start = startOfDay(dateRange.from);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      data = data.filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start, end });
      });
    }

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.machineId === selectedVehicle);
    }

    const sortableData = [...data];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [sortConfig, dateRange, selectedVehicle]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {headers.map((header) => (
                <SortableHeader
                  key={header.key as string}
                  onClick={() => handleSort(header.key)}
                  isSorted={sortConfig.key === header.key}
                  sortDirection={
                    sortConfig.key === header.key ? sortConfig.direction : undefined
                  }
                >
                  {header.label}
                </SortableHeader>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {row.date}
                </TableCell>
                <TableCell className="font-medium">{row.machineId}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {row.machineName}
                </TableCell>
                <TableCell>{(row.distance || 0).toFixed(1)}</TableCell>
                <TableCell>{row.cumulativeHours.toFixed(1)}</TableCell>
                <TableCell>{row.nextServiceAt}</TableCell>
                <TableCell>
                  <StatusBadge status={row.serviceStatus} />
                </TableCell>
                <TableCell>{row.alertsCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between p-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show rows:</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-20 h-8">
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
            {page * rowsPerPage + 1} -{' '}
            {Math.min((page + 1) * rowsPerPage, sortedData.length)} of{' '}
            {sortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReportTable;