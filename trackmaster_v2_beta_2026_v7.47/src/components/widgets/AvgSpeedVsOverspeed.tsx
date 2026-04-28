import { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { vehicles } from '@/data/mockData';
import { VehicleCombobox } from '../VehicleCombobox';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Local mock data to ensure the chart renders correctly without crashing
const speedAnalysisData = [
  { vehicleId: 'VIO-001', day: 'Mon', avgSpeed: 22, overspeedIncidents: 2 },
  { vehicleId: 'VIO-001', day: 'Tue', avgSpeed: 35, overspeedIncidents: 1 },
  { vehicleId: 'VIO-001', day: 'Wed', avgSpeed: 15, overspeedIncidents: 0 },
  { vehicleId: 'VIO-001', day: 'Thu', avgSpeed: 42, overspeedIncidents: 3 },
  { vehicleId: 'VIO-001', day: 'Fri', avgSpeed: 50, overspeedIncidents: 4 },
  { vehicleId: 'VIO-001', day: 'Sat', avgSpeed: 62, overspeedIncidents: 5 },
  { vehicleId: 'VIO-001', day: 'Sun', avgSpeed: 30, overspeedIncidents: 1 },
  
  { vehicleId: 'V-002', day: 'Mon', avgSpeed: 20, overspeedIncidents: 1 },
  { vehicleId: 'V-002', day: 'Tue', avgSpeed: 30, overspeedIncidents: 2 },
  { vehicleId: 'V-002', day: 'Wed', avgSpeed: 18, overspeedIncidents: 0 },
  { vehicleId: 'V-002', day: 'Thu', avgSpeed: 45, overspeedIncidents: 2 },
  { vehicleId: 'V-002', day: 'Fri', avgSpeed: 55, overspeedIncidents: 3 },
  { vehicleId: 'V-002', day: 'Sat', avgSpeed: 60, overspeedIncidents: 4 },
  { vehicleId: 'V-002', day: 'Sun', avgSpeed: 25, overspeedIncidents: 0 },

  // Generic data for 'all' view aggregation (simulating other vehicles)
  { vehicleId: 'other', day: 'Mon', avgSpeed: 25, overspeedIncidents: 8 },
  { vehicleId: 'other', day: 'Tue', avgSpeed: 32, overspeedIncidents: 9 },
  { vehicleId: 'other', day: 'Wed', avgSpeed: 12, overspeedIncidents: 14 },
  { vehicleId: 'other', day: 'Thu', avgSpeed: 38, overspeedIncidents: 7 },
  { vehicleId: 'other', day: 'Fri', avgSpeed: 45, overspeedIncidents: 8 },
  { vehicleId: 'other', day: 'Sat', avgSpeed: 65, overspeedIncidents: 7 },
  { vehicleId: 'other', day: 'Sun', avgSpeed: 32, overspeedIncidents: 13 },
];

const chartConfig = {
  avgSpeed: {
    label: 'Avg. Speed (km/h)',
    color: '#F97316', // Brand Orange
  },
  overspeedIncidents: {
    label: 'Overspeed Incidents',
    color: '#3B82F6', // Brand Blue
  },
} satisfies ChartConfig;

const AvgSpeedVsOverspeed = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('all');

  const chartData = useMemo(() => {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    let filteredData = speedAnalysisData;
    if (selectedVehicle !== 'all') {
      filteredData = speedAnalysisData.filter(d => d.vehicleId === selectedVehicle);
    }

    const aggregated = filteredData.reduce((acc: { [key: string]: any }, curr) => {
      if (!acc[curr.day]) {
        acc[curr.day] = { day: curr.day, avgSpeed: 0, overspeedIncidents: 0, count: 0 };
      }
      acc[curr.day].avgSpeed += curr.avgSpeed;
      acc[curr.day].overspeedIncidents += curr.overspeedIncidents;
      acc[curr.day].count += 1;
      return acc;
    }, {});

    return daysOrder.map(day => {
      const item = aggregated[day];
      if (!item) return { day, avgSpeed: 0, overspeedIncidents: 0 };
      return {
        day,
        avgSpeed: Math.round(item.avgSpeed / item.count),
        overspeedIncidents: item.overspeedIncidents,
      };
    });
  }, [selectedVehicle]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Avg. Speed vs. Overspeed</CardTitle>
          <TooltipProvider>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                  <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Daily average speed compared to overspeed incidents.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <VehicleCombobox
          vehicles={vehicles}
          value={selectedVehicle}
          onChange={setSelectedVehicle}
          className="h-8 text-xs w-[150px]"
        />
      </CardHeader>
      <CardContent className="px-2 flex-1 min-h-[250px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                fontSize={12} 
                tick={{ fill: '#6B7280' }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
                domain={[0, 80]}
                ticks={[0, 20, 40, 60, 80]}
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ value: 'Speed(km)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ value: 'No. of Incident', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<ChartTooltipContent indicator="dot" />} />
              <Legend content={<ChartLegendContent />} verticalAlign="bottom" height={36} />
              <Bar 
                dataKey="avgSpeed" 
                yAxisId="left" 
                fill="var(--color-avgSpeed)" 
                radius={[4, 4, 0, 0]} 
                barSize={24} 
              />
              <Line 
                dataKey="overspeedIncidents" 
                yAxisId="right" 
                stroke="var(--color-overspeedIncidents)" 
                type="monotone" 
                strokeWidth={2} 
                dot={{ r: 4, fill: 'var(--color-overspeedIncidents)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default AvgSpeedVsOverspeed;