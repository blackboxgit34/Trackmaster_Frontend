import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const data = [
  { name: 'Working', value: 40, color: '#3b82f6' }, // Blue
  { name: 'Not Working', value: 4, color: '#f97316' }, // Orange
  { name: 'Not Installed', value: 5, color: '#9ca3af' }, // Gray
  { name: 'Removed', value: 1, color: '#ef4444' }, // Red
];

const GpsDeviceStatus = () => {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const totalDevices = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), []);

  const activeEntry = useMemo(
    () => (activeStatus ? data.find((d) => d.name === activeStatus) : null),
    [activeStatus]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">GPS Device Status</CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                  <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Connected vs. Not Connected devices.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">Connected vs. Not Connected devices</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center p-4 pt-2">
        <div className="w-full grid grid-cols-2 gap-4 items-center">
          <div className="relative w-full h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={0}
                  stroke="none"
                  onMouseEnter={(data) => setActiveStatus(data.name)}
                  onMouseLeave={() => setActiveStatus(null)}
                >
                  {data.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      fillOpacity={activeStatus ? (entry.name === activeStatus ? 1 : 0.3) : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeEntry ? (
                <>
                  <span className="text-3xl font-bold tracking-tighter">{activeEntry.value.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground px-2">{activeEntry.name}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold tracking-tighter">{totalDevices}</span>
                  <span className="text-sm text-muted-foreground">Total Devices</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {data.map((entry) => {
              const percentage = totalDevices > 0 ? ((entry.value / totalDevices) * 100).toFixed(0) : 0;
              return (
                <div
                  key={entry.name}
                  className="flex items-center justify-between text-sm cursor-pointer transition-opacity duration-200"
                  onMouseEnter={() => setActiveStatus(entry.name)}
                  onMouseLeave={() => setActiveStatus(null)}
                  style={{ opacity: activeStatus ? (entry.name === activeStatus ? 1 : 0.5) : 1 }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                  </div>
                  <div className="font-semibold text-foreground text-right flex items-baseline gap-2">
                    <span>{entry.value}</span>
                    <span className="text-xs text-muted-foreground w-8 text-left">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GpsDeviceStatus;