import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { CalendarIcon, ChevronLeft, ChevronRight, Info, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

type Props = {
  data: any[];
  dateRange: {
    start: Date;
    end: Date;
  };
  setDateRange: (range: { start: Date; end: Date }) => void;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-medium text-sm">{data.vehicle}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
            <span className="text-xs text-muted-foreground">Distance:</span>
            <span className="text-xs font-bold">{data.distance.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: { vehicle: string; distance: number }[] }) => {
  if (!data || data.length === 0) return null;

  const avgDistance = data.reduce((acc, curr) => acc + curr.distance, 0) / data.length;

  return (
    <div className="flex items-center justify-center gap-6 pt-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(34, 94%, 50%)' }} />
        <span>Average Distance Covered</span>
        <span className="font-bold text-foreground">{avgDistance.toFixed(1)} km</span>
      </div>
    </div>
  );
};

const DistanceCovered = ({ data, dateRange, setDateRange }: Props) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'default'>('default');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth'
      });
    }
  };

  const chartData = React.useMemo(() => {
    if (!data) return [];

    const mapped = data.map((item: any) => ({
      vehicle: item.vehicleName,
      distance: item.distance || 0
    }));

    if (sortOrder === 'asc') {
      return [...mapped].sort((a, b) => a.distance - b.distance);
    }

    if (sortOrder === 'desc') {
      return [...mapped].sort((a, b) => b.distance - a.distance);
    }

    return [...mapped].sort((a, b) =>
      a.vehicle.localeCompare(b.vehicle)
    );
  }, [data, sortOrder]);

  const yDomain = React.useMemo(() => {
    if (chartData.length === 0) return [0, 1000];
    const max = Math.max(...chartData.map(d => d.distance));
    return [0, Math.ceil(max / 250) * 250];
  }, [chartData]);

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return;

    setDateRange({
      start: range.from,
      end: range.to
    });
  };

  return (
    <Card className="h-full relative flex flex-col">

      {/* HEADER */}
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Distance Covered</CardTitle>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button className="h-4 w-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total distance covered for each vehicle.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      {/* CONTROLS */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">

        {/* DATE PICKER */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.start
                ? `${format(dateRange.start, 'LLL dd, y')} - ${format(dateRange.end, 'LLL dd, y')}`
                : 'Pick Date'}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-0">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.start,
                to: dateRange.end
              }}
              onSelect={handleRangeSelect}
            />
          </PopoverContent>
        </Popover>

        {/* SORT */}
        <Button
          size="icon"
          variant={sortOrder === 'asc' ? 'secondary' : 'outline'}
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'default' : 'asc')}
        >
          <ArrowUpNarrowWide className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant={sortOrder === 'desc' ? 'secondary' : 'outline'}
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'default' : 'desc')}
        >
          <ArrowDownNarrowWide className="h-4 w-4" />
        </Button>

        {/* SCROLL */}
        <Button size="icon" onClick={() => scroll('left')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button size="icon" onClick={() => scroll('right')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* CHART */}
      <CardContent className="flex-grow p-6 pt-0">
        <div className="flex">

          <div style={{ width: 80, height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{}]}>
                <YAxis domain={yDomain} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
            <div style={{ width: chartData.length * 40, height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="vehicle" angle={-45} textAnchor="end" />
                  <YAxis hide domain={yDomain} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="distance" fill="hsl(34, 94%, 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <CustomLegend data={chartData} />
      </CardContent>
    </Card>
  );
};

export default DistanceCovered;