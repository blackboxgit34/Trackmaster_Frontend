import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { fuelFillingDetails, fuelTheftDetails, vehicles } from '@/data/mockData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarIcon, Info, Check, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subMonths, isWithinInterval, parseISO, startOfDay, endOfDay, format, eachMonthOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const chartConfig = {
  filling: {
    label: 'Fuel Filling (L)',
    color: '#22c55e', // Green
  },
  drainage: {
    label: 'Fuel Drainage (L)',
    color: '#ef4444', // Red
  },
} satisfies ChartConfig;

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

const Fuel = () => {
  // Default to last 12 months
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState('all');
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = React.useState(false);

  const handlePresetSelect = (preset: '3m' | '6m' | '12m' | 'ytd') => {
    const now = new Date();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    switch (preset) {
      case '3m':
        setDate({ from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: currentMonthEnd });
        break;
      case '6m':
        setDate({ from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: currentMonthEnd });
        break;
      case '12m':
        setDate({ from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: currentMonthEnd });
        break;
      case 'ytd':
        setDate({ from: new Date(now.getFullYear(), 0, 1), to: currentMonthEnd });
        break;
    }
    setIsCalendarOpen(false);
  };

  const handleFromMonthChange = (monthStr: string) => {
    const m = parseInt(monthStr);
    const y = date?.from?.getFullYear() || new Date().getFullYear();
    setDate(prev => ({ ...prev, from: new Date(y, m, 1), to: prev?.to || new Date() }));
  };

  const handleFromYearChange = (yearStr: string) => {
    const y = parseInt(yearStr);
    const m = date?.from?.getMonth() || 0;
    setDate(prev => ({ ...prev, from: new Date(y, m, 1), to: prev?.to || new Date() }));
  };

  const handleToMonthChange = (monthStr: string) => {
    const m = parseInt(monthStr);
    const y = date?.to?.getFullYear() || new Date().getFullYear();
    setDate(prev => ({ ...prev, from: prev?.from || new Date(), to: new Date(y, m + 1, 0, 23, 59, 59) }));
  };

  const handleToYearChange = (yearStr: string) => {
    const y = parseInt(yearStr);
    const m = date?.to?.getMonth() || new Date().getMonth();
    setDate(prev => ({ ...prev, from: prev?.from || new Date(), to: new Date(y, m + 1, 0, 23, 59, 59) }));
  };

  const chartData = React.useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const start = date.from;
    const end = date.to;

    const monthlyData = new Map<string, { month: string; filling: number; drainage: number; sortKey: number }>();

    // 1. Pre-fill all months in the selected interval to ensure continuity
    const monthsInInterval = eachMonthOfInterval({ start, end });
    monthsInInterval.forEach(monthDate => {
      const monthKey = format(monthDate, 'MMM yyyy');
      const sortKey = monthDate.getFullYear() * 100 + monthDate.getMonth();
      monthlyData.set(monthKey, { month: monthKey, filling: 0, drainage: 0, sortKey });
    });

    // 2. Process data to populate values
    const processData = (dataArray: any[], valueKey: string, type: 'filling' | 'drainage') => {
      dataArray.forEach(item => {
        if (selectedVehicle !== 'all' && item.vehicleId !== selectedVehicle) return;
        
        const itemDate = parseISO(item.date);
        
        if (isWithinInterval(itemDate, { start, end })) {
          const monthKey = format(itemDate, 'MMM yyyy');
          const sortKey = itemDate.getFullYear() * 100 + itemDate.getMonth();
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { month: monthKey, filling: 0, drainage: 0, sortKey });
          }
          
          const entry = monthlyData.get(monthKey)!;
          if (type === 'filling') entry.filling += item[valueKey];
          if (type === 'drainage') entry.drainage += item[valueKey];
        }
      });
    };

    processData(fuelFillingDetails, 'filling', 'filling');
    processData(fuelTheftDetails, 'drainage', 'drainage');

    const sortedArray = Array.from(monthlyData.values()).sort((a, b) => a.sortKey - b.sortKey);

    // Calculate trends compared to previous month and loss %
    return sortedArray.map((item, index) => {
      const prevItem = index > 0 ? sortedArray[index - 1] : null;
      
      const fillingTrend = prevItem && prevItem.filling > 0 
        ? ((item.filling - prevItem.filling) / prevItem.filling) * 100 
        : 0;
        
      const drainageTrend = prevItem && prevItem.drainage > 0 
        ? ((item.drainage - prevItem.drainage) / prevItem.drainage) * 100 
        : 0;

      const lossPercent = item.filling > 0 ? (item.drainage / item.filling) * 100 : 0;

      return {
        ...item,
        filling: parseFloat(item.filling.toFixed(1)),
        drainage: parseFloat(item.drainage.toFixed(1)),
        fillingTrend,
        drainageTrend,
        lossPercent,
        hasPrev: !!prevItem
      };
    });
  }, [date, selectedVehicle]);

  // Overall Summary Calculation
  const summary = React.useMemo(() => {
    const totalFilling = chartData.reduce((a, b) => a + b.filling, 0);
    const totalDrainage = chartData.reduce((a, b) => a + b.drainage, 0);
    const lossPercent = totalFilling ? ((totalDrainage / totalFilling) * 100).toFixed(1) : '0.0';

    return { totalFilling, totalDrainage, lossPercent };
  }, [chartData]);

  // Custom Tooltip Component
  const renderTrendIndicator = (trend: number, type: 'filling' | 'drainage', hasPrev: boolean) => {
    if (!hasPrev) return <span className="text-muted-foreground ml-2 text-[10px] font-normal">(No prior data)</span>;
    if (trend === 0) return <span className="text-muted-foreground ml-2 text-[10px] font-normal">(0% vs prev mth)</span>;
    
    const isUp = trend > 0;
    
    // For filling, up is green. For drainage, up is red (bad).
    let colorClass = "text-muted-foreground";
    if (type === 'filling') colorClass = isUp ? "text-green-500" : "text-red-500";
    if (type === 'drainage') colorClass = isUp ? "text-red-500" : "text-green-500";

    return (
      <span className={cn("ml-2 flex items-center text-[10px] font-bold", colorClass)}>
        {isUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
        {Math.abs(trend).toFixed(1)}% <span className="text-muted-foreground font-normal ml-1">(vs prev mth)</span>
      </span>
    );
  };

  return (
    <Card className="relative">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Monthly Fuel Filling vs Drainage</CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monthly comparison of fuel filled and fuel drained/theft.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Summary Stats Row */}
            <div className="flex gap-8 mt-4 mb-2 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-0.5">Total Filling</span>
                <span className="font-bold text-base">{summary.totalFilling.toFixed(1)} L</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-0.5">Total Drainage</span>
                <span className="font-bold text-base text-red-500">{summary.totalDrainage.toFixed(1)} L</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-0.5">Loss %</span>
                <span className="font-bold text-base">{summary.lossPercent}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isVehicleSelectorOpen}
                  className="w-[150px] h-8 justify-between bg-muted/30"
                >
                  <span className="truncate">
                    {selectedVehicle === 'all' 
                      ? 'All Vehicles' 
                      : vehicles.find((v) => v.id === selectedVehicle)?.name ?? "Select Vehicle"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search vehicle..." />
                  <CommandEmpty>No vehicle found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedVehicle('all');
                          setIsVehicleSelectorOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedVehicle === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Vehicles
                      </CommandItem>
                      {vehicles.filter(v => v.id !== 'all').map((vehicle) => (
                        <CommandItem
                          key={vehicle.id}
                          value={vehicle.name}
                          onSelect={(currentValue) => {
                            const selected = vehicles.find(v => v.name.toLowerCase() === currentValue.toLowerCase());
                            if (selected) {
                              setSelectedVehicle(selected.id);
                            }
                            setIsVehicleSelectorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedVehicle === vehicle.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {vehicle.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button id="date" variant={'outline'} className="h-8 pl-3 pr-4 bg-muted/30">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {date?.from && date?.to 
                    ? `${format(date.from, 'MMM yyyy')} - ${format(date.to, 'MMM yyyy')}` 
                    : 'Select Month Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="end">
                <div className="flex flex-col space-y-1 p-2 border-r bg-muted/20">
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('3m')}>Last 3 Months</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('6m')}>Last 6 Months</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('12m')}>Last 12 Months</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('ytd')}>Year to Date</Button>
                </div>
                <div className="p-4 flex flex-col gap-5 justify-center">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">From</Label>
                    <div className="flex gap-2">
                      <Select value={date?.from ? date.from.getMonth().toString() : ''} onValueChange={handleFromMonthChange}>
                        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                          {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={date?.from ? date.from.getFullYear().toString() : ''} onValueChange={handleFromYearChange}>
                        <SelectTrigger className="w-[90px]"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">To</Label>
                    <div className="flex gap-2">
                      <Select value={date?.to ? date.to.getMonth().toString() : ''} onValueChange={handleToMonthChange}>
                        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                          {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={date?.to ? date.to.getFullYear().toString() : ''} onValueChange={handleToYearChange}>
                        <SelectTrigger className="w-[90px]"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                          {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4 border-t">
        {chartData.length === 0 ? (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No data available for selected range
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={chartData} barGap={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value} L`}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  
                  return (
                    <div className="bg-background/95 backdrop-blur-md p-3 border border-border rounded-xl shadow-xl text-xs space-y-2 min-w-[240px]">
                      <p className="font-bold text-sm text-foreground border-b pb-1 mb-1">{d.month}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]"></div> Filling:
                        </span>
                        <div className="flex items-center font-semibold text-foreground">
                           {d.filling} L {renderTrendIndicator(d.fillingTrend, 'filling', d.hasPrev)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]"></div> Drainage:
                        </span>
                        <div className="flex items-center font-semibold text-foreground">
                           {d.drainage} L {renderTrendIndicator(d.drainageTrend, 'drainage', d.hasPrev)}
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-2 mt-1 flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">Loss %:</span>
                        <span className="font-bold text-base">{d.lossPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                }}
              />
              <ChartLegend content={<ChartLegendContent />} className="pt-4" />
              <Bar
                dataKey="filling"
                fill="var(--color-filling)"
                radius={[4, 4, 0, 0]}
                name="Fuel Filling (L)"
                barSize={10}
              />
              <Bar
                dataKey="drainage"
                fill="var(--color-drainage)"
                radius={[4, 4, 0, 0]}
                name="Fuel Drainage (L)"
                barSize={10}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default Fuel;