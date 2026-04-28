import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sortAndCalculateDetails } from '@/lib/report-utils';
import type { BaseDetailData, DetailSortKey } from '@/types/report-types';

const SortableHeader = ({ children, sortKey, currentSort, onSort }: { children: React.ReactNode; sortKey: DetailSortKey; currentSort: { key: DetailSortKey; direction: 'asc' | 'desc' }; onSort: (key: DetailSortKey) => void; }) => {
  const isSorted = currentSort.key === sortKey;
  return (
    <TableHead
      className="cursor-pointer group"
      onClick={() => onSort(sortKey)}
      aria-sort={isSorted ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button className="flex items-center gap-2 w-full text-left">
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

interface TripDetailsTableProps {
  details: BaseDetailData[];
  totalDistance: number;
}

const TripDetailsTable = ({ details, totalDistance }: TripDetailsTableProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: DetailSortKey; direction: 'asc' | 'desc' }>({ key: 'startTime', direction: 'asc' });

  const sortedAndCalculatedDetails = useMemo(() => {
    return sortAndCalculateDetails(details, totalDistance, sortConfig);
  }, [details, totalDistance, sortConfig]);

  return (
    <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b">
        <h5 className="text-lg font-semibold text-foreground">
          Trip Details
        </h5>
        <p className="text-sm text-muted-foreground">
          Detailed trip breakdown for the selected day.
        </p>
      </div>
      <div className="p-6">
        <ScrollArea className="h-[240px] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="startTime" currentSort={sortConfig} onSort={setSortConfig}>Start Time</SortableHeader>
                <SortableHeader sortKey="endTime" currentSort={sortConfig} onSort={setSortConfig}>End Time</SortableHeader>
                <SortableHeader sortKey="duration" currentSort={sortConfig} onSort={setSortConfig}>Duration (hrs)</SortableHeader>
                <SortableHeader sortKey="sessionDistance" currentSort={sortConfig} onSort={setSortConfig}>Est. Distance (km)</SortableHeader>
                <SortableHeader sortKey="cumulativeDistance" currentSort={sortConfig} onSort={setSortConfig}>Est. Cumulative (km)</SortableHeader>
                <SortableHeader sortKey="location" currentSort={sortConfig} onSort={setSortConfig}>Start Location</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndCalculatedDetails.length > 0 ? (
                sortedAndCalculatedDetails.map(detail => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-mono text-sm">{detail.startTime}</TableCell>
                    <TableCell className="font-mono text-sm">{detail.endTime}</TableCell>
                    <TableCell className="text-sm">{detail.duration.toFixed(1)}</TableCell>
                    <TableCell className="text-sm">{detail.sessionDistance.toFixed(1)}</TableCell>
                    <TableCell className="text-sm font-semibold">{detail.cumulativeDistance.toFixed(1)}</TableCell>
                    <TableCell className="text-sm truncate">{detail.location}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No trip details available for this day.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TripDetailsTable;