import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

const chartConfig = {
  fuel: { label: 'Fuel (L)', color: 'hsl(134, 61%, 41%)' }, // Leaf/plant green color
  speed: { label: 'Speed (km/h)', color: '#3b82f6' }, // Blue
  distance: { label: 'Distance (km)', color: '#f59e0b' }, // Amber
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const fullDate = new Date(data.timestamp);
    const formattedDateTime = format(fullDate, "MMM dd, yyyy HH:mm:ss");

    return (
      <div className="min-w-[250px] rounded-lg border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-lg">
        <p className="font-bold text-foreground mb-2">{formattedDateTime}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Fuel className="h-4 w-4" style={{ color: chartConfig.fuel.color }} />
              <span>Fuel Level</span>
            </div>
            <span className="font-semibold text-sm text-foreground">{data.fuel} L</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" style={{ color: chartConfig.speed.color }} />
              <span>Speed</span>
            </div>
            <span className="font-semibold text-sm text-foreground">{data.speed} km/h</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Milestone className="h-4 w-4" style={{ color: chartConfig.distance.color }} />
              <span>Distance</span>
            </div>
            <span className="font-semibold text-sm text-foreground">{data.distance} km</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Location</span>
            </div>
            <span className="font-semibold text-sm text-foreground truncate max-w-[120px]">{data.location || 'N/A'}</span>
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

  const [visibleLines, setVisibleLines] = useState({
    fuel: true,
    speed: true,
    distance: true,
  });

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const maxRightValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 'auto';
    const maxSpeed = Math.max(...chartData.map(d => d.speed || 0));
    const maxDistance = Math.max(...chartData.map(d => d.distance || 0));
    return Math.ceil(Math.max(maxSpeed, maxDistance) * 1.1);
  }, [chartData]);

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
        <ComposedChart data={chartData} margin={{ top: 10, right: 45, left: 45, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />

          {/* CHANGED: Reduced tickMargin from 10 to 5 */}
          <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={5} />

          <YAxis yAxisId="left" orientation="left" stroke="var(--color-fuel)" label={{ value: 'Fuel (L)', angle: -90, position: 'insideLeft', offset: 25, style: { fontSize: '12px' } }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-speed)"
            domain={[0, maxRightValue]}
            label={{ value: 'Speed / Distance', angle: 90, position: 'insideRight', offset: 25, style: { fontSize: '12px' } }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* CHANGED: Reduced gap, padding, and text size for the Legend */}
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '5px', lineHeight: '1' }}
            content={() => (
              <div className="flex flex-wrap items-center justify-center gap-5 pt-1 pb-0">
                {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => {
                  const config = chartConfig[key];
                  const isActive = visibleLines[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleLine(key)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs transition-all duration-200 cursor-pointer outline-none select-none",
                        isActive ? "text-foreground" : "text-muted-foreground opacity-60"
                      )}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm transition-colors duration-200"
                        style={{ backgroundColor: isActive ? config.color : 'currentColor' }}
                      />
                      <span className={cn(!isActive && "line-through")}>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />

          <Line hide={!visibleLines.fuel} type="monotone" dataKey="fuel" yAxisId="left" stroke="var(--color-fuel)" strokeWidth={1.2} name="Fuel" dot={<CustomizedDot />} activeDot={false} />
          <Line hide={!visibleLines.speed} type="monotone" dataKey="speed" yAxisId="right" stroke="var(--color-speed)" strokeWidth={1.2} dot={false} name="Speed" />
          <Line hide={!visibleLines.distance} type="monotone" dataKey="distance" yAxisId="right" stroke="var(--color-distance)" strokeWidth={1.2} dot={false} name="Distance" />

          {/* CHANGED: Reduced Brush height from 20 to 15 */}
          <Brush
            dataKey="time"
            height={15}
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