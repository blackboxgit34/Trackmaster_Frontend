import { useRef, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { consolidatedReportTableData, vehicles } from '@/data/mockData';
import { ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-medium text-sm">{data.vehicle}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
            <span className="text-xs text-muted-foreground">Idling Duration:</span>
            <span className="text-xs font-bold">{data.idlingHours.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: { vehicle: string; idlingHours: number }[] }) => {
  if (!data || data.length === 0) return null;

  const avgIdlingHours = data.reduce((acc, curr) => acc + curr.idlingHours, 0) / data.length;

  return (
    <div className="flex items-center justify-center gap-2 pt-1 text-sm text-muted-foreground">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(173, 80%, 40%)' }} />
      <span>Avg. Idling: <span className="font-bold text-foreground">{avgIdlingHours.toFixed(1)}h</span></span>
    </div>
  );
};

const IdlingDuration = () => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'default'>('default');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    const vehicleIdling: Record<string, number> = {};
    consolidatedReportTableData.forEach(record => {
        if (!vehicleIdling[record.vehicleId]) {
            vehicleIdling[record.vehicleId] = 0;
        }
        vehicleIdling[record.vehicleId] += (record as any).idlingHours || 0;
    });

    const aggregatedData = Object.keys(vehicleIdling).map(vehicleId => ({
      vehicle: vehicles.find(v => v.id === vehicleId)?.name || vehicleId,
      idlingHours: parseFloat(vehicleIdling[vehicleId].toFixed(1)),
    }));

    if (sortOrder === 'asc') {
      return aggregatedData.sort((a, b) => a.idlingHours - b.idlingHours);
    }
    if (sortOrder === 'desc') {
      return aggregatedData.sort((a, b) => b.idlingHours - a.idlingHours);
    }

    return aggregatedData.sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [sortOrder]);

  const Y_AXIS_WIDTH = 60;
  const X_AXIS_HEIGHT = 70;
  const CHART_HEIGHT = 220;

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 5];
    const maxHours = Math.max(...chartData.map(d => d.idlingHours));
    return [0, Math.ceil(maxHours)];
  }, [chartData]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Card className="h-full relative flex flex-col">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Idling Duration</CardTitle>
              <TooltipProvider>
                <UITooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total idling duration for each vehicle.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
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
          <div className="flex flex-grow">
            <div style={{ height: `${CHART_HEIGHT}px`, width: `${Y_AXIS_WIDTH}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{}]} margin={{ top: 5, right: 0, left: 0, bottom: X_AXIS_HEIGHT }}>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={yDomain} label={{ value: 'Duration (hours)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, offset: -10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar min-w-0" ref={scrollContainerRef}>
              <div style={{ width: `${chartData.length * 40}px`, height: `${CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="vehicle" tickLine={false} axisLine={true} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={X_AXIS_HEIGHT} />
                    <YAxis hide={true} domain={yDomain} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
                    <Bar dataKey="idlingHours" fill="hsl(173, 80%, 40%)" radius={[4, 4, 0, 0]} barSize={12} />
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

export default IdlingDuration;