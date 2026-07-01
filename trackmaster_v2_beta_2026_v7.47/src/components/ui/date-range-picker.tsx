"use client"

import * as React from "react"
import { format, subDays, subMonths, setHours, setMinutes, parse } from "date-fns"
import { Calendar as CalendarIcon, Check } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// ── Preset sidebar options ──────────────────────────────────────────────────
const presetRanges = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 30 days", value: "last-30-days" },
  { label: "Last 2 months", value: "last-2-months" },
] as const

// ── Props ───────────────────────────────────────────────────────────────────
interface DateRangePickerProps extends React.ComponentProps<"div"> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  /** Render a compact icon-only trigger instead of the full label button */
  showIconOnly?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Merge a HH:mm time string into a Date, keeping the date portion. */
function mergeTime(d: Date, timeStr: string): Date {
  try {
    const p = parse(timeStr, "HH:mm", new Date())
    return setMinutes(setHours(d, p.getHours()), p.getMinutes())
  } catch {
    return d
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export function DateRangePicker({
  className,
  date,
  setDate,
  showIconOnly,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activePreset, setActivePreset] = React.useState<string | null>(null)

  // Internal state to hold the selection before applying
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)

  // Time-input state (kept as string so the native time input works smoothly)
  const [startTime, setStartTime] = React.useState("00:00")
  const [endTime, setEndTime] = React.useState(format(new Date(), "HH:mm"))

  // Sync internal state when popover opens or external date changes
  React.useEffect(() => {
    if (isOpen) {
      setTempDate(date)
      if (date?.from) {
        setStartTime(format(date.from, "HH:mm"))
      } else {
        setStartTime("00:00")
      }
      if (date?.to) {
        setEndTime(format(date.to, "HH:mm"))
      } else {
        setEndTime(format(new Date(), "HH:mm"))
      }
    }
  }, [isOpen, date])

  // ── Calendar selection handler ──────────────────────────────────────────
  const handleCalendarSelect = React.useCallback(
    (newRange: DateRange | undefined, selectedDay: Date) => {
      setActivePreset("custom")

      // If a complete range is already selected, start a new range from the clicked date
      if (tempDate?.from && tempDate?.to) {
        setStartTime("00:00")
        const currentEndTime = format(new Date(), "HH:mm")
        setEndTime(currentEndTime)
        
        setTempDate({
          from: mergeTime(selectedDay, "00:00"),
          to: undefined,
        })
        return
      }

      if (!newRange) { setTempDate(undefined); return }

      let currentStartTime = startTime
      let currentEndTime = endTime

      // If starting a brand new selection
      if (newRange.from && !newRange.to && !tempDate?.from) {
        currentStartTime = "00:00"
        setStartTime(currentStartTime)
        currentEndTime = format(new Date(), "HH:mm")
        setEndTime(currentEndTime)
      }

      const from = newRange.from ? mergeTime(newRange.from, currentStartTime) : undefined
      const to = newRange.to ? mergeTime(newRange.to, currentEndTime) : undefined
      
      setTempDate({ from, to })
    },
    [startTime, endTime, tempDate],
  )

  // ── Time-input change handler ───────────────────────────────────────────
  const handleTimeChange = React.useCallback(
    (which: "start" | "end", value: string) => {
      if (which === "start") {
        setStartTime(value)
        if (tempDate?.from && value.length === 5)
          setTempDate({ ...tempDate, from: mergeTime(tempDate.from, value) })
      } else {
        setEndTime(value)
        if (tempDate?.to && value.length === 5)
          setTempDate({ ...tempDate, to: mergeTime(tempDate.to, value) })
      }
    },
    [tempDate],
  )

  // ── Preset click handler ────────────────────────────────────────────────
  const handlePresetClick = React.useCallback(
    (preset: string) => {
      const now = new Date()
      let from: Date
      let to: Date = now

      switch (preset) {
        case "today":
          from = mergeTime(now, "00:00"); break
        case "yesterday":
          from = mergeTime(subDays(now, 1), "00:00")
          to   = mergeTime(subDays(now, 1), "23:59"); break
        case "last-7-days":
          from = mergeTime(subDays(now, 7), "00:00"); break
        case "last-30-days":
          from = mergeTime(subDays(now, 30), "00:00"); break
        case "last-2-months":
          from = mergeTime(subMonths(now, 2), "00:00"); break
        default:
          from = mergeTime(now, "00:00")
      }
      setStartTime("00:00")
      setEndTime(format(to, "HH:mm"))
      setTempDate({ from, to })
      setActivePreset(preset)
    },
    [],
  )

  const handleApply = React.useCallback(() => {
    setDate(tempDate)
    setIsOpen(false)
  }, [setDate, tempDate])

  const handleCancel = React.useCallback(() => {
    setTempDate(date)
    setIsOpen(false)
  }, [date])

  // Hard limit: nothing before 2 months ago, nothing after today
  const twoMonthsAgo = subMonths(new Date(), 2)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>

        {/* ── Trigger button ─────────────────────────────────────────── */}
        <PopoverTrigger asChild>
          {showIconOnly ? (
            <Button id="date" variant="outline" size="icon" className="h-9 w-9">
              <CalendarIcon className="h-4 w-4" />
              <span className="sr-only">Pick a date</span>
            </Button>
          ) : (
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-auto justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} –{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          )}
        </PopoverTrigger>

        {/* ── Popover content ────────────────────────────────────────── */}
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col sm:flex-row">

            {/* ── Left sidebar: presets ─────────────────────────────── */}
            <div className="flex flex-col gap-1 border-b sm:border-b-0 sm:border-r p-3 min-w-[150px]">
              {presetRanges.map((r) => (
                <Button
                  key={r.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-start text-sm font-normal h-8",
                    activePreset === r.value &&
                      "bg-primary/10 text-primary font-medium",
                  )}
                  onClick={() => handlePresetClick(r.value)}
                >
                  {r.label}
                </Button>
              ))}

              {/* Custom label */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start text-sm font-normal h-8 mt-2",
                  activePreset === "custom" &&
                    "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => setActivePreset("custom")}
              >
                {activePreset === "custom" && (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Custom
              </Button>
            </div>

            {/* ── Right: header + calendars ─────────────────────────── */}
            <div className="flex flex-col">

              {/* ── Date/Time header row ──────────────────────────────── */}
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                {/* From */}
                <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-sm tabular-nums text-muted-foreground select-none whitespace-nowrap">
                    {tempDate?.from ? format(tempDate.from, "MMM dd, yyyy") : "-- / -- / ----"}
                  </span>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange("start", e.target.value)}
                    className="h-7 w-full min-w-[110px] border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>

                <span className="text-muted-foreground select-none">→</span>

                {/* To */}
                <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-sm tabular-nums text-muted-foreground select-none whitespace-nowrap">
                    {tempDate?.to ? format(tempDate.to, "MMM dd, yyyy") : "-- / -- / ----"}
                  </span>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleTimeChange("end", e.target.value)}
                    className="h-7 w-full min-w-[110px] border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* ── Dual-month calendar ───────────────────────────────── */}
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDate?.from}
                selected={tempDate}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                disabled={{ before: twoMonthsAgo, after: new Date() }}
              />

              {/* ── Footer ────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-2 border-t p-3">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApply}
                  disabled={!!tempDate?.from && !tempDate?.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}