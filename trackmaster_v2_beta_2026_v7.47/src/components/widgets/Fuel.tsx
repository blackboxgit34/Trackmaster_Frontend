import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, CartesianGrid, XAxis, YAxis, Line, Bar } from 'recharts';
import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { fuelData, vehicles } from '@/data/mockData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarIcon, Info, Check, ChevronsUpDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
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
import { cn } from '@/lib/utils';

const chartConfig = {
  consumption: {
    label: 'Fuel Consumption (L)',
    color: '#8B5CF6', // Purple from image
  },
  economy: {
    label: 'Avg. Fuel Economy (km/L)',
    color: '#22C55E', // Green from image
  },
} satisfies ChartConfig;

const Fuel = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState('all');
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = React.useState(false);

  const handlePresetSelect = (preset: 'today' | 'yesterday' | '7d' | '30d' | '60d') => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDate({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDate({ from: yesterday, to: yesterday });
        break;
      case '7d':
        setDate({ from: subDays(now, 6), to: now });
        break;
      case '30d':
        setDate({ from: subDays(now, 29), to: now });
        break;
      case '60d':
        setDate({ from: subDays(now, 59), to: now });
        break;
    }
    setIsCalendarOpen(false);
  };

  const chartData = React.useMemo(() => {
    if (!date?.from) {
      return [];
    }

    const start = startOfDay(date.from);
    const end = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const filteredByDate = fuelData.filter(item => {
      const itemDate = parseISO(item.date);
      return isWithinInterval(itemDate, { start, end });
    });

    if (selectedVehicle === 'all') {
      const aggregatedData = filteredByDate.reduce(
        (
          acc: Record<string, { date: string; consumption: number; economy: number; count: number }>,
          curr
        ) => {
          if (!acc[curr.date]) {
            acc[curr.date] = { date: curr.date, consumption: 0, economy: 0, count: 0 };
          }
          acc[curr.date].consumption += curr.consumption;
          acc[curr.date].economy += curr.economy;
          acc[curr.date].count += 1;
          return acc;
        },
        {}
      );

      return Object.values(aggregatedData)
        .map(item => ({
          date: item.date,
          consumption: parseFloat(item.consumption.toFixed(1)),
          economy: parseFloat((item.economy / item.count).toFixed(1)),
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    } else {
      return filteredByDate.filter(item => item.vehicleId === selectedVehicle);
    }
  }, [date, selectedVehicle]);

  return (
    <Card className="relative">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Day-wise Fuel Consumption & Economy</CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>An overview of daily fuel usage and efficiency.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={isVehicleSelectorOpen} onOpenChange={setIsVehicleSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isVehicleSelectorOpen}
                  className="w-[150px] h-8 justify-between"
                >
                  <span className="truncate">
                    {vehicles.find((v) => v.id === selectedVehicle)?.name ?? "Select Vehicle"}
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
                      {vehicles.map((vehicle) => (
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
                <Button id="date" variant={'outline'} size="icon" className="h-8 w-8">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="sr-only">Open calendar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="end">
                <div className="flex flex-col space-y-1 p-2 border-r">
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('today')}>Today</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('yesterday')}>Yesterday</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('7d')}>Last 7 days</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('30d')}>Last 30 days</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('60d')}>Last 60 days</Button>
                </div>
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ComposedChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="var(--color-consumption)"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value} L`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--color-economy)"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value} km/L`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="consumption"
              fill="var(--color-consumption)"
              radius={4}
              yAxisId="left"
              name="Fuel Consumption (L)"
              barSize={6}
            />
            <Line
              dataKey="economy"
              type="monotone"
              stroke="var(--color-economy)"
              strokeWidth={2}
              dot={false}
              yAxisId="right"
              name="Avg. Fuel Economy (km/L)"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default Fuel;
