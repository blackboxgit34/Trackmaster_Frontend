import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide
} from 'lucide-react';

import { format } from 'date-fns';
import { API_BASE_URL } from '@/config/Api';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import {
  TooltipProvider,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

type Props = {
  dateRange: {
    start: Date;
    end: Date;
  };
  setDateRange: (range: {
    start: Date;
    end: Date;
  }) => void;
};

/* ---------------- TOOLTIP ---------------- */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-1 text-sm font-semibold">{item.vehicle}</p>

        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          />

          <span className="text-xs text-muted-foreground">Distance:</span>

          <span className="text-xs font-bold">
            {item.distance.toFixed(1)} km
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/* ---------------- LEGEND ---------------- */
const CustomLegend = ({ data }: any) => {
  if (!data?.length) return null;

  const validData = data.filter((item: any) => item.distance > 0);

  const avgDistance =
    validData.length > 0
      ? validData.reduce((acc: number, curr: any) => acc + curr.distance, 0) /
        validData.length
      : 0;

  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <div
        className="h-3 w-3 rounded-sm"
        style={{ backgroundColor: 'hsl(34, 94%, 50%)' }}
      />
      <span>Average Distance Covered:</span>
      <span className="font-semibold text-foreground">
        {avgDistance.toFixed(1)} km
      </span>
    </div>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
const DistanceCovered = ({ dateRange, setDateRange }: Props) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sortOrder, setSortOrder] =
    useState<'asc' | 'desc' | 'default'>('default');

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ---------------- SCROLL ---------------- */
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth'
    });
  };

  /* ---------------- DATE FORMAT (IMPORTANT FIX) ---------------- */
  const formatDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  };

  /* ---------------- FETCH DATA ---------------- */
  const fetchData = async () => {
    try {
      setLoading(true);

      const auth = JSON.parse(
        localStorage.getItem('trackmaster-auth') || '{}'
      );

      const custId = auth.custId;

      const start = formatDateTime(dateRange.start);
      const end = formatDateTime(dateRange.end);

      const url =
        `${API_BASE_URL}/Dashboard/dashboarddata` +
        `?userid=${custId}` +
        `&type=distancecovered` +
        `&start=${start}` +
        `&end=${end}`;

      const res = await fetch(url);
      const result = await res.json();

      console.log('Distance API:', result);

      if (result?.isSuccess) {
        setData(Array.isArray(result.distanceData) ? result.distanceData : []);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  /* ---------------- CHART DATA ---------------- */
  const chartData = useMemo(() => {
    if (!data?.length) return [];

    const mapped = data.map((item: any) => ({
      vehicle: item.vehicleName || 'Unknown',
      distance: Number(item.distance || 0)
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

  /* ---------------- Y AXIS ---------------- */
  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];

    const max = Math.max(...chartData.map((i) => i.distance));

    return [0, Math.ceil(max / 100) * 100];
  }, [chartData]);

  /* ---------------- UI ---------------- */
  return (
    <Card className="relative flex h-full flex-col overflow-hidden">

      {/* HEADER */}
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Distance Covered</CardTitle>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button>
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
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.start, 'LLL dd, yyyy')} -{' '}
              {format(dateRange.end, 'LLL dd, yyyy')}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.start,
                to: dateRange.end
              }}
              onSelect={(range) => {
                if (!range?.from || !range?.to) return;

                setDateRange({
                  start: range.from,
                  end: range.to
                });

                setIsCalendarOpen(false);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Button
          size="icon"
          variant={sortOrder === 'asc' ? 'secondary' : 'outline'}
          onClick={() =>
            setSortOrder((p) => (p === 'asc' ? 'default' : 'asc'))
          }
        >
          <ArrowUpNarrowWide className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant={sortOrder === 'desc' ? 'secondary' : 'outline'}
          onClick={() =>
            setSortOrder((p) => (p === 'desc' ? 'default' : 'desc'))
          }
        >
          <ArrowDownNarrowWide className="h-4 w-4" />
        </Button>

        <Button size="icon" variant="outline" onClick={() => scroll('left')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button size="icon" variant="outline" onClick={() => scroll('right')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* CONTENT */}
      <CardContent className="relative flex-1 p-6 pt-0">

        {loading ? (
          <div className="flex h-[320px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex">

            {/* Y AXIS */}
            <div style={{ width: 60, height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[]}>
                  <YAxis domain={yDomain} tick={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* CHART */}
            <div ref={scrollContainerRef} className="flex-1 overflow-x-hidden">
              <div
                style={{
                  width: `${Math.max(chartData.length * 8, 100)}%`,
                  height: 320
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="vehicle"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis hide domain={yDomain} />

                    <Tooltip content={<CustomTooltip />} />

                    <Bar
                      dataKey="distance"
                      fill="hsl(34, 94%, 50%)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <CustomLegend data={chartData} />
      </CardContent>
    </Card>
  );
};

export default DistanceCovered;