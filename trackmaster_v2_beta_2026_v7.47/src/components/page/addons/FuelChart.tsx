import React, { useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FuelEventTooltipContent from '@/components/page/addons/FuelEventTooltipContent';
import { Fuel, Gauge, Milestone, MapPin } from 'lucide-react';
import { ChartLegendContent } from '@/components/ui/chart';

const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(248, 83%, 53%)' },
  speed: { label: 'Speed (km/h)', color: 'hsl(142.1, 76.2%, 45.1%)' },
  distance: { label: 'Distance (km)', color: 'hsl(34.9, 82.6%, 52.2%)' },
};

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
              <Fuel className="h-4 w-4" style={{ color: chartConfig.fuel.color }} />
              <span>Fuel Level</span>
            </div>
            <span className="font-semibold text-sm">{data.fuel} L</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" style={{ color: chartConfig.speed.color }} />
              <span>Speed</span>
            </div>
            <span className="font-semibold text-sm">{data.speed} km/h</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Milestone className="h-4 w-4" style={{ color: chartConfig.distance.color }} />
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

interface FuelChartProps {
    chartData: any[];
    brushIndex: { startIndex: number; endIndex: number };
    handleBrushChange: (newIndex: { startIndex?: number; endIndex?: number }) => void;
    handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
}

const FuelChart = ({ chartData, brushIndex, handleBrushChange, handleWheel }: FuelChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const chartElement = chartRef.current;
        if (!chartElement) return;

        const wheelListener = (e: WheelEvent) => {
            e.preventDefault();
        };

        chartElement.addEventListener('wheel', wheelListener, { passive: false });

        return () => {
            if (chartElement) {
                chartElement.removeEventListener('wheel', wheelListener);
            }
        };
    }, []);

    return (
        <div ref={chartRef} onWheel={handleWheel} style={{ cursor: 'crosshair' }} className="h-full w-full">
            <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3"
                  stroke="rgba(0,0,0,100)" 
                  strokeOpacity={1} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis yAxisId="left" orientation="left" stroke="var(--color-fuel)" label={{ value: 'Fuel (L)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-speed)" label={{ value: 'Speed / Distance', angle: 90, position: 'insideRight' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<ChartLegendContent />} verticalAlign="bottom" wrapperStyle={{ paddingTop: '0px' }} />
                  
                  <Line type="monotone" dataKey="fuel" yAxisId="left" stroke="var(--color-fuel)" strokeWidth={1.2} name="Fuel" dot={<CustomizedDot />} activeDot={false} />
                  <Line type="monotone" dataKey="speed" yAxisId="right" stroke="var(--color-speed)" strokeWidth={1.2} dot={false} name="Speed" />
                  <Line type="monotone" dataKey="distance" yAxisId="right" stroke="var(--color-distance)" strokeWidth={1.2} dot={false} name="Distance" />

                  <Brush 
                    dataKey="time"
                    height={20}
                    stroke="hsl(var(--primary))"
                    startIndex={brushIndex.startIndex}
                    endIndex={brushIndex.endIndex}
                    onChange={handleBrushChange}
                  />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}

export default FuelChart;