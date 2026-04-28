import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import WhatsappPopup from '../../WhatsappPopup';
import { VehicleCombobox } from '../../VehicleCombobox';
import { vehicles } from '@/data/mockData';

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
];

interface DistanceReportToolbarProps {
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
  selectedVehicle: string;
  setSelectedVehicle: (vehicle: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
}

const DistanceReportToolbar = ({
  dateRange,
  setDateRange,
  selectedVehicle,
  setSelectedVehicle,
  onExportPDF,
  onExportCSV,
}: DistanceReportToolbarProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (range) {
      case 'today': fromDate = now; break;
      case 'yesterday': fromDate = subDays(now, 1); toDate = subDays(now, 1); break;
      case 'last-week': fromDate = subWeeks(now, 1); break;
      case 'last-month': fromDate = subMonths(now, 1); break;
      default: fromDate = now;
    }
    setDateRange({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn('w-full sm:w-[260px] justify-start text-left font-normal')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
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
                onClick={() => handleTimeRangeClick(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
      <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onExportPDF}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WhatsappPopup />
    </div>
  );
};

export default DistanceReportToolbar;