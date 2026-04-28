import { useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { consolidatedReportTableData, vehicles } from '@/data/mockData';
import { ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-medium text-sm">{data.vehicleName}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-xs text-muted-foreground">Avg. Driving:</span>
            <span className="text-xs font-bold">{data.avgHours.toFixed(1)} hrs/day</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: { vehicleName: string; avgHours: number }[] }) => {
  if (!data || data.length === 0) return null;

  const avgUptime = data.reduce((acc, curr) => acc + curr.avgHours, 0) / data.length;

  return (
    <div className="flex items-center justify-center gap-6 pt-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
        <span>Average Driving Hours</span>
        <span className="font-bold text-foreground">{avgUptime.toFixed(1)}h/day</span>
      </div>
    </div>
  );
};

const AverageUptime = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'default'>('default');

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const chartData = useMemo(() => {
    const vehicleData: Record<string, { totalHours: number; count: number }> = {};

    consolidatedReportTableData.forEach(record => {
      if (!vehicleData[record.vehicleId]) {
        vehicleData[record.vehicleId] = { totalHours: 0, count: 0 };
      }
      vehicleData[record.vehicleId].totalHours += record.workingHours;
      vehicleData[record.vehicleId].count += 1;
    });

    const aggregatedData = Object.keys(vehicleData).map(vehicleId => {
      const vehicleInfo = vehicles.find(v => v.id === vehicleId);
      return {
        vehicleId: vehicleId,
        vehicleName: vehicleInfo ? vehicleInfo.name : vehicleId,
        avgHours: vehicleData[vehicleId].totalHours / vehicleData[vehicleId].count,
      };
    });

    if (sortOrder === 'asc') {
      return aggregatedData.sort((a, b) => a.avgHours - b.avgHours);
    }
    if (sortOrder === 'desc') {
      return aggregatedData.sort((a, b) => b.avgHours - a.avgHours);
    }

    return aggregatedData.sort((a, b) => a.vehicleName.localeCompare(b.vehicleName));
  }, [sortOrder]);

  const Y_AXIS_WIDTH = 80;
  const X_AXIS_HEIGHT = 70;
  const CHART_HEIGHT = 250;

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10];
    const maxHours = Math.max(...chartData.map(d => d.avgHours));
    return [0, Math.ceil(maxHours)];
  }, [chartData]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Card className="h-full flex flex-col">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Average Driving Hours</CardTitle>
                <TooltipProvider>
                  <UITooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                        <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Fleet's average daily working hours per vehicle.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-xs mt-1">
                Fleet's average daily working hours per vehicle.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={sortOrder === 'asc' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setSortOrder(prev => prev === 'asc' ? 'default' : 'asc')} aria-label="Sort ascending">
                <ArrowUpNarrowWide className="h-4 w-4" />
              </Button>
              <Button variant={sortOrder === 'desc' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setSortOrder(prev => prev === 'desc' ? 'default' : 'desc')} aria-label="Sort descending">
                <ArrowDownNarrowWide className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('left')}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('right')}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-grow flex flex-col min-h-0">
          <div className="flex flex-grow w-full">
            <div style={{ height: `${CHART_HEIGHT}px`, width: `${Y_AXIS_WIDTH}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{}]} margin={{ top: 5, right: 0, left: 0, bottom: X_AXIS_HEIGHT }}>
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={yDomain} 
                    label={{ value: 'Hrs/Day', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, offset: -15 }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar min-w-0" ref={scrollContainerRef}>
              <div style={{ width: `${chartData.length * 40}px`, height: `${CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="vehicleName" 
                      tickLine={false} 
                      axisLine={true} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                      height={X_AXIS_HEIGHT} 
                    />
                    <YAxis hide={true} domain={yDomain} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
                    <Bar dataKey="avgHours" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <CustomLegend data={chartData} />
        </CardContent>
      </Card>
    </>
  );
};

export default AverageUptime;