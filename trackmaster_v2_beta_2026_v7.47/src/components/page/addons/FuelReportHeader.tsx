import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { vehicles } from '@/data/mockData';

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

interface FuelReportHeaderProps {
    selectedVehicle: string;
    onVehicleChange: (vehicleId: string) => void;
    dateRange: DateRange | undefined;
    onDateRangeChange: (date: DateRange | undefined) => void;
    isCalendarOpen: boolean;
    onCalendarOpenChange: (open: boolean) => void;
    handleTimeRangeClick: (range: string) => void;
}

const FuelReportHeader = ({
    selectedVehicle,
    onVehicleChange,
    dateRange,
    onDateRangeChange,
    isCalendarOpen,
    onCalendarOpenChange,
    handleTimeRangeClick,
}: FuelReportHeaderProps) => {
    return (
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Fuel Graphical Report</CardTitle>
            <CardDescription>An interactive view of fuel, speed, and distance.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={onVehicleChange} className="w-full sm:w-[180px]" />
            <Popover open={isCalendarOpen} onOpenChange={onCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn('w-full sm:w-[260px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}` : format(dateRange.from, 'LLL dd, y')) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="end">
                <div className="flex flex-col space-y-1 p-2 border-r">
                  {timeRanges.map((range) => (
                    <Button key={range.value} variant="ghost" className="justify-start" onClick={() => handleTimeRangeClick(range.value)}>{range.label}</Button>
                  ))}
                </div>
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={1} />
              </PopoverContent>
            </Popover>
            <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
    )
}

export default FuelReportHeader;