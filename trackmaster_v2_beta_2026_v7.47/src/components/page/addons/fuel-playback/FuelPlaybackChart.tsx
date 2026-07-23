import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegendContent } from '@/components/ui/chart';
import { format } from 'date-fns';
import { Fuel, Gauge, Milestone, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FuelEventTooltipContent from '@/components/page/addons/FuelEventTooltipContent';

// Premium Color Palette
const chartConfig = {
  fuel: { label: 'Fuel (L)', color: '#10b981' }, // Emerald
  speed: { label: 'Speed (km/h)', color: '#3b82f6' }, // Blue
  distance: { label: 'Distance (km)', color: '#f59e0b' }, // Amber
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="relative">
        <div className="absolute top-6 -left-1.5 w-3 h-3 bg-background border-l border-t border-border/50 -rotate-45 z-10 hidden sm:block"></div>
        <div className="relative z-20 rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3.5 shadow-xl min-w-[260px]">
          <p className="font-bold text-foreground mb-3 pb-2 border-b border-border/50 text-sm">
            {format(new Date(data.timestamp), "MMM dd, yyyy HH:mm:ss")}
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Fuel className="h-4 w-4" style={{ color: chartConfig.fuel.color }} />
                <span>Fuel Level</span>
              </div>
              <span className="font-semibold text-foreground">{data.fuel.toFixed(1)} L</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="h-4 w-4" style={{ color: chartConfig.speed.color }} />
                <span>Speed</span>
              </div>
              <span className="font-semibold text-foreground">{data.speed.toFixed(0)} km/h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Milestone className="h-4 w-4" style={{ color: chartConfig.distance.color }} />
                <span>Distance</span>
              </div>
              <span className="font-semibold text-foreground">{data.distance.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-purple-500" />
                <span>Location</span>
              </div>
              <span className="font-semibold text-foreground truncate max-w-[120px]" title={data.location}>
                {data.location || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Polished Event Markers with Interactive Scale
const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  const [isOpen, setIsOpen] = React.useState(false);

  if (!payload?.event) return null;

  const color = payload.event.type === 'filling' ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <g 
          transform={`translate(${cx}, ${cy - 3})`} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = `translate(${cx}, ${cy - 3}) scale(1.3)`}
          onMouseLeave={(e) => e.currentTarget.style.transform = `translate(${cx}, ${cy - 3}) scale(1)`}
        >
          <circle r="6" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            {!isOpen && (
              <>
                <animate attributeName="r" from="6" to="14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </>
            )}
          </circle>
          <circle r="4.5" fill={color} stroke="#fff" strokeWidth={1.5} />
        </g>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" side="top" align="center">
        <FuelEventTooltipContent event={payload.event} />
      </PopoverContent>
    </Popover>
  );
};

interface FuelPlaybackChartProps {
  chartData: any[];
  currentTime: number;
}

const FuelPlaybackChart = ({ chartData, currentTime }: FuelPlaybackChartProps) => {

  // O(log n) Binary Search Interpolator with Velocity tracking
  const { fuel: currentInterpolatedFuel, velocity } = useMemo(() => {
    if (!chartData?.length) return { fuel: 0, velocity: 0 };

    let left = 0;
    let right = chartData.length - 1;

    // Binary search to find the correct time segment
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (chartData[mid].timestamp < currentTime) left = mid + 1;
      else right = mid - 1;
    }

    const i = Math.max(0, left - 1);
    const p1 = chartData[i];
    const p2 = chartData[i + 1];

    if (!p2) return { fuel: p1.fuel, velocity: 0 };

    const timeDiff = p2.timestamp - p1.timestamp || 1;
    const ratio = (currentTime - p1.timestamp) / timeDiff;
    const fuel = p1.fuel + (p2.fuel - p1.fuel) * ratio;

    // Velocity = absolute change in fuel in this segment.
    const segmentVelocity = Math.abs(p2.fuel - p1.fuel);

    return { fuel, velocity: segmentVelocity };
  }, [chartData, currentTime]);

  // Dynamic glow intensity: much lighter base and velocity multiplier
  const intensity = Math.min(1, velocity / 5);
  const glowRadius = 3 + intensity * 5;

  return (
    <div className="relative h-full w-full">
      {/* Subtle Top Fade overlay to embed the chart smoothly */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            {/* Deep 3-Stop Premium Gradient */}
            <defs>
              <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-fuel)" stopOpacity={0.55}/>
                <stop offset="40%" stopColor="var(--color-fuel)" stopOpacity={0.25}/>
                <stop offset="75%" stopColor="var(--color-fuel)" stopOpacity={0.08}/>
                <stop offset="100%" stopColor="var(--color-fuel)" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Muted, clean grid */}
            <CartesianGrid 
              strokeDasharray="2 4" 
              vertical={false} 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.4} 
            />
            
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            
            {/* Faint cursor so it doesn't fight the glowing playhead */}
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} 
            />
            
            {/* Polished Legend */}
            <Legend 
              content={<ChartLegendContent />} 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', opacity: 0.8, zIndex: 20, position: 'relative' }}
            />

            {/* Primary Metric: Fuel (Dominant Area) */}
            <Area
              type="monotone"
              dataKey="fuel"
              yAxisId="left"
              fill="url(#fuelGradient)"
              stroke="var(--color-fuel)"
              strokeWidth={2.5}
              name="Fuel"
              activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-fuel)" }}
              isAnimationActive={true}
              animationDuration={800}
            />
            
            {/* Secondary Metrics: Speed/Distance (Muted & Thin) */}
            <Line
              type="monotone"
              dataKey="speed"
              yAxisId="right"
              stroke="var(--color-speed)"
              strokeWidth={1}
              strokeOpacity={0.35}
              dot={false}
              name="Speed"
              activeDot={{ r: 5, strokeWidth: 0, fill: "var(--color-speed)" }}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="distance"
              yAxisId="right"
              stroke="var(--color-distance)"
              strokeWidth={1}
              strokeOpacity={0.35}
              dot={false}
              name="Distance"
              activeDot={{ r: 5, strokeWidth: 0, fill: "var(--color-distance)" }}
              isAnimationActive={true}
            />

            {/* Event Markers (Refills / Theft) - Rendered over lines */}
            <Line
              type="monotone"
              dataKey="fuel"
              yAxisId="left"
              stroke="none"
              dot={<CustomizedDot />}
              isAnimationActive={false}
            />

            {/* Playhead Components */}
          
            <ReferenceLine 
              x={currentTime} 
              stroke="#ef4444" 
              strokeWidth={2} 
              yAxisId="left" 
              ifOverflow="extendDomain" 
              label={({ viewBox }: any) => {
                const { x } = viewBox;
                const isRightSide = x > (viewBox.width * 0.85);
                const xPos = isRightSide ? x - 72 : x + 8;

                return (
              <foreignObject x={xPos} y={15} width={90} height={40}>
                <div className="relative flex items-center justify-center pointer-events-none">

                  {/* soft outer glow */}
                  <span className="
                    absolute w-8 h-8 rounded-md
                    bg-purple-500/20 dark:bg-purple-500/15
                    blur-md
                  " />

                  {/* stronger core glow */}
                  <span className="
                    absolute w-6 h-6 rounded-md
                    bg-purple-500/30 dark:bg-purple-500/25
                    blur-sm
                  " />

                  {/* main label */}
                  <div className="
                    relative px-2.5 py-1 text-xs font-semibold rounded-md
                    bg-background/80 border border-border/60
                    text-foreground
                    flex items-center gap-1
                    dark:text-purple-200
                    dark:border-purple-500/40
                    dark:shadow-[0_0_10px_rgba(168,85,247,0.35)]
                  ">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {currentInterpolatedFuel.toFixed(1)}L
                  </div>

                </div>
              </foreignObject>
                );
              }}
            />
            
            {/* Velocity-Aware Glowing Dot */}
            <ReferenceDot
              x={currentTime}
              y={currentInterpolatedFuel}
              yAxisId="left"
              r={4}
              fill="#a855f7" // Purple
              stroke="#fff"
              strokeWidth={2}
              style={{ 
                filter: `drop-shadow(0 0 ${glowRadius}px rgba(168,85,247,0.5))`,
                transition: 'filter 0.2s ease-out'
              }}
              ifOverflow="extendDomain"
            />

          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default FuelPlaybackChart;