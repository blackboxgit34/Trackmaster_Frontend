import React, { useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { liveStatusData, vehicles } from '@/data/mockData';
import { ChevronLeft, ChevronRight, Info, ArrowUpNarrowWide, ArrowDownNarrowWide, Fuel, PlugZap, Bug, Clock, MapPin, Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import WavyBar from '../WavyBar';
import { useSettings } from '@/context/SettingsContext';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="font-medium text-sm">{data.vehicle}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
            <span className="text-xs text-muted-foreground">Fuel Level:</span>
            <span className="text-xs font-bold">{data.fuelLiters.toFixed(1)} L</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: { vehicle: string; fuelLevel: number }[] }) => {
  if (!data || data.length === 0) return null;

  const avgFuelLevel = data.reduce((acc, curr) => acc + curr.fuelLevel, 0) / data.length;

  return (
    <div className="flex items-center justify-center gap-6 pt-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(34, 94%, 50%)' }} />
        <span>Average Fuel Level</span>
        <span className="font-bold text-foreground">{avgFuelLevel.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const CurrentFuelLevelChart = () => {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'default'>('default');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [fuelLevelFilter, setFuelLevelFilter] = React.useState('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { fuelThresholds } = useSettings();

  const allStatuses = useMemo(() => ['all', ...new Set(liveStatusData.map(v => v.status))], []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const chartData = React.useMemo(() => {
    let filtered = liveStatusData;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (fuelLevelFilter !== 'all') {
      switch (fuelLevelFilter) {
        case 'low':
          filtered = filtered.filter(item => item.fuelLiters < fuelThresholds.low);
          break;
        case 'normal':
          filtered = filtered.filter(item => item.fuelLiters >= fuelThresholds.low);
          break;
      }
    }

    const aggregatedData = filtered.map(item => ({
      vehicle: vehicles.find(v => v.id === item.vehicleNo)?.name || item.vehicleNo,
      vehicleId: item.vehicleNo,
      fuelLevel: item.fuelLevel,
      fuelLiters: item.fuelLiters,
      status: item.status,
      sensorStatus: item.sensorStatus,
      lastUpdated: item.lastUpdated,
      location: item.location,
    }));

    if (sortOrder === 'asc') {
      return aggregatedData.sort((a, b) => a.fuelLevel - b.fuelLevel);
    }
    if (sortOrder === 'desc') {
      return aggregatedData.sort((a, b) => b.fuelLevel - a.fuelLevel);
    }

    return aggregatedData.sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [sortOrder, statusFilter, fuelLevelFilter, fuelThresholds.low]);

  const Y_AXIS_WIDTH = 80;
  const X_AXIS_HEIGHT = 70;
  const CHART_HEIGHT = 250;

  const yDomain = [0, 100];

  const renderBarShape = (props: any) => {
    const { payload, x, y, width, height } = props;
    if (height <= 0) return <g />;

    let iconData: {
      icon: React.ReactNode;
      popoverContent: React.ReactNode;
    } | null = null;

    if (payload.sensorStatus === 'disconnected') {
      iconData = {
        icon: <PlugZap className="h-4 w-4 text-red-500" />,
        popoverContent: (
          <div className="p-3 bg-card border rounded-lg shadow-xl w-64">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <PlugZap className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="font-semibold text-sm text-red-500">Sensor Disconnected</h3>
            </div>
            <div className="space-y-1.5 text-xs pl-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{payload.lastUpdated}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground truncate max-w-[180px]">{payload.location}</span>
              </div>
            </div>
            <Button asChild variant="link" className="p-0 h-auto mt-2 text-xs w-full justify-start text-blue-500 hover:text-blue-600">
              <Link to={`/addons/fuel-reports/disconnection-report?vehicle=${payload.vehicleId}`}>View Details &rarr;</Link>
            </Button>
          </div>
        ),
      };
    } else if (payload.sensorStatus === 'dirt_error') {
      iconData = {
        icon: <Bug className="h-4 w-4 text-yellow-600" />,
        popoverContent: (
          <div className="p-3 bg-card border rounded-lg shadow-xl w-64">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <Bug className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-sm text-yellow-600">Dirt Error</h3>
            </div>
            <div className="space-y-1.5 text-xs pl-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{payload.lastUpdated}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground truncate max-w-[180px]">{payload.location}</span>
              </div>
            </div>
            <Button asChild variant="link" className="p-0 h-auto mt-2 text-xs w-full justify-start text-blue-500 hover:text-blue-600">
              <Link to={`/addons/fuel-reports/dirt-error-report?vehicle=${payload.vehicleId}`}>View Details &rarr;</Link>
            </Button>
          </div>
        ),
      };
    } else if (payload.fuelLiters < fuelThresholds.low) {
      iconData = {
        icon: <Fuel className="h-4 w-4 text-orange-500" />,
        popoverContent: (
          <div className="p-3 bg-card border rounded-lg shadow-xl w-56">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Fuel className="h-4 w-4 text-orange-500" />
              </div>
              <h3 className="font-semibold text-sm text-orange-500">Low Fuel</h3>
            </div>
            <div className="space-y-1.5 text-xs pl-1">
              <div className="flex items-center gap-2">
                <Droplets className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Level: <span className="font-semibold text-foreground">{payload.fuelLiters.toFixed(1)}L</span></span>
              </div>
            </div>
            <Button asChild variant="link" className="p-0 h-auto mt-2 text-xs w-full justify-start text-blue-500 hover:text-blue-600">
              <Link to={`/reports/vehicle/current-fuel?vehicle=${payload.vehicleId}&level=low`}>View Details &rarr;</Link>
            </Button>
          </div>
        ),
      };
    }

    const bar = payload.status === 'Moving' 
        ? <WavyBar {...props} /> 
        : <rect x={x} y={y} width={width} height={height} fill="url(#staticBarGradient)" />;

    return (
        <g>
            {bar}
            {iconData && (
                <foreignObject x={x + width / 2 - 10} y={y - 24} width="20" height="20">
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="cursor-pointer w-full h-full flex items-center justify-center">
                        {iconData.icon}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      {iconData.popoverContent}
                    </PopoverContent>
                  </Popover>
                </foreignObject>
            )}
        </g>
    );
  };

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Card className="h-full relative flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Current Fuel Level</CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                    <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current fuel level for each vehicle.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 flex-wrap justify-end">
          <Select value={fuelLevelFilter} onValueChange={setFuelLevelFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Filter by Fuel Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuel Levels</SelectItem>
              <SelectItem value="low">Low (&lt; {fuelThresholds.low}L)</SelectItem>
              <SelectItem value="normal">Normal (&gt;= {fuelThresholds.low}L)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              {allStatuses.map(status => (
                <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={sortOrder === 'asc' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setSortOrder(prev => prev === 'asc' ? 'default' : 'asc')} aria-label="Sort ascending">
            <ArrowUpNarrowWide className="h-4 w-4" />
          </Button>
          <Button variant={sortOrder === 'desc' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setSortOrder(prev => prev === 'desc' ? 'default' : 'desc')} aria-label="Sort descending">
            <ArrowDownNarrowWide className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => scroll('left')}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => scroll('right')}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <CardContent className="p-6 pt-0 flex-grow flex flex-col min-h-0">
          <div className="flex flex-grow">
            <div style={{ height: `${CHART_HEIGHT}px`, width: `${Y_AXIS_WIDTH}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{}]} margin={{ top: 30, right: 0, left: 0, bottom: X_AXIS_HEIGHT }}>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={yDomain} label={{ value: 'Fuel Level (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, offset: -15 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar min-w-0" ref={scrollContainerRef}>
              <div style={{ width: `${chartData.length * 80}px`, height: `${CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="staticBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b34700" />
                        <stop offset="100%" stopColor="#2b0000" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="vehicle" tickLine={false} axisLine={true} stroke="hsl(var(--muted-foreground))" fontSize={12} interval={0} angle={-45} textAnchor="end" height={X_AXIS_HEIGHT} />
                    <YAxis hide={true} domain={yDomain} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
                    <Bar dataKey="fuelLevel" shape={renderBarShape} barSize={40} />
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

export default CurrentFuelLevelChart;