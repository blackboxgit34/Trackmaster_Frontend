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

  const renderTriggerLabel = () => {
    if (!date?.from) return <span>Pick date range</span>
    if (!date.to) return format(date.from, "dd MMM yyyy")

    const sameDay = format(date.from, "yyyy-MM-dd") === format(date.to, "yyyy-MM-dd")
    if (sameDay) {
      return format(date.from, "dd MMM yyyy")
    }

    const sameYear = format(date.from, "yyyy") === format(date.to, "yyyy")
    if (sameYear) {
      return `${format(date.from, "dd MMM")} – ${format(date.to, "dd MMM yyyy")}`
    }
    return `${format(date.from, "dd MMM yy")} – ${format(date.to, "dd MMM yy")}`
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>

        {/* ── Trigger button ─────────────────────────────────────────── */}
        <PopoverTrigger asChild>
          {showIconOnly ? (
            <Button id="date" variant="outline" size="icon" className="h-9 w-9">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Pick a date</span>
            </Button>
          ) : (
            <Button
              id="date"
              variant="outline"
              className={cn(
                "h-9 text-xs px-2.5 w-auto justify-start text-left font-normal bg-background",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{renderTriggerLabel()}</span>
            </Button>
          )}
        </PopoverTrigger>

        {/* ── Popover content ────────────────────────────────────────── */}
        <PopoverContent className="w-auto p-0 shadow-lg border rounded-lg" align="end">
          <div className="flex flex-col sm:flex-row">

            {/* ── Left sidebar: presets ─────────────────────────────── */}
            <div className="flex flex-col gap-0.5 border-b sm:border-b-0 sm:border-r p-2 min-w-[125px] bg-muted/20">
              {presetRanges.map((r) => (
                <Button
                  key={r.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-start text-xs font-normal h-7 px-2.5 rounded-md",
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
                  "justify-start text-xs font-normal h-7 px-2.5 mt-1 rounded-md",
                  activePreset === "custom" &&
                    "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => setActivePreset("custom")}
              >
                {activePreset === "custom" && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                Custom
              </Button>
            </div>

            {/* ── Right: header + calendars ─────────────────────────── */}
            <div className="flex flex-col">

              {/* ── Date/Time header row ──────────────────────────────── */}
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/10">
                {/* From */}
                <div className="flex flex-1 items-center gap-1.5 rounded border bg-background px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-xs tabular-nums text-muted-foreground select-none whitespace-nowrap">
                    {tempDate?.from ? format(tempDate.from, "dd MMM yyyy") : "-- / -- / ----"}
                  </span>
                  <div className="h-3 w-px bg-border shrink-0" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange("start", e.target.value)}
                    className="h-5 w-full min-w-[70px] border-0 p-0 text-xs shadow-none focus-visible:ring-0 text-center font-mono"
                  />
                </div>

                <span className="text-xs text-muted-foreground select-none">→</span>

                {/* To */}
                <div className="flex flex-1 items-center gap-1.5 rounded border bg-background px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-xs tabular-nums text-muted-foreground select-none whitespace-nowrap">
                    {tempDate?.to ? format(tempDate.to, "dd MMM yyyy") : "-- / -- / ----"}
                  </span>
                  <div className="h-3 w-px bg-border shrink-0" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleTimeChange("end", e.target.value)}
                    className="h-5 w-full min-w-[70px] border-0 p-0 text-xs shadow-none focus-visible:ring-0 text-center font-mono"
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
                className="p-2"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-2 sm:space-x-3 sm:space-y-0",
                  month: "space-y-2",
                  caption_label: "text-xs font-semibold",
                  nav_button: "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100",
                  head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[0.75rem]",
                  cell: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                  day: "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100 rounded-md",
                  row: "flex w-full mt-1",
                }}
              />

              {/* ── Footer ────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-1.5 border-t px-3 py-2 bg-muted/5">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs px-3"
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