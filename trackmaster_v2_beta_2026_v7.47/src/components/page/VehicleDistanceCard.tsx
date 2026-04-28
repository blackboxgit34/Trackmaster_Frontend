import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label, days }: any) => {
  if (active && payload && payload.length) {
    const dayData = payload[0].payload;
    const dayIndex = parseInt(label, 10) - 1;
    if (dayIndex < 0 || dayIndex >= days.length) return null;
    const date = days[dayIndex];
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <p className="font-semibold text-sm mb-1">{format(date, 'MMM d, yyyy')}</p>
        <p className="text-xs text-muted-foreground">Distance: <span className="font-bold text-foreground">{dayData.distance.toFixed(1)} km</span></p>
        <p className="text-xs text-muted-foreground">Stoppage: <span className="font-bold text-foreground">{dayData.stoppage.toFixed(1)} hrs</span></p>
      </div>
    );
  }
  return null;
};

const VehicleDistanceCard = ({ vehicleData, days }: { vehicleData: any, days: Date[] }) => {
  const chartData = useMemo(() => {
    return days.map(day => {
      const dayOfMonth = format(day, 'd');
      return {
        day: dayOfMonth,
        ...(vehicleData.dailyData[dayOfMonth] || { distance: 0, stoppage: 0 }),
      };
    });
  }, [vehicleData, days]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vehicleData.vehicleName}</CardTitle>
        <CardDescription>{vehicleData.vehicleId}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Distance</p>
            <p className="text-3xl font-bold">{vehicleData.totalDistance.toFixed(0)} <span className="text-lg font-medium text-muted-foreground">km</span></p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Stoppage</p>
            <p className="text-3xl font-bold">{vehicleData.totalStoppage.toFixed(1)} <span className="text-lg font-medium text-muted-foreground">hrs</span></p>
          </div>
        </div>
        <div className="md:col-span-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip days={days} />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="distance" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleDistanceCard;