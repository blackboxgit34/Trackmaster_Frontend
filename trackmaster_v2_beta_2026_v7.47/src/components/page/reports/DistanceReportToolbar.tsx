import React, { useState, useEffect } from 'react';
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
import { API_BASE_URL } from '@/config/Api';
import { useSearchParams } from 'react-router-dom';

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
  const [vehicles, setVehicles] = useState<{ label: string; value: string }[]>([]);
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');

        const custId = auth.custId;

        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );

        const data = await response.json();

        const formattedVehicles = [
          {
            label: 'All Vehicles',
            value: '',
          },
          ...(data.data || []).map((v: any) => ({
            label: v.vehName,
            value: v.bbid,
          })),
        ];

        setVehicles(formattedVehicles);

        // Only set selected vehicle if parent hasn't provided one yet
        if (formattedVehicles.length > 0) {
          // If a vehicle is provided in URL, prefer that. Otherwise only set when selectedVehicle is falsy.
          if (vehicleFromUrl) {
            setSelectedVehicle(vehicleFromUrl);
          } else if (!selectedVehicle) {
            setSelectedVehicle(formattedVehicles[0].value);
          }
        }
      } catch (error) {
        console.error('Vehicle API Error', error);
      }
    };

    loadVehicles();
  }, []);
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
            onSelect={(val) => {
              // Normalize single-date selection so both from and to are set
              if (!val) {
                setDateRange(undefined);
                return;
              }

              // val might be a Date or a DateRange object depending on picker
              const maybeAny: any = val;
              if (maybeAny instanceof Date) {
                setDateRange({ from: maybeAny, to: maybeAny });
                return;
              }

              // Range: ensure to is set; if only from present, set to = from
              if (maybeAny.from && !maybeAny.to) {
                setDateRange({ from: maybeAny.from, to: maybeAny.from });
                return;
              }

              if (maybeAny.from && maybeAny.to) {
                const from = maybeAny.from as Date;
                const to = maybeAny.to as Date;
                if (from > to) {
                  setDateRange({ from: to, to: from });
                  return;
                }
              }

              setDateRange(maybeAny as any);
            }}
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