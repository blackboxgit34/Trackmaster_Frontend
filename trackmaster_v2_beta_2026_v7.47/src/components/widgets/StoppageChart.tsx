import { useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, ChevronLeft, ChevronRight, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { stoppageData } from '@/data/mockData';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  stoppage: {
    label: 'Stoppage',
    color: '#3b82f6', // blue-500
  },
  overstoppage: {
    label: 'Overstoppage',
    color: '#ef4444', // red-500
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.stoppage + data.overstoppage;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-medium text-sm">{label}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-stoppage)' }} />
            <span className="text-xs text-muted-foreground">Stoppage:</span>
            <span className="text-xs font-bold">{data.stoppage.toFixed(1)} hrs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-overstoppage)' }} />
            <span className="text-xs text-muted-foreground">Overstoppage:</span>
            <span className="text-xs font-bold">{data.overstoppage.toFixed(1)} hrs</span>
          </div>
          <div className="border-t my-1"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-xs font-bold">{total.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: { vehicle: string; stoppage: number; overstoppage: number }[] }) => {
  if (!data || data.length === 0) return null;

  const avgStoppage = data.reduce((acc, curr) => acc + curr.stoppage, 0) / data.length;
  const avgOverstoppage = data.reduce((acc, curr) => acc + curr.overstoppage, 0) / data.length;

  return (
    <div className="flex items-center justify-center gap-4 pt-3 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--color-stoppage)' }} />
        <span className="text-muted-foreground">Avg. Stoppage:</span>
        <span className="font-bold text-foreground">{avgStoppage.toFixed(1)}h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--color-overstoppage)' }} />
        <span className="text-muted-foreground">Avg. Overstoppage:</span>
        <span className="font-bold text-foreground">{avgOverstoppage.toFixed(1)}h</span>
      </div>
    </div>
  );
};

const StoppageChart = () => {
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
    const data = [...stoppageData];
    if (sortOrder === 'asc') {
      return data.sort((a, b) => (a.stoppage + a.overstoppage) - (b.stoppage + b.overstoppage));
    }
    if (sortOrder === 'desc') {
      return data.sort((a, b) => (b.stoppage + b.overstoppage) - (a.stoppage + a.overstoppage));
    }
    return data.sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [sortOrder]);

  const Y_AXIS_WIDTH = 60;
  const X_AXIS_HEIGHT = 70;
  const CHART_HEIGHT = 250;

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 5];
    const maxStoppage = Math.max(...chartData.map(d => d.stoppage + d.overstoppage));
    return [0, Math.ceil(maxStoppage)];
  }, [chartData]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Stoppage & Overstoppage</CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                    <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Daily stoppage and overstoppage duration per vehicle.</p>
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
        </CardHeader>
        <CardContent className="px-2 flex-1 min-h-[250px] flex flex-col">
          <ChartContainer config={chartConfig} className="h-full w-full flex-1 flex flex-col">
            <>
              <div className="flex flex-grow w-full">
                <div style={{ height: `${CHART_HEIGHT}px`, width: `${Y_AXIS_WIDTH}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{}]} margin={{ top: 20, right: 0, left: -20, bottom: X_AXIS_HEIGHT }}>
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={yDomain}
                        label={{ value: 'Duration (hours)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, offset: 0 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 overflow-x-auto no-scrollbar min-w-0" ref={scrollContainerRef}>
                  <div style={{ width: `${chartData.length * 30}px`, height: `${CHART_HEIGHT}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: 20,
                          left: 0,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="vehicle"
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
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<CustomTooltip />}
                        />
                        <Bar dataKey="stoppage" stackId="a" fill="var(--color-stoppage)" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="overstoppage" stackId="a" fill="var(--color-overstoppage)" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <CustomLegend data={chartData} />
            </>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
};

export default StoppageChart;