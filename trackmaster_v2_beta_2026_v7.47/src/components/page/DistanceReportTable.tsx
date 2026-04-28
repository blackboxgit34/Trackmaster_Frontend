import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks } from 'date-fns';
import { useDistanceReportData } from '@/hooks/useDistanceReportData';
import { filterReportData, sortReportData, handleExportCSV, handleExportPDF } from '@/lib/report-utils';
import type { ReportSortKey } from '@/types/report-types';
import DistanceReportToolbar from './reports/DistanceReportToolbar';
import DistanceReportRows from './reports/DistanceReportRows';
import ReportPagination from './reports/ReportPagination';

const headers: { key: ReportSortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'vehicleId', label: 'Vehicle ID' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'distance', label: 'Distance (km)' },
];

const SortableHeader = ({ children, sortKey, currentSort, onSort }: { children: React.ReactNode; sortKey: ReportSortKey; currentSort: { key: ReportSortKey; direction: 'asc' | 'desc' }; onSort: (key: ReportSortKey) => void; }) => {
  const isSorted = currentSort.key === sortKey;
  return (
    <TableHead
      className="cursor-pointer group"
      onClick={() => onSort(sortKey)}
      aria-sort={isSorted ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button className="flex items-center gap-2 w-full text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {children}
        {isSorted ? (
          currentSort.direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
        )}
      </button>
    </TableHead>
  );
};

const DistanceReportTable = () => {
  // State Management
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: ReportSortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Data Fetching
  const { reportRows, detailRows, isLoading } = useDistanceReportData();

  // Data Processing
  const filteredData = useMemo(() => filterReportData(reportRows, dateRange, selectedVehicle), [reportRows, dateRange, selectedVehicle]);
  const sortedData = useMemo(() => sortReportData(filteredData, sortConfig), [filteredData, sortConfig]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }, [selectedVehicle, dateRange]);

  // Pagination Calculation
  const pageCount = Math.ceil(sortedData.length / pagination.pageSize);
  const paginatedData = sortedData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  // Handlers
  const handleSort = (key: ReportSortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleRow = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Distance Report</CardTitle>
          <CardDescription>Daily distance travelled by vehicles.</CardDescription>
        </div>
        <DistanceReportToolbar
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          onExportPDF={() => handleExportPDF(sortedData)}
          onExportCSV={() => handleExportCSV(sortedData)}
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                {headers.map((header) => (
                  <SortableHeader key={header.key} sortKey={header.key} currentSort={sortConfig} onSort={handleSort}>
                    {header.label}
                  </SortableHeader>
                ))}
                <TableHead className="px-6 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <DistanceReportRows
              paginatedData={paginatedData}
              detailRows={detailRows}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
            />
          </Table>
        </div>
      </CardContent>
      <CardFooter className="py-3 px-6 border-t bg-card">
        <ReportPagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={pageCount}
          totalRows={sortedData.length}
          setPagination={setPagination}
        />
      </CardFooter>
    </Card>
  );
};

export default DistanceReportTable;