import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { actualVehicles, fuelFillingDetails, fuelTheftDetails } from '@/data/mockData';
import { routeData } from '@/data/routeData';
import FuelDeclarationDialog from '@/components/page/addons/FuelDeclarationDialog';
import FuelReportHeader from '@/components/page/addons/FuelReportHeader';
import FuelChart from '@/components/page/addons/FuelChart';
import FuelSummaryCards from '@/components/page/addons/FuelSummaryCards';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';

const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(248, 83%, 53%)' },
  speed: { label: 'Speed (km/h)', color: 'hsl(142.1, 76.2%, 45.1%)' },
  distance: { label: 'Distance (km)', color: 'hsl(34.9, 82.6%, 52.2%)' },
} satisfies ChartConfig;

const FuelGraphicalReport = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(actualVehicles[0]?.id ?? '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeclarationOpen, setIsDeclarationOpen] = useState(false);
  const { toast } = useToast();

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

  const { chartData, vehicleInfo, fillingEvents, theftEvents } = useMemo(() => {
    if (!selectedVehicle || !dateRange?.from) return { chartData: [], vehicleInfo: null, fillingEvents: [], theftEvents: [] };

    const vehicleInfo = actualVehicles.find(v => v.id === selectedVehicle);
    if (!vehicleInfo) return { chartData: [], vehicleInfo: null, fillingEvents: [], theftEvents: [] };
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

    return { chartData: processedData, vehicleInfo, fillingEvents, theftEvents };
  }, [selectedVehicle, dateRange]);

  const tankCapacity = vehicleInfo?.fuelTankCapacity || 0;
  const currentFuel = chartData.length > 0 ? chartData[chartData.length - 1].fuel : 0;
  const emptySpace = Math.max(0, tankCapacity - currentFuel);

  const refillsCount = fillingEvents.length;
  const totalFilling = fillingEvents.reduce((sum, e) => sum + e.event.amount, 0);
  const drainageCount = theftEvents.length;
  const totalDrainage = theftEvents.reduce((sum, e) => sum + e.event.amount, 0);

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
    // The preventDefault is now handled in the FuelChart component
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
      <div className="space-y-6">
        <Card>
          <FuelReportHeader
            selectedVehicle={selectedVehicle}
            onVehicleChange={setSelectedVehicle}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isCalendarOpen={isCalendarOpen}
            onCalendarOpenChange={setIsCalendarOpen}
            handleTimeRangeClick={handleTimeRangeClick}
          />
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <FuelChart
                chartData={chartData}
                brushIndex={brushIndex}
                handleBrushChange={handleBrushChange}
                handleWheel={handleWheel}
              />
            </ChartContainer>
          </CardContent>
        </Card>
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
      <FuelDeclarationDialog open={isDeclarationOpen} onOpenChange={setIsDeclarationOpen} />
    </>
  );
};

export default FuelGraphicalReport;