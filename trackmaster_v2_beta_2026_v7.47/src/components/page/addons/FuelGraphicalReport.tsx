import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Download,
  Fuel,
  Gauge,
  Milestone,
  MapPin,
  Clock,
  ArrowRightFromLine,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  subDays,
  format,
  parseISO,
  differenceInSeconds,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parse,
  subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { vehicles, actualVehicles, fuelFillingDetails, fuelTheftDetails } from '@/data/mockData';
import { routeData } from '@/data/routeData';
import { ChartConfig, ChartContainer, ChartLegendContent } from '@/components/ui/chart';
import FuelDeclarationDialog from './FuelDeclarationDialog';

/* ----------------------------
  Chart config + time ranges
   --------------------------- */
const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(var(--primary))' },
  speed: { label: 'Speed (km/h)', color: 'hsl(142.1, 76.2%, 45.1%)' },
  distance: { label: 'Distance (km)', color: 'hsl(34.9, 82.6%, 52.2%)' },
} satisfies ChartConfig;

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

/* ----------------------------
  Chart hover tooltip (kept unchanged)
   --------------------------- */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const fullDate = new Date(data.timestamp);
    const formattedDateTime = format(fullDate, "MMM dd, yyyy HH:mm:ss");

    return (
      <div className="min-w-[250px] rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-bold text-foreground mb-2">{formattedDateTime}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Fuel className="h-4 w-4 text-blue-500" />
              <span>Fuel Level</span>
            </div>
            <span className="font-semibold text-sm">{data.fuel} L</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4 text-green-500" />
              <span>Speed</span>
            </div>
            <span className="font-semibold text-sm">{data.speed} km/h</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Milestone className="h-4 w-4 text-orange-500" />
              <span>Distance</span>
            </div>
            <span className="font-semibold text-sm">{data.distance} km</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span>Location</span>
            </div>
            <span className="font-semibold text-sm truncate max-w-[120px]">{data.location || 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/* ----------------------------
  Utility
   --------------------------- */
const formatEventDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/* ----------------------------
  Compact Fuel Event Tooltip Component
  (Used inside CustomizedDot's PopoverContent)
  Height reduced: smaller padding, fonts, icons, gaps
   --------------------------- */
const FuelEventTooltipContent = ({ event }: { event: any }) => {
  const { type, amount, beforeLevel, afterLevel, timestamp, location, duration } = event;
  const isFilling = type === 'filling';

  return (
    <div className="grid grid-cols-[130px_1fr] shadow-xl rounded-md overflow-hidden text-xs">
      <div className={cn(
          'text-white flex flex-col items-center justify-center p-3 rounded-l-md',
          isFilling ? 'bg-gradient-to-b from-green-500 to-green-700' : 'bg-gradient-to-b from-red-500 to-red-700'
        )}>
        <div className="text-3xl font-bold">{amount.toFixed(0)}L</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] opacity-95">
          <Fuel className="h-3.5 w-3.5" />
          {isFilling ? 'Fuel Filled' : 'Fuel Theft'}
        </div>
      </div>

      <div className="p-3 bg-card">
        <div className="mb-2">
          <h3 className="font-semibold text-sm">{isFilling ? 'Fuel Filling Details' : 'Fuel Theft Details'}</h3>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(timestamp), "dd-MM-yyyy | hh:mma")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Before:</span>
            <span className="font-semibold">{beforeLevel.toFixed(0)}L</span>
          </div>

          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Speed:</span>
            <span className="font-semibold">{event.speed ?? 0}km/h</span>
          </div>

          <div className="flex items-center gap-2">
            <ArrowRightFromLine className="h-3.5 w-3.5 text-muted-foreground" />
            <span>After:</span>
            <span className="font-semibold">{afterLevel.toFixed(0)}L</span>
          </div>

          {isFilling ? (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Duration:</span>
              <span className="font-semibold">{formatEventDuration(duration)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Milestone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Distance:</span>
              <span className="font-semibold">{(event.distance ?? 0).toFixed(0)}km</span>
            </div>
          )}
        </div>

        <div className="border-t mt-3 pt-2">
          <div className="flex items-center justify-between text-sm text-blue-600 hover:underline cursor-pointer">
            <div className="flex items-center gap-1 overflow-hidden">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium truncate">{location || 'Location not available'}</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------
  CustomizedDot (renders pulsing dot + compact popover)
   --------------------------- */
const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  const [isOpen, setIsOpen] = useState(false);

  if (!payload?.event) return null;

  const color = payload.event.type === 'filling' ? 'rgb(34 197 94)' : 'rgb(239 68 68)';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <g transform={`translate(${cx}, ${cy})`} style={{ cursor: 'pointer' }}>
          <circle r="5" fill={color}>
            {!isOpen && (
              <>
                <animate attributeName="r" from="5" to="12" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
              </>
            )}
          </circle>
          <circle r="4" fill={color} />
        </g>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-auto" side="top" align="center">
        <FuelEventTooltipContent event={payload.event} />
      </PopoverContent>
    </Popover>
  );
};

/* ----------------------------
  FuelGraphicalReport (complete)
   --------------------------- */
const FuelGraphicalReport = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(actualVehicles[0]?.id ?? '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeclarationOpen, setIsDeclarationOpen] = useState(false);

  useEffect(() => {
    const HIDE_KEY = 'hideFuelDeclarationUntil';
    const hideUntil = localStorage.getItem(HIDE_KEY);
    if (!hideUntil || Date.now() > Number(hideUntil)) {
      setIsDeclarationOpen(true);
    }
  }, []);

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (range) {
      case 'today': fromDate = now; break;
      case 'yesterday': fromDate = subDays(now, 1); toDate = subDays(now, 1); break;
      case '7d': fromDate = subDays(now, 6); break;
      case 'last-month': fromDate = subMonths(now, 1); break;
      case 'last-2-months': fromDate = subMonths(now, 2); break;
      default: fromDate = now;
    }
    setDateRange({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  const chartData = useMemo(() => {
    if (!selectedVehicle || !dateRange?.from) return [];

    const vehicleInfo = actualVehicles.find(v => v.id === selectedVehicle);
    if (!vehicleInfo) return [];
    const tankCapacity = vehicleInfo.fuelTankCapacity;

    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    const trips = routeData.filter(trip =>
      trip.vehicleId === selectedVehicle &&
      isWithinInterval(parseISO(trip.date), { start, end })
    );
    const pathPoints = trips.flatMap(trip => trip.path).map(p => ({ ...p, type: 'path' }));

    const fillingEvents = fuelFillingDetails.filter(e =>
      e.vehicleId === selectedVehicle &&
      isWithinInterval(parse(e.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date()), { start, end })
    ).map(e => {
      const before = parse(e.beforeFillingDate, 'yyyy-MM-dd HH:mm', new Date());
      const after = parse(e.afterFillingDate, 'yyyy-MM-dd HH:mm', new Date());
      return {
        timestamp: e.beforeFillingDate,
        type: 'event',
        event: {
          type: 'filling',
          amount: e.filling,
          duration: differenceInSeconds(after, before),
          speed: 0,
          distance: 0,
          beforeLevel: e.beforeFilling,
          afterLevel: e.afterFilling,
          timestamp: before.getTime(),
          location: e.fillingStation,
        },
        location: e.fillingStation,
      };
    });

    const theftEvents = fuelTheftDetails.filter(e =>
      e.vehicleId === selectedVehicle &&
      isWithinInterval(parse(e.beforeDrainDate, 'yyyy-MM-dd HH:mm', new Date()), { start, end })
    ).map(e => {
      const before = parse(e.beforeDrainDate, 'yyyy-MM-dd HH:mm', new Date());
      const after = parse(e.afterDrainDate, 'yyyy-MM-dd HH:mm', new Date());
      return {
        timestamp: e.beforeDrainDate,
        type: 'event',
        event: {
          type: 'drainage',
          amount: e.drainage,
          duration: differenceInSeconds(after, before),
          speed: 0,
          distance: 0,
          beforeLevel: e.beforeDrain,
          afterLevel: e.afterDrain,
          timestamp: before.getTime(),
          location: e.drainageLocation,
        },
        location: e.drainageLocation,
      };
    });

    const allPoints = [...pathPoints, ...fillingEvents, ...theftEvents]
      .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

    if (allPoints.length < 1) return [];

    let cumulativeDistance = 0;
    let currentFuel = tankCapacity * (0.8 + Math.random() * 0.2);
    const processedData: any[] = [];

    for (let i = 0; i < allPoints.length; i++) {
      const point = allPoints[i] as any;
      const timestamp = parseISO(point.timestamp);

      if (i > 0) {
        const prevPoint = allPoints[i - 1] as any;
        const prevTimestamp = parseISO(prevPoint.timestamp);
        const timeDeltaSeconds = differenceInSeconds(timestamp, prevTimestamp);
        const timeDeltaHours = timeDeltaSeconds / 3600;

        if (prevPoint.type === 'path' && prevPoint.speed > 0) {
          cumulativeDistance += prevPoint.speed * timeDeltaHours;
          const consumptionRate = 1.5 + (prevPoint.speed / 15);
          currentFuel -= consumptionRate * timeDeltaHours;
        }
      }

      if (point.type === 'event') {
        if (point.event.type === 'filling') {
          currentFuel = Math.min(tankCapacity, currentFuel + point.event.amount);
        } else if (point.event.type === 'drainage') {
          currentFuel -= point.event.amount;
        }
      }

      currentFuel = Math.max(0, currentFuel);

      processedData.push({
        time: format(timestamp, 'HH:mm'),
        timestamp: timestamp.getTime(),
        speed: point.speed || 0,
        distance: parseFloat(cumulativeDistance.toFixed(2)),
        fuel: parseFloat(currentFuel.toFixed(2)),
        location: point.location,
        event: point.type === 'event' ? point.event : null,
      });
    }

    return processedData;
  }, [selectedVehicle, dateRange]);

  const [brushIndex, setBrushIndex] = useState({ startIndex: 0, endIndex: 0 });

  useEffect(() => {
    setBrushIndex({ startIndex: 0, endIndex: chartData.length > 0 ? chartData.length - 1 : 0 });
  }, [chartData]);

  const handleBrushChange = (newIndex: { startIndex?: number; endIndex?: number }) => {
    if (newIndex.startIndex !== undefined && newIndex.endIndex !== undefined) {
      setBrushIndex({ startIndex: newIndex.startIndex, endIndex: newIndex.endIndex });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!chartData || chartData.length === 0) return;

    const { startIndex, endIndex } = brushIndex;
    if (startIndex === undefined || endIndex === undefined) return;

    const { deltaY, currentTarget, nativeEvent } = e;
    const chartRect = currentTarget.getBoundingClientRect();
    const offsetX = (nativeEvent as any).clientX - chartRect.left;

    const currentRange = endIndex - startIndex;
    if (currentRange <= 0) return;

    const mouseIndexRatio = offsetX / chartRect.width;
    const dataIndex = Math.floor(mouseIndexRatio * currentRange) + startIndex;

    const zoomAmount = Math.max(1, Math.floor(currentRange * 0.1));

    let newStartIndex = startIndex;
    let newEndIndex = endIndex;

    if (deltaY < 0) { // Zoom in
      if (currentRange <= 20) return; // Minimum zoom range
      const leftRatio = (dataIndex - newStartIndex) / currentRange;
      newStartIndex += Math.round(zoomAmount * leftRatio);
      newEndIndex -= Math.round(zoomAmount * (1 - leftRatio));
    } else { // Zoom out
      const leftRatio = (dataIndex - newStartIndex) / currentRange;
      newStartIndex -= Math.round(zoomAmount * leftRatio);
      newEndIndex += Math.round(zoomAmount * (1 - leftRatio));
    }

    newStartIndex = Math.max(0, newStartIndex);
    newEndIndex = Math.min(chartData.length - 1, newEndIndex);

    if (newStartIndex >= newEndIndex) {
      return;
    }

    setBrushIndex({ startIndex: newStartIndex, endIndex: newEndIndex });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Fuel Graphical Report</CardTitle>
            <CardDescription>An interactive view of fuel, speed, and distance.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} />
              </PopoverContent>
            </Popover>
            <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div onWheel={handleWheel} style={{ cursor: 'crosshair' }}>
            <ChartContainer config={chartConfig} className="h-[450px] w-full">
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis yAxisId="left" orientation="left" stroke="var(--color-fuel)" label={{ value: 'Fuel (L)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-speed)" label={{ value: 'Speed (km/h) / Distance (km)', angle: 90, position: 'insideRight' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<ChartLegendContent />} verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />

                  <Line
                    type="monotone"
                    dataKey="fuel"
                    yAxisId="left"
                    stroke="var(--color-fuel)"
                    strokeWidth={2}
                    name="Fuel"
                    dot={<CustomizedDot />}
                    activeDot={false}
                  />

                  <Line type="monotone" dataKey="speed" yAxisId="right" stroke="var(--color-speed)" strokeWidth={2} dot={false} name="Speed" />
                  <Line type="monotone" dataKey="distance" yAxisId="right" stroke="var(--color-distance)" strokeWidth={2} dot={false} name="Distance" />

                  <Brush
                    dataKey="time"
                    height={30}
                    stroke="hsl(var(--primary))"
                    y={380}
                    startIndex={brushIndex.startIndex}
                    endIndex={brushIndex.endIndex}
                    onChange={handleBrushChange}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      <FuelDeclarationDialog open={isDeclarationOpen} onOpenChange={setIsDeclarationOpen} />
    </>
  );
};

export default FuelGraphicalReport;