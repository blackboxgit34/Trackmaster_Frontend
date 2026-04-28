import React, { useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { consolidatedReportTableData, vehicles } from '@/data/mockData';
import { DateRange } from 'react-day-picker';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Info, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
        <span className="font-bold text-foreground">{avgDistance.toFixed(1)}km</span>
      </div>
    </div>
  );
};

const DistanceCovered = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'default'>('default');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handlePresetSelect = (preset: 'today' | 'yesterday' | '7d' | '30d' | '60d') => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDate({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDate({ from: yesterday, to: yesterday });
        break;
      case '7d':
        setDate({ from: subDays(now, 6), to: now });
        break;
      case '30d':
        setDate({ from: subDays(now, 29), to: now });
        break;
      case '60d':
        setDate({ from: subDays(now, 59), to: now });
        break;
    }
    setIsCalendarOpen(false);
  };

  const chartData = React.useMemo(() => {
    let dataToProcess = consolidatedReportTableData;

    if (date?.from && date?.to) {
      const start = startOfDay(date.from);
      const end = endOfDay(date.to);
      dataToProcess = dataToProcess.filter(d => {
        const dataDate = parseISO(d.date);
        return isWithinInterval(dataDate, { start, end });
      });
    } else if (date?.from) {
      const start = startOfDay(date.from);
      const end = endOfDay(date.from);
      dataToProcess = dataToProcess.filter(d => {
        const dataDate = parseISO(d.date);
        return isWithinInterval(dataDate, { start, end });
      });
    }

    const vehicleDistances: Record<string, { distance: number }> = {};
    dataToProcess.forEach(item => {
      if (!vehicleDistances[item.vehicleId]) {
        vehicleDistances[item.vehicleId] = { distance: 0 };
      }
      vehicleDistances[item.vehicleId].distance += item.distance || 0;
    });

    const aggregatedData = Object.keys(vehicleDistances).map(vehicleId => ({
      vehicle: vehicles.find(v => v.id === vehicleId)?.name || vehicleId,
      distance: parseFloat(vehicleDistances[vehicleId].distance.toFixed(1)),
    }));

    if (sortOrder === 'asc') {
      return aggregatedData.sort((a, b) => a.distance - b.distance);
    }
    if (sortOrder === 'desc') {
      return aggregatedData.sort((a, b) => b.distance - a.distance);
    }

    return aggregatedData.sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [date, sortOrder]);

  const Y_AXIS_WIDTH = 80;
  const X_AXIS_HEIGHT = 70;
  const CHART_HEIGHT = 250;

  const yDomain = React.useMemo(() => {
    if (chartData.length === 0) return [0, 1000];
    const maxDistance = Math.max(...chartData.map(d => d.distance));
    return [0, Math.ceil(maxDistance / 250) * 250];
  }, [chartData]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Card className="h-full relative flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Distance Covered</CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                    <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total distance covered for each vehicle.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button id="date" variant={'outline'} className={cn('w-full sm:w-[260px] justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? `${format(date.from, 'LLL dd, y')} - ${format(date.to, 'LLL dd, y')}` : format(date.from, 'LLL dd, y')) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex" align="end">
              <div className="flex flex-col space-y-1 p-2 border-r">
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('today')}>Today</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('yesterday')}>Yesterday</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('7d')}>Last 7 days</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('30d')}>Last 30 days</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('60d')}>Last 60 days</Button>
              </div>
              <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1} />
            </PopoverContent>
          </Popover>
          <Button variant={sortOrder === 'asc' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setSortOrder(prev => prev === 'asc' ? 'default' : 'asc')} aria-label="Sort ascending">
            <ArrowUpNarrowWide className="h-4 w-4" />
          </Button>
          <Button variant={sortOrder === 'desc' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setSortOrder(prev => prev === 'desc' ? 'default' : 'desc')} aria-label="Sort descending">
            <ArrowDownNarrowWide className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => scroll('left')}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => scroll('right')}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <CardContent className="p-6 pt-0 flex-grow flex flex-col min-h-0">
          <div className="flex flex-grow">
            <div style={{ height: `${CHART_HEIGHT}px`, width: `${Y_AXIS_WIDTH}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{}]} margin={{ top: 5, right: 0, left: 0, bottom: X_AXIS_HEIGHT }}>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={yDomain} label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, offset: -15 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar min-w-0" ref={scrollContainerRef}>
              <div style={{ width: `${chartData.length * 40}px`, height: `${CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="vehicle" tickLine={false} axisLine={true} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={X_AXIS_HEIGHT} />
                    <YAxis hide={true} domain={yDomain} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
                    <Bar dataKey="distance" fill="hsl(34, 94%, 50%)" radius={[4, 4, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <CustomLegend data={chartData} />
        </CardContent>
      </Card>
    </>
  );
};

export default DistanceCovered;