"use client";

import * as React from 'react';
import {
  format,
  getYear,
  setYear,
  setMonth as dfnsSetMonth,
  getMonth,
  addYears,
  subYears,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MonthPickerPreset {
  label: string;
  date: Date;
}

interface MonthPickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  presets?: MonthPickerPreset[];
}

export function MonthPicker({
  date,
  setDate,
  className,
  presets,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [displayDate, setDisplayDate] = React.useState(date || new Date());

  React.useEffect(() => {
    if (open) {
      setDisplayDate(date || new Date());
    }
  }, [open, date]);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = dfnsSetMonth(
      setYear(new Date(), getYear(displayDate)),
      monthIndex
    );
    setDate(newDate);
    setOpen(false);
  };

  const handlePresetSelect = (presetDate: Date) => {
    setDate(presetDate);
    setOpen(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    return new Date(getYear(displayDate), i, 1);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-auto justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMMM yyyy') : <span>Pick a month</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex">
        {presets && presets.length > 0 && (
          <>
            <div className="flex flex-col space-y-1 pr-2 py-2 pl-2 border-r">
              {presets.map((preset) => {
                const isActive =
                  date &&
                  getMonth(date) === getMonth(preset.date) &&
                  getYear(date) === getYear(preset.date);
                return (
                  <Button
                    key={preset.label}
                    variant={isActive ? 'default' : 'ghost'}
                    onClick={() => handlePresetSelect(preset.date)}
                    className="w-full justify-start px-3 h-8 text-sm"
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </>
        )}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDisplayDate(subYears(displayDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold text-sm">{getYear(displayDate)}</div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDisplayDate(addYears(displayDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {months.map((month, index) => (
              <Button
                key={index}
                variant={
                  date &&
                  getMonth(date) === index &&
                  getYear(date) === getYear(displayDate)
                    ? 'default'
                    : 'ghost'
                }
                onClick={() => handleMonthSelect(index)}
                className="w-full h-9 text-sm font-normal"
              >
                {format(month, 'MMM')}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
