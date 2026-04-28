import * as React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar as CalendarIcon, Droplets, Fuel, PlugZap } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const alertData = [
  {
    id: 'fuel-drainage',
    label: 'Fuel Drainage',
    count: 22,
    Icon: Droplets,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'low-fuel',
    label: 'Low Fuel',
    count: 10,
    Icon: Fuel,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  {
    id: 'sensor-disconnection',
    label: 'Sensor Disconnection',
    count: 22,
    Icon: PlugZap,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'dirt-errors',
    label: 'Dirt Error',
    count: 10,
    Icon: Fuel,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
];

const Alerts = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Alerts</CardTitle>
              <CardDescription className="text-xs">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'MMM dd, yyyy')} - {format(date.to, 'MMM dd, yyyy')}
                    </>
                  ) : (
                    format(date.from, 'MMM dd, yyyy')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </CardDescription>
            </div>
          </div>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
                <CalendarIcon className="h-4 w-4" />
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
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-4">
          {alertData.map((alert) => {
            const fromDate = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
            const toDate = date?.to ? format(date.to, 'yyyy-MM-dd') : '';
            const searchParams = new URLSearchParams();
            if (fromDate) searchParams.set('from', fromDate);
            if (toDate) searchParams.set('to', toDate);
            const linkTo = `/alerts/${alert.id}?${searchParams.toString()}`;

            return (
              <Link
                key={alert.id}
                to={linkTo}
                className="relative block rounded-lg border p-4 text-center transition-colors hover:bg-muted"
              >
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {alert.count}
                </div>
                <div
                  className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${alert.bgColor}`}
                >
                  <alert.Icon className={`h-6 w-6 ${alert.color}`} />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{alert.label}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Alerts;