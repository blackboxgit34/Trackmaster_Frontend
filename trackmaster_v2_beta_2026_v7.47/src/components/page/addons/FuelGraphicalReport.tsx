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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Search,
  Menu,
  X,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { vehicles, actualVehicles, fuelFillingDetails, fuelTheftDetails, currentFuelLevelData } from '@/data/mockData';
import { routeData } from '@/data/routeData';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import FuelDeclarationDialog from './FuelDeclarationDialog';
import FuelChart from '@/components/page/addons/FuelChart';
import FuelSummaryCards from '@/components/page/addons/FuelSummaryCards';

/* ----------------------------
  Chart config + time ranges
   --------------------------- */
const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(134, 61%, 41%)' }, // Leaf/plant green color
  speed: { label: 'Speed (km/h)', color: '#3b82f6' }, // Blue
  distance: { label: 'Distance (km)', color: '#f59e0b' }, // Amber
} satisfies ChartConfig;

/* ----------------------------
  FuelGraphicalReport (complete)
   --------------------------- */
const FuelGraphicalReport = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(actualVehicles[0]?.id ?? '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [isDeclarationOpen, setIsDeclarationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredVehicles = useMemo(() => {
    return actualVehicles.filter(
      (v) =>
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  useEffect(() => {
    const HIDE_KEY = 'hideFuelDeclarationUntil';
    const hideUntil = localStorage.getItem(HIDE_KEY);
    if (!hideUntil || Date.now() > Number(hideUntil)) {
      setIsDeclarationOpen(true);
    }
  }, []);

  const { chartData, vehicleInfo, fillingEvents, theftEvents } = useMemo(() => {
    if (!selectedVehicle || !dateRange?.from) return { chartData: [], vehicleInfo: null, fillingEvents: [] as any[], theftEvents: [] as any[] };

    const vehicleInfo = actualVehicles.find(v => v.id === selectedVehicle);
    if (!vehicleInfo) return { chartData: [], vehicleInfo: null, fillingEvents: [] as any[], theftEvents: [] as any[] };
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

    if (allPoints.length < 1) return { chartData: [], vehicleInfo, fillingEvents, theftEvents };

    let cumulativeDistance = 0;
    let currentFuel = tankCapacity * (0.8 + Math.random() * 0.2);
    const processedData: any[] = [];

    const isMultiDay = differenceInSeconds(end, start) > 86400;
    const timeFormat = isMultiDay ? 'MMM dd, HH:mm' : 'HH:mm';

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
        time: format(timestamp, timeFormat),
        timestamp: timestamp.getTime(),
        speed: point.speed || 0,
        distance: parseFloat(cumulativeDistance.toFixed(2)),
        fuel: parseFloat(currentFuel.toFixed(2)),
        location: point.location,
        event: point.type === 'event' ? point.event : null,
      });
    }

    return { chartData: processedData, vehicleInfo, fillingEvents, theftEvents };
  }, [selectedVehicle, dateRange]);

  const tankCapacity = vehicleInfo?.fuelTankCapacity || 0;
  const currentFuel = chartData.length > 0 ? chartData[chartData.length - 1].fuel : 0;
  const emptySpace = Math.max(0, tankCapacity - currentFuel);
  const refillsCount = fillingEvents.length;
  const totalFilling = fillingEvents.reduce((sum: number, e: any) => sum + e.event.amount, 0);
  const drainageCount = theftEvents.length;
  const totalDrainage = theftEvents.reduce((sum: number, e: any) => sum + e.event.amount, 0);

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

    if (deltaY < 0) {
      if (currentRange <= 20) return;
      const leftRatio = (dataIndex - newStartIndex) / currentRange;
      newStartIndex += Math.round(zoomAmount * leftRatio);
      newEndIndex -= Math.round(zoomAmount * (1 - leftRatio));
    } else {
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
    <div className="flex h-full w-full overflow-hidden relative bg-background text-foreground">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "absolute inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out",
        "w-[260px] xl:w-[300px] bg-card text-card-foreground border-r border-border flex flex-col shrink-0 h-full overflow-hidden shadow-xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-muted/50 border-input"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No vehicles found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const fuelData = currentFuelLevelData.find((d) => d.vehicleId === vehicle.id);
              const fuelInTank = fuelData ? fuelData.fuelLiters : 0;
              const percentage = (fuelInTank / vehicle.fuelTankCapacity) * 100;

              let progressColor = 'bg-green-600';
              if (percentage < 20) progressColor = 'bg-destructive';
              else if (percentage < 40) progressColor = 'bg-amber-500';

              const imageFileName = vehicle.type.toLowerCase().replace(/ /g, '-') + '.png';

              return (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={cn(
                    "px-3 py-2.5 border-b border-border cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground flex gap-2.5 items-center",
                    selectedVehicle === vehicle.id ? "bg-brand-orange/10 border-l-4 border-l-brand-orange" : "border-l-4 border-l-transparent"
                  )}
                >
                  <img src={`/vehicle-images/${imageFileName}`} alt={vehicle.type} className="w-14 h-10 shrink-0 object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = '/vehicle-images/car.png';
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate text-foreground">{vehicle.id}</div>
                    <div className="text-[11px] text-muted-foreground truncate mb-1">
                      {vehicle.model} | {vehicle.type}
                    </div>

                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
                      <div className={cn("h-full rounded-full transition-all", progressColor)} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background text-foreground flex flex-col min-w-0 overflow-hidden">
        {/* Header - Compact, responsive */}
        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between shrink-0 gap-4 bg-card">
          <div className="flex items-center min-w-0">
            <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 lg:hidden shrink-0 -ml-2" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground truncate">Fuel Graphical Report</h2>
              <p className="text-xs text-muted-foreground truncate">Interactive fuel, speed & distance analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Chart Area - Responsive flex */}
        <div className="flex-[2] p-5 min-h-[320px]">
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <FuelChart
                chartData={chartData}
                brushIndex={brushIndex}
                handleBrushChange={handleBrushChange}
                handleWheel={handleWheel}
              />
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Fuel className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">No fuel data available</p>
              <p className="text-xs mt-1 opacity-70">Try selecting a different date range or vehicle</p>
            </div>
          )}
        </div>

        {/* Summary Cards - Always visible at bottom */}
        <div className="flex-none max-h-[35vh] px-5 py-4 border-t border-border bg-muted/20 overflow-y-auto">
          <FuelSummaryCards
            tankCapacity={tankCapacity}
            currentFuel={currentFuel}
            emptySpace={emptySpace}
            refillsCount={refillsCount}
            totalFilling={totalFilling}
            drainageCount={drainageCount}
            totalDrainage={totalDrainage}
          />
        </div>
      </div>
      <FuelDeclarationDialog open={isDeclarationOpen} onOpenChange={setIsDeclarationOpen} />
    </div>
  );
};

export default FuelGraphicalReport;