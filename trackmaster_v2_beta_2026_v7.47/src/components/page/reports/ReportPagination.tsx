import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface ReportPaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  setPagination: (updater: React.SetStateAction<{ pageIndex: number; pageSize: number }>) => void;
}

const ReportPagination = ({
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  setPagination,
}: ReportPaginationProps) => {
  const firstRowIndex = totalRows > 0 ? pageIndex * pageSize + 1 : 0;
  const lastRowIndex = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPagination({ pageIndex: 0, pageSize: Number(value) });
          }}
        >
          <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
            <SelectValue placeholder={pageSize} />
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
          {firstRowIndex}-{lastRowIndex} of {totalRows}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-accent"
            onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))}
            disabled={pageIndex === 0}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-accent"
            onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
            disabled={pageIndex === 0}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-accent"
            onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
            disabled={pageIndex >= pageCount - 1}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-accent"
            onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))}
            disabled={pageIndex >= pageCount - 1}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportPagination;