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
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide
} from 'lucide-react';

import type { DateRange } from 'react-day-picker';
import { API_BASE_URL } from '@/config/Api';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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
  data: any[];
  dateRange?: {
    start?: Date;
    end?: Date;
    from?: Date;
    to?: Date;
  };
  setDateRange?: (range: any) => void;
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
const DistanceCovered = ({
  data: initialData,
  dateRange,
  setDateRange
}: Props) => {
  const [sortOrder, setSortOrder] =
    useState<'asc' | 'desc' | 'default'>('default');

  const [data, setData] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData?.length) {
      setData(initialData);
    }
  }, [initialData]);

  // Fallback internal date range if not controlled
  const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>(() => {
    if (dateRange) {
      const from = (dateRange as any).from || (dateRange as any).start;
      const to = (dateRange as any).to || (dateRange as any).end;
      if (from || to) return { from, to };
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  });

  const selectedDateRange: DateRange | undefined = useMemo(() => {
    if (dateRange) {
      const from = (dateRange as any).from || (dateRange as any).start;
      const to = (dateRange as any).to || (dateRange as any).end;
      if (from || to) {
        return { from, to };
      }
    }
    return internalDateRange;
  }, [dateRange, internalDateRange]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ---------------- SCROLL ---------------- */
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth'
    });
  };

  /* ---------------- DATE FORMAT ---------------- */
  const formatDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  };

  /* ---------------- FETCH DATA ---------------- */
  const fetchData = async (range: {
    start: Date;
    end: Date;
  }) => {
    try {
      setLoading(true);

      const auth = JSON.parse(
        localStorage.getItem('trackmaster-auth') || '{}'
      );

      const custId = auth.custId;

      const start = formatDateTime(range.start);
      const end = formatDateTime(range.end);

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

  const handleDateChange = async (newRange: DateRange | undefined) => {
    setInternalDateRange(newRange);
    if (!newRange?.from) return;

    const start = newRange.from;
    const end = newRange.to || newRange.from;

    if (setDateRange) {
      setDateRange({
        start,
        end,
        from: start,
        to: end
      });
    }

    await fetchData({ start, end });
  };

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
    <Card className="relative flex flex-col overflow-hidden">

      {/* HEADER */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 p-6 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">
            Distance Covered
          </CardTitle>

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

        {/* CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* REPORTS DATE RANGE PICKER */}
          <DateRangePicker
            date={selectedDateRange}
            setDate={handleDateChange}
          />

          {/* SORT ASC */}
          <Button
            size="icon"
            variant={sortOrder === 'asc' ? 'secondary' : 'outline'}
            onClick={() =>
              setSortOrder((p) => (p === 'asc' ? 'default' : 'asc'))
            }
            title="Sort Ascending"
          >
            <ArrowUpNarrowWide className="h-4 w-4" />
          </Button>

          {/* SORT DESC */}
          <Button
            size="icon"
            variant={sortOrder === 'desc' ? 'secondary' : 'outline'}
            onClick={() =>
              setSortOrder((p) => (p === 'desc' ? 'default' : 'desc'))
            }
            title="Sort Descending"
          >
            <ArrowDownNarrowWide className="h-4 w-4" />
          </Button>

          {/* SCROLL LEFT */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll('left')}
            title="Scroll Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* SCROLL RIGHT */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll('right')}
            title="Scroll Right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="relative flex-1 p-6 pt-0">

        {loading ? (
          <div className="flex h-[250px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex">

            {/* Y AXIS */}
            <div style={{ width: 70, height: 250, overflow: 'hidden' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{}]} margin={{ top: 20, right: 0, left: 0, bottom: 65 }}>
                  <YAxis
                    type="number"
                    domain={[0, yDomain[1]]}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* CHART */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-x-hidden"
              style={{ overflowY: 'hidden' }}
            >
              <div
                style={{
                  width: `${Math.max(chartData.length * 40, 200)}px`,
                  height: 250
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="vehicle"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                      height={60}
                    />

                    <YAxis hide domain={yDomain} />

                    <Tooltip content={<CustomTooltip />} />

                    <Bar
                      dataKey="distance"
                      fill="hsl(34, 94%, 50%)"
                      radius={[6, 6, 0, 0]}
                      barSize={10}
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
