import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { ChartConfig, ChartContainer, ChartLegendContent } from '@/components/ui/chart';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FuelEventTooltipContent from './FuelEventTooltipContent';

const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(var(--primary))' },
  speed: { label: 'Speed (km/h)', color: 'hsl(142.1, 76.2%, 45.1%)' },
  distance: { label: 'Distance (km)', color: 'hsl(34.9, 82.6%, 52.2%)' },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <p className="font-bold text-foreground mb-1">{format(new Date(data.timestamp), "HH:mm:ss")}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Fuel:</span>
            <span className="font-semibold">{data.fuel.toFixed(1)} L</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Speed:</span>
            <span className="font-semibold">{data.speed.toFixed(1)} km/h</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Distance:</span>
            <span className="font-semibold">{data.distance.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

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

interface FuelFillingGraphDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphData: any[];
  vehicleName: string;
  date: string;
}

const FuelFillingGraphDialog = ({ open, onOpenChange, graphData, vehicleName, date }: FuelFillingGraphDialogProps) => {
  const [brushIndex, setBrushIndex] = useState({ startIndex: 0, endIndex: 0 });

  useEffect(() => {
    setBrushIndex({ startIndex: 0, endIndex: graphData.length > 0 ? graphData.length - 1 : 0 });
  }, [graphData]);

  const handleBrushChange = (newIndex: { startIndex?: number; endIndex?: number }) => {
    if (newIndex.startIndex !== undefined && newIndex.endIndex !== undefined) {
      setBrushIndex({ startIndex: newIndex.startIndex, endIndex: newIndex.endIndex });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!graphData || graphData.length === 0) return;

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
    newEndIndex = Math.min(graphData.length - 1, newEndIndex);

    if (newStartIndex >= newEndIndex) {
      return;
    }

    setBrushIndex({ startIndex: newStartIndex, endIndex: newEndIndex });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[70vh]">
        <DialogHeader>
          <DialogTitle>Fuel Filling Graph: {vehicleName}</DialogTitle>
          <DialogDescription>
            Fuel level graph for {format(new Date(date), 'dd-MM-yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[calc(70vh-120px)] w-full pt-4" onWheel={handleWheel} style={{ cursor: 'crosshair' }}>
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <ComposedChart data={graphData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis yAxisId="left" orientation="left" stroke="var(--color-fuel)" label={{ value: 'Fuel (L)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-speed)" label={{ value: 'Speed / Distance', angle: 90, position: 'insideRight' }} />
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
                  dataKey="timestamp"
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
                  height={30}
                  stroke="hsl(var(--primary))"
                  startIndex={brushIndex.startIndex}
                  endIndex={brushIndex.endIndex}
                  onChange={handleBrushChange}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FuelFillingGraphDialog;