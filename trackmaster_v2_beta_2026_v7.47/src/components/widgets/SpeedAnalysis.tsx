import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const speedData = [
  { name: 'Normal Speed', value: 2, color: '#22c55e' }, // Green
  { name: 'Overspeed', value: 6, color: '#ef4444' }, // Red
];

const SpeedAnalysis = () => {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const totalMoving = useMemo(() => speedData.reduce((acc, curr) => acc + curr.value, 0), []);

  const activeEntry = useMemo(
    () => (activeStatus ? speedData.find((d) => d.name === activeStatus) : null),
    [activeStatus]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Speed Analysis</CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Normal vs. Overspeed vehicles.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="text-xs">Normal vs. Overspeed vehicles</CardDescription>
          </div>
          <Select defaultValue="today">
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center p-4 pt-2">
        <div className="w-full grid grid-cols-2 gap-4 items-center">
          <div className="relative w-full h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={speedData}
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
                  {speedData.map((entry) => (
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
                  <span className="text-3xl font-bold tracking-tighter">{totalMoving}</span>
                  <span className="text-sm text-muted-foreground">Total Moving</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {speedData.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between text-sm cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setActiveStatus(entry.name)}
                onMouseLeave={() => setActiveStatus(null)}
                style={{ opacity: activeStatus ? (entry.name === activeStatus ? 1 : 0.5) : 1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <div className="font-semibold text-foreground text-right">
                  {entry.name === 'Normal Speed' ? (
                    <>
                      -3 <span className="text-xs text-muted-foreground">-38%</span>
                    </>
                  ) : (
                    <>
                      11 <span className="text-xs text-muted-foreground">138%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeedAnalysis;