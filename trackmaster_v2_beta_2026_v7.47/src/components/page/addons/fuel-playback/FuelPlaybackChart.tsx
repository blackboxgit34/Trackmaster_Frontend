import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegendContent } from '@/components/ui/chart';
import { format } from 'date-fns';

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
            <span className="font-semibold">{data.fuel} L</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Speed:</span>
            <span className="font-semibold">{data.speed} km/h</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Distance:</span>
            <span className="font-semibold">{data.distance} km</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface FuelPlaybackChartProps {
  chartData: any[];
  currentTime: number;
}

const FuelPlaybackChart = ({ chartData, currentTime }: FuelPlaybackChartProps) => {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
          <Legend content={<ChartLegendContent />} verticalAlign="top" />
          <Line
            type="monotone"
            dataKey="fuel"
            yAxisId="left"
            stroke="var(--color-fuel)"
            strokeWidth={1.5}
            name="Fuel"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="speed"
            yAxisId="right"
            stroke="var(--color-speed)"
            strokeWidth={1.5}
            dot={false}
            name="Speed"
          />
          <Line
            type="monotone"
            dataKey="distance"
            yAxisId="right"
            stroke="var(--color-distance)"
            strokeWidth={1.5}
            dot={false}
            name="Distance"
          />
          <ReferenceLine x={currentTime} stroke="hsl(var(--destructive))" strokeWidth={1.5} yAxisId="left" ifOverflow="visible" label={{ value: 'Now', position: 'insideTop', fill: 'hsl(var(--destructive))' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default FuelPlaybackChart;