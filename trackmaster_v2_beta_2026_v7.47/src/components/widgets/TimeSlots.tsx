import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { cn } from '@/lib/utils';
import {
  workingHourDetails,
  actualVehicles,
} from '@/data/mockData';

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night';

const TIME_SLOTS = [
  {
    id: 'morning' as SlotKey,
    title: 'Morning',
    timeRange: '06 AM – 12 PM',
    start: 360,
    end: 720,
    Icon: Sunrise,
  },
  {
    id: 'afternoon' as SlotKey,
    title: 'Afternoon',
    timeRange: '12 PM – 06 PM',
    start: 720,
    end: 1080,
    Icon: Sun,
  },
  {
    id: 'evening' as SlotKey,
    title: 'Evening',
    timeRange: '06 PM – 12 AM',
    start: 1080,
    end: 1440,
    Icon: Sunset,
  },
  {
    id: 'night' as SlotKey,
    title: 'Night',
    timeRange: '12 AM – 06 AM',
    start: 0,
    end: 360,
    Icon: Moon,
  },
];

const STATUS_STYLE = {
  Peak: {
    wrapper:
      'border-orange-200 bg-orange-50/40 hover:border-orange-300 dark:border-orange-900/40 dark:bg-orange-950/20',
    badge:
      'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    bar: 'bg-orange-500',
    icon: TrendingUp,
  },
  Low: {
    wrapper:
      'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40',
    badge:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    bar: 'bg-slate-400 dark:bg-slate-600',
    icon: TrendingDown,
  },
  Normal: {
    wrapper:
      'bg-card hover:border-primary/20 dark:bg-slate-900/20 dark:hover:border-slate-700',
    badge:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    icon: ArrowRight,
  },
} as const;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const TimeSlots = () => {
  const timeSlotsData = useMemo(() => {
    const totalVehicles = actualVehicles.length || 1;

    const latestDate = [...new Set(workingHourDetails.map((i) => i.date))]
      .sort()
      .reverse()[0];

    const todaysSessions = workingHourDetails.filter(
      (i) => i.date === latestDate
    );

    const activeVehicles: Record<SlotKey, Set<string>> = {
      morning: new Set(),
      afternoon: new Set(),
      evening: new Set(),
      night: new Set(),
    };

    const hasOverlap = (
      sStart: number,
      sEnd: number,
      slotStart: number,
      slotEnd: number
    ) => sStart < slotEnd && sEnd > slotStart;

    todaysSessions.forEach((session) => {
      const start = toMinutes(session.startTime);
      const end = toMinutes(session.endTime);

      const intervals: [number, number][] =
        end < start ? [[start, 1440], [0, end]] : [[start, end]];

      intervals.forEach(([s, e]) => {
        TIME_SLOTS.forEach((slot) => {
          if (hasOverlap(s, e, slot.start, slot.end)) {
            activeVehicles[slot.id].add(session.vehicleId);
          }
        });
      });
    });

    const counts = {
      morning: activeVehicles.morning.size,
      afternoon: activeVehicles.afternoon.size,
      evening: activeVehicles.evening.size,
      night: activeVehicles.night.size,
    };

    const values = Object.values(counts);
    const highest = Math.max(...values);
    const lowest = Math.min(...values);

    return TIME_SLOTS.map((slot) => {
      const count = counts[slot.id];
      const percentage = Math.round((count / totalVehicles) * 100);

      let status: keyof typeof STATUS_STYLE = 'Normal';

      if (count === highest && highest !== lowest) status = 'Peak';
      else if (count === lowest && highest !== lowest) status = 'Low';

      return {
        ...slot,
        count,
        percentage,
        totalVehicles,
        status,
        Icon: slot.Icon,
        TrendIcon: STATUS_STYLE[status].icon,
      };
    });
  }, []);

  return (
    <Card className="h-full w-full border shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">
          Fleet Movements in Time Slots
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {timeSlotsData.map((slot) => {
            const style = STATUS_STYLE[slot.status];

            return (
              <div
                key={slot.id}
                className={cn(
                  'rounded-xl border p-3 transition-all duration-200 hover:shadow-sm',
                  style.wrapper
                )}
              >
                {/* Header */}
                <div className="relative">
                  <div
                    className={cn(
                      'absolute right-0 top-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                      style.badge
                    )}
                  >
                    <slot.TrendIcon size={11} />
                    {slot.status}
                  </div>

                  <div className="pt-6">
                    <div className="flex items-center gap-1.5">
                      <slot.Icon size={14} className="text-slate-600 dark:text-slate-300" />
                      <h3 className="text-sm font-semibold">{slot.title}</h3>
                    </div>

                    <p className="mt-0.5 text-[11px] text-muted-foreground dark:text-slate-400">
                      {slot.timeRange}
                    </p>
                  </div>
                </div>

                {/* KPI */}
                <div className="mt-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold leading-none">
                          {slot.count}
                        </span>
                        <span className="mb-0.5 text-xs text-muted-foreground dark:text-slate-400">
                          / {slot.totalVehicles}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-muted-foreground dark:text-slate-400">
                        Vehicles Running
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold leading-none">
                        {slot.percentage}%
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground dark:text-slate-400">
                        Utilized
                      </div>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted dark:bg-slate-800">
                    <div
                      className={cn('h-full rounded-full', style.bar)}
                      style={{ width: `${slot.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeSlots;