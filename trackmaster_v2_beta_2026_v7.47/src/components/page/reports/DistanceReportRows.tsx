import React from 'react';
import {
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import TripDetailsTable from './TripDetailsTable';
import type { ReportRow, BaseDetailData } from '@/types/report-types';

interface DistanceReportRowsProps {
  paginatedData: ReportRow[];
  detailRows: BaseDetailData[];
  expandedRows: Set<string>;
  toggleRow: (rowId: string) => void;
}

const DistanceReportRows = ({
  paginatedData,
  detailRows,
  expandedRows,
  toggleRow,
}: DistanceReportRowsProps) => {
  if (paginatedData.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
            No data found for the selected filters.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {paginatedData.map((row) => {
        const isExpanded = expandedRows.has(row.id);
        const detailsForThisRow = detailRows.filter(
          detail => detail.vehicleId === row.vehicleId && detail.date === row.date
        );

        return (
          <React.Fragment key={row.id}>
            <TableRow className="bg-card hover:bg-muted/50 border-b">
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.date}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.vehicleId}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">{row.vehicleName}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.distance.toFixed(1)}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <Button
                  variant="link"
                  onClick={() => toggleRow(row.id)}
                  className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1"
                  aria-expanded={isExpanded}
                  aria-controls={`details-${row.id}`}
                >
                  Details
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </Button>
              </TableCell>
            </TableRow>
            {isExpanded && (
              <TableRow id={`details-${row.id}`} className="bg-muted/20 hover:bg-muted/20">
                <TableCell colSpan={5} className="p-0">
                  <div className="bg-muted/50 p-8">
                    <TripDetailsTable
                      details={detailsForThisRow}
                      totalDistance={row.distance}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        );
      })}
    </TableBody>
  );
};

export default DistanceReportRows;