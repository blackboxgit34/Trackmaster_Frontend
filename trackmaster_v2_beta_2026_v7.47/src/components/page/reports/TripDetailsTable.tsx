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

const SortableHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: DetailSortKey;
  currentSort: { key: DetailSortKey; direction: 'asc' | 'desc' };
  onSort: (key: DetailSortKey) => void;
}) => {
  const isSorted = currentSort.key === sortKey;

  return (
    <TableHead
      className="cursor-pointer group"
      onClick={() => onSort(sortKey)}
      aria-sort={
        isSorted
          ? currentSort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
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

const TripDetailsTable = ({
  details,
  totalDistance,
}: TripDetailsTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: DetailSortKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'startTime',
    direction: 'asc',
  });

  const handleSort = (key: DetailSortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key,
        direction: 'asc',
      };
    });
  };

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
          Detailed trip breakdown for the selected date range.
        </p>
      </div>

      <div className="p-6">
        <ScrollArea className="h-[240px] pr-4">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <SortableHeader
                  sortKey="startTime"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[140px]">Start Time</div>
                </SortableHeader>

                <SortableHeader
                  sortKey="endTime"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[140px]">End Time</div>
                </SortableHeader>

                <SortableHeader
                  sortKey="duration"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[120px]">Duration</div>
                </SortableHeader>

                <SortableHeader
                  sortKey="sessionDistance"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[140px]">Distance</div>
                </SortableHeader>

                <SortableHeader
                  sortKey="cumulativeDistance"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[160px]">Cumulative</div>
                </SortableHeader>

                <SortableHeader
                  sortKey="location"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  <div className="w-[300px]">Start Location</div>
                </SortableHeader>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedAndCalculatedDetails.length > 0 ? (
                sortedAndCalculatedDetails.map(detail => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-mono text-sm w-[140px]">
                      {detail.startTime}
                    </TableCell>

                    <TableCell className="font-mono text-sm w-[140px]">
                      {detail.endTime}
                    </TableCell>

                    <TableCell className="text-sm w-[120px]">
                      {detail.duration.toFixed(1)}
                    </TableCell>

                    <TableCell className="text-sm w-[140px]">
                      {detail.sessionDistance.toFixed(1)}
                    </TableCell>

                    <TableCell className="text-sm font-semibold w-[160px]">
                      {detail.cumulativeDistance.toFixed(1)}
                    </TableCell>

                    {/* Location Column */}
                    <TableCell
                      className="
                        text-sm
                        w-[300px]
                        whitespace-normal
                        break-words
                      "
                    >
                      {detail.location}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
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