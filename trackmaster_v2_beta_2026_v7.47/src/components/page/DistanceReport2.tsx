import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Route,
  Gauge,
  Car,
  Clock,
  TrendingUp,
  TrendingDown,
  Hand,
  ChevronDown,
  ChevronUp,
  Pause,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, format, parse, differenceInMinutes, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import DistanceReportToolbar from './reports/DistanceReportToolbar';
import { useDistanceReportData } from '@/hooks/useDistanceReportData';
import { API_BASE_URL } from '@/config/Api';
import type { ReportSortKey } from '@/types/report-types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Segment {
  type: 'moving' | 'halt';
  width: string;
  distance?: string;
  duration?: string;
  haltDuration?: string;
}

interface TimelineEntry {
  start: string;      // "HH:mm" used for gap calculations
  startFull: string;  // full datetime for display e.g. "2026-06-17 08:30:00"
  startLoc: string;
  end: string;        // "HH:mm" used for gap calculations
  endFull: string;    // full datetime for display
  endLoc: string;
  drivingDuration: string;
  haltDuration: string;
  date: string;
  distance: string;
  cumulative: string;
  isLast: boolean;
}

interface VehicleReportRow {
  id: number;
  vehicleId: string;
  status: string;
  statusColor: string;
  statusBg: string;
  statusText: string;
  statusBorder: string;
  vehicleName: string;
  date: string;
  distance: number;
  duration: string;
  startLocation: string;
  startTime: string;
  startDateTime: string;
  endLocation: string;
  endTime: string;
  endDateTime: string;
  halts: number;
  segments: Segment[];
  timeline: TimelineEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a decimal-hours value like 2.75 into "2hrs 45min" */
const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}hrs`;
  return `${h}hrs ${m}min`;
};

// Month abbreviation → zero-padded month number
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalise any API datetime string to "YYYY-MM-DD HH:mm:ss".
 * Handles:
 *   "2026-06-17 08:30:00"  "2026-06-17T08:30:00"  (ISO – pass-through)
 *   "Jun 17 2026 01:08 PM"  "Jun 17 2026 01:08:00 PM"  (US locale format)
 *   "08:30:00"  "17"  (time-only / bare hour – returned as-is for extractTime)
 */
const normalizeDateTime = (value: string | number): string => {
  if (value === '' || value == null) return '';
  const str = String(value).trim();
  // Already ISO: "YYYY-MM-DD" or "YYYY-MM-DDTHH:…" or "YYYY-MM-DD HH:…"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.replace('T', ' ');
  // US locale: "Jun 17 2026 01:08 PM" or "Jun 17 2026 01:08:00 PM"
  const m = str.match(
    /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );
  if (m) {
    const [, mon, day, year, hour, min, sec = '00', ampm] = m;
    const mm = MONTH_MAP[mon.toLowerCase()] ?? '01';
    let h = parseInt(hour, 10);
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    return `${year}-${mm}-${day.padStart(2, '0')} ${String(h).padStart(2, '0')}:${min}:${sec}`;
  }
  return str;
};

/**
 * Extract "HH:mm" from any API datetime format (normalised first).
 *   "08:30"  "08:30:00"  "2026-06-20 08:30:00"  "Jun 17 2026 01:08 PM"
 *   bare hour "8" / "17" → "08:00" / "17:00"
 */
const extractTime = (value: string | number): string => {
  if (value === '' || value == null) return '00:00';
  const norm = normalizeDateTime(value);
  const parts = norm.split(' ');
  const timePart = parts.length > 1 ? parts[1] : parts[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(timePart)) return '00:00';
  if (timePart.length >= 5) return timePart.substring(0, 5);
  if (/^\d{1,2}$/.test(timePart)) return `${timePart.padStart(2, '0')}:00`;
  return timePart;
};

/** Extract "YYYY-MM-DD" date from any API datetime string; returns '' if not present */
const extractDate = (value: string | number): string => {
  if (value === '' || value == null) return '';
  const norm = normalizeDateTime(value);
  const parts = norm.split(' ');
  if (parts.length > 1) return parts[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return parts[0];
  return '';
};

/** Compute minutes between two "HH:mm" strings */
const minutesBetween = (start: string, end: string): number => {
  const base = new Date(2000, 0, 1);
  const s = parse(start, 'HH:mm', base);
  const e = parse(end, 'HH:mm', base);
  return differenceInMinutes(e, s);
};

/** Convert "HH:mm" 24-hour time to "hh:mm AM/PM" */
const to12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  let h = parseInt(time24.split(':')[0], 10);
  const m = time24.split(':')[1].substring(0, 2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

/** Extract and format only the time portion as "hh:mm AM/PM" */
const formatDisplayDateTime = (normalized: string): string => {
  if (!normalized) return '';
  const parts = normalized.split(' ');
  // "YYYY-MM-DD HH:mm:ss" → take the time part only
  const timePart = parts.length > 1 ? parts[1] : parts[0];
  if (timePart.includes(':')) return to12Hour(timePart.substring(0, 5));
  return normalized;
};

// ─── Segment Tooltip Component ───────────────────────────────────────────────

const SegmentTooltip: React.FC<{ segment: Segment }> = ({ segment }) => {
  const [show, setShow] = useState(false);

  const tooltipContent =
    segment.type === 'halt'
      ? segment.haltDuration
        ? `Halt: ${segment.haltDuration}`
        : 'Halt'
      : segment.distance && segment.duration
        ? `${segment.distance} · ${segment.duration}`
        : segment.distance
          ? segment.distance
          : 'Moving';

  return (
    <div
      className="relative h-full"
      style={{ width: segment.width }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div
        className={`h-full w-full ${segment.type === 'moving' ? 'bg-blue-600' : 'bg-slate-200'
          }`}
      />
      {show && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold shadow-lg border"
          style={{
            backgroundColor: segment.type === 'halt' ? '#1e293b' : '#2563eb',
            color: '#fff',
            borderColor: segment.type === 'halt' ? '#334155' : '#3b82f6',
          }}
        >
          {tooltipContent}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${segment.type === 'halt' ? '#1e293b' : '#2563eb'}`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const DistanceReport2 = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const itemsPerPage = 5;

  const [totalVehicleCount, setTotalVehicleCount] = useState(0);
  interface PeriodStats {
    currentTotal: number;
    currentActive: number;
    prevTotal: number;
    prevActive: number;
  }
  const [allPeriodsStats, setAllPeriodsStats] = useState<PeriodStats | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(true);

  // Fixed sort config — no sort UI in card view
  const sortConfig = useMemo(
    () => ({ key: 'vehicleId' as ReportSortKey, direction: 'asc' as const }),
    [],
  );

  const { reportRows, detailRows, totalRows, isLoading, handleExportPDF, handleExportExcel } =
    useDistanceReportData({
      dateRange,
      selectedVehicle,
      pageIndex,
      pageSize: itemsPerPage,
      sortConfig,
    });

  useEffect(() => {
    setPageIndex(0);
  }, [dateRange, selectedVehicle]);

  // Fetch total fleet count once
  useEffect(() => {
    const fetchVehicleCount = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = auth.custId;
        const res = await fetch(`${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`);
        const data = await res.json();
        setTotalVehicleCount((data.data || []).length);
      } catch (e) {
        console.error('Vehicle count fetch error', e);
      }
    };
    fetchVehicleCount();
  }, []);

  // Fetch current + previous period aggregate totals for KPI comparison
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    const fetchPeriodStats = async () => {
      setBadgesLoading(true);
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = Number(auth.custId ?? 0) || 0;

        const curFrom = startOfDay(dateRange.from!);
        const curTo = endOfDay(dateRange.to!);
        const dayCount = differenceInDays(curTo, curFrom) + 1;
        const prevFrom = subDays(curFrom, dayCount);
        const prevTo = subDays(curFrom, 1);

        const makeBody = (from: Date, to: Date) =>
          JSON.stringify({
            CustId: custId,
            iDisplayStart: 0,
            iDisplayLength: 9999,
            sortColumn: 'BBID',
            sortDirection: 'asc',
            sSearch: selectedVehicle && selectedVehicle !== 'all' ? selectedVehicle : undefined,
            beginDate: format(from, 'yyyy-MM-dd HH:mm:ss'),
            endDate: format(to, 'yyyy-MM-dd HH:mm:ss'),
          });

        const headers = { 'Content-Type': 'application/json' };
        const url = `${API_BASE_URL}/Reports/GetDistanceReportData`;

        const [curRes, prevRes] = await Promise.all([
          fetch(url, { method: 'POST', headers, body: makeBody(curFrom, curTo) }),
          fetch(url, { method: 'POST', headers, body: makeBody(prevFrom, endOfDay(prevTo)) }),
        ]);

        const [curJson, prevJson] = await Promise.all([curRes.json(), prevRes.json()]);

        const sumDist = (items: any[]) =>
          items.reduce((s: number, item: any) => {
            const d = parseFloat(String(item.Distance ?? item.distance ?? 0).replace(',', '.'));
            return s + (isFinite(d) ? d : 0);
          }, 0);

        const curItems = Array.isArray(curJson.data) ? curJson.data : [];
        const prevItems = Array.isArray(prevJson.data) ? prevJson.data : [];

        setAllPeriodsStats({
          currentTotal: sumDist(curItems),
          currentActive: Number(curJson.count) || curItems.length,
          prevTotal: sumDist(prevItems),
          prevActive: Number(prevJson.count) || prevItems.length,
        });
      } catch (e) {
        console.error('Period stats fetch error', e);
      } finally {
        setBadgesLoading(false);
      }
    };

    fetchPeriodStats();
  }, [dateRange, selectedVehicle]);

  // ── Compute KPI Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalDistance = allPeriodsStats?.currentTotal
      ?? reportRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    const activeCount = allPeriodsStats?.currentActive ?? totalRows;
    const avgDistPerVehicle = activeCount > 0 ? totalDistance / activeCount : 0;

    // Day count label
    const dayCount =
      dateRange?.from && dateRange?.to
        ? differenceInDays(endOfDay(dateRange.to), startOfDay(dateRange.from)) + 1
        : 7;

    // % change helpers
    const pctChange = (curr: number, prev: number): number | null =>
      prev > 0 ? ((curr - prev) / prev) * 100 : null;
    const fmtPct = (pct: number | null) =>
      pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

    const prevTotal = allPeriodsStats?.prevTotal ?? 0;
    const prevActive = allPeriodsStats?.prevActive ?? 0;
    const prevAvg = prevActive > 0 ? prevTotal / prevActive : 0;

    const distPct = allPeriodsStats ? pctChange(totalDistance, prevTotal) : null;
    const avgPct = allPeriodsStats ? pctChange(avgDistPerVehicle, prevAvg) : null;

    // Fleet utilization
    const fleetUtil =
      totalVehicleCount > 0
        ? Math.min(100, Math.round((activeCount / totalVehicleCount) * 100))
        : 0;
    const fleetSubtitle =
      totalVehicleCount > 0
        ? `${activeCount} of ${totalVehicleCount} vehicles active`
        : `${activeCount} vehicles active`;

    // Peak hour from session start times
    const hourBuckets: Record<number, number> = {};
    detailRows.forEach((s) => {
      const hour = parseInt(extractTime(s.startTime).split(':')[0], 10);
      if (!isNaN(hour)) hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
    });

    let peakHour = 10;
    let peakCount = 0;
    const totalSessions = Object.values(hourBuckets).reduce((a, b) => a + b, 0);
    for (const [h, c] of Object.entries(hourBuckets)) {
      if (c > peakCount) {
        peakCount = c;
        peakHour = parseInt(h, 10);
      }
    }
    const peakEndHour = Math.min(peakHour + 4, 23);
    const peakPct =
      totalSessions > 0 ? Math.round((peakCount / totalSessions) * 100) : 0;

    return [
      {
        label: 'Total Distance',
        value: totalDistance.toLocaleString('en-IN', { maximumFractionDigits: 1 }),
        unit: 'km',
        trend: fmtPct(distPct),
        trendUp: distPct === null || distPct >= 0,
        subtitle: `vs previous ${dayCount} days`,
        icon: Route,
        accent: '#2563eb',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        label: 'Avg Distance / Vehicle',
        value: avgDistPerVehicle.toLocaleString('en-IN', { maximumFractionDigits: 1 }),
        unit: 'km',
        trend: fmtPct(avgPct),
        trendUp: avgPct === null || avgPct >= 0,
        subtitle: 'per active vehicle',
        icon: Gauge,
        accent: '#7c3aed',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
      },
      {
        label: 'Fleet Utilization',
        value: `${fleetUtil}%`,
        unit: '',
        trend: fmtPct(
          allPeriodsStats && totalVehicleCount > 0
            ? pctChange(activeCount / totalVehicleCount, prevActive / totalVehicleCount)
            : null,
        ),
        trendUp: true,
        subtitle: fleetSubtitle,
        icon: Car,
        accent: '#f59e0b',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        label: 'Peak Activity',
        value: `${String(peakHour).padStart(2, '0')}:00`,
        unit: `–${String(peakEndHour).padStart(2, '0')}:00`,
        trend: `${peakPct}%`,
        trendUp: true,
        subtitle: `${peakPct}% of trips in this window`,
        icon: Clock,
        accent: '#10b981',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
    ];
  }, [reportRows, detailRows, totalRows, allPeriodsStats, totalVehicleCount, dateRange]);

  // ── Build per-vehicle report data ─────────────────────────────────────────
  const reportData: VehicleReportRow[] = useMemo(() => {
    const rows: VehicleReportRow[] = [];
    let idCounter = 1;

    // Fallback date label from the selected filter range
    const filterDateDisplay =
      dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`
        : dateRange?.from
          ? format(dateRange.from, 'dd MMM yyyy')
          : 'N/A';

    reportRows.forEach((row) => {
      // Sort by full datetime string so multi-day sessions are in correct order
      const vehicleSessions = detailRows
        .filter((d) => d.vehicleId === row.vehicleId)
        .sort((a, b) =>
          normalizeDateTime(a.startTime).localeCompare(normalizeDateTime(b.startTime)),
        );

      const timeline: TimelineEntry[] = [];
      const segments: Segment[] = [];
      let cumulativeKm = 0;
      let totalHalts = 0;
      let grandTotalDrivingMins = 0;

      if (vehicleSessions.length > 0) {
        // Group sessions by date so halt gaps and widths are per-day accurate
        const sessionsByDate = new Map<string, typeof vehicleSessions>();
        vehicleSessions.forEach((s) => {
          const d = extractDate(s.startTime) || 'unknown';
          if (!sessionsByDate.has(d)) sessionsByDate.set(d, []);
          sessionsByDate.get(d)!.push(s);
        });
        const dateKeys = [...sessionsByDate.keys()].sort();
        const numDays = Math.max(dateKeys.length, 1);

        dateKeys.forEach((date, dateIdx) => {
          const daySessions = sessionsByDate.get(date)!;

          // Per-day elapsed span for proportional segment widths
          const dayFirstStart = extractTime(daySessions[0].startTime);
          const dayLastEnd = extractTime(daySessions[daySessions.length - 1].endTime);
          const dayElapsedMins = Math.max(minutesBetween(dayFirstStart, dayLastEnd), 1);

          // Thin overnight separator between days in the progress bar
          if (dateIdx > 0 && segments.length > 0) {
            segments.push({
              type: 'halt',
              width: '1.5%',
              haltDuration: `Overnight → ${date}`,
            });
          }

          daySessions.forEach((session, idx) => {
            const drivingMins = Math.round(session.duration * 60);
            grandTotalDrivingMins += drivingMins;
            const segDistKm = (session as any).sessionDistance ?? 0;
            cumulativeKm += segDistKm;

            const sessionStart = extractTime(session.startTime);
            const sessionEnd = extractTime(session.endTime);

            // Within-day halt before this session
            if (idx > 0) {
              const prevEnd = extractTime(daySessions[idx - 1].endTime);
              const haltMins = Math.max(minutesBetween(prevEnd, sessionStart), 0);
              if (haltMins > 0) {
                totalHalts++;
                const haltWidthPct = Math.max(
                  (haltMins / dayElapsedMins) * 100 * (1 / numDays),
                  1.5,
                );
                segments.push({
                  type: 'halt',
                  width: `${haltWidthPct.toFixed(1)}%`,
                  haltDuration:
                    haltMins >= 60
                      ? `${Math.floor(haltMins / 60)}h ${haltMins % 60}m`
                      : `${haltMins} mins`,
                });
              }
            }

            // Moving segment scaled proportionally per day
            const moveWidthPct = Math.max(
              (drivingMins / dayElapsedMins) * 100 * (1 / numDays),
              2,
            );
            segments.push({
              type: 'moving',
              width: `${moveWidthPct.toFixed(1)}%`,
              distance: `${segDistKm.toFixed(1)} km`,
              duration: formatDuration(session.duration),
            });

            // Halt duration = gap to next session within the same day only
            // Cross-day boundary → show '—'
            let haltDurationStr = '—';
            if (idx < daySessions.length - 1) {
              const nextStart = extractTime(daySessions[idx + 1].startTime);
              const gapMins = Math.max(minutesBetween(sessionEnd, nextStart), 0);
              if (gapMins > 0) {
                haltDurationStr =
                  gapMins >= 60
                    ? `${Math.floor(gapMins / 60)}h ${gapMins % 60}m`
                    : `${gapMins} mins`;
              }
            }

            const isVeryLast =
              dateIdx === dateKeys.length - 1 &&
              idx === daySessions.length - 1;

            timeline.push({
              start: sessionStart,
              startFull: normalizeDateTime(session.startTime),
              startLoc: session.location,
              end: sessionEnd,
              endFull: normalizeDateTime(session.endTime),
              endLoc:
                idx < daySessions.length - 1
                  ? daySessions[idx + 1].location
                  : isVeryLast
                    ? `${session.location} (Last known)`
                    : session.location,
              drivingDuration: formatDuration(session.duration),
              haltDuration: haltDurationStr,
              date: extractDate(session.startTime),
              distance: `${segDistKm.toFixed(1)} km`,
              cumulative: `${cumulativeKm.toFixed(1)} km`,
              isLast: isVeryLast,
            });
          });
        });
      }

      const firstSession = vehicleSessions[0];
      const lastSession = vehicleSessions[vehicleSessions.length - 1];

      // Compute actual trip date range from session data; fall back to filter range
      const sessionDates = vehicleSessions
        .map((s) => extractDate(s.startTime))
        .filter((d) => d !== '');
      const firstDate = sessionDates[0] ?? '';
      const lastDate = sessionDates[sessionDates.length - 1] ?? '';
      const vehicleDateDisplay = firstDate
        ? firstDate === lastDate
          ? firstDate
          : `${firstDate} to ${lastDate}`
        : filterDateDisplay;

      rows.push({
        id: idCounter++,
        vehicleId: row.vehicleId,
        status: 'Active',
        statusColor: 'bg-green-500',
        statusBg: 'bg-green-50',
        statusText: 'text-green-700',
        statusBorder: 'border-green-200',
        vehicleName: row.vehicleName || row.vehicleId,
        date: vehicleDateDisplay,
        distance: Math.round(row.distance),
        duration: formatDuration(grandTotalDrivingMins / 60),
        startLocation: firstSession?.location ?? '',
        startTime: firstSession ? extractTime(firstSession.startTime) : '',
        startDateTime: firstSession ? normalizeDateTime(firstSession.startTime) : '',
        endLocation: lastSession ? lastSession.location : (firstSession?.location ?? ''),
        endTime: lastSession ? extractTime(lastSession.endTime) : '',
        endDateTime: lastSession ? normalizeDateTime(lastSession.endTime) : '',
        halts: totalHalts,
        segments,
        timeline,
      });
    });

    return rows;
  }, [reportRows, detailRows, dateRange]);

  const totalPages = Math.ceil(totalRows / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Distance Report
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Comprehensive operational view of fleet movement and activity.
          </p>
        </div>

        <DistanceReportToolbar
           dateRange={dateRange}
           setDateRange={setDateRange}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportExcel}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.label}
              className="
                group
                relative
                overflow-hidden
                border
                border-slate-200/80
                bg-gradient-to-br
                from-white
                to-slate-50/50
                shadow-sm
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-lg
              "
            >
              {/* Accent Bar */}
              <div
                className="absolute left-0 top-0 h-1 w-full"
                style={{
                  backgroundColor: card.accent,
                }}
              />

              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>

                    {badgesLoading ? (
                      <div className="mt-4 flex items-center h-12">
                        <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-blue-500 rounded-full" />
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 flex items-end gap-1">
                          <span className="text-3xl font-bold leading-none tracking-tight text-slate-900">
                            {card.value}
                          </span>

                          <span className="mb-1 text-sm font-medium text-slate-500">
                            {card.unit}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1 text-xs font-semibold ${card.trendUp
                              ? 'text-emerald-600'
                              : 'text-red-500'
                              }`}
                          >
                            {card.trendUp ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}

                            <span>{card.trend}</span>
                          </div>

                          <span className="text-xs text-slate-400">
                            {card.subtitle}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`
                      ml-4
                      flex
                      h-10
                      w-10
                      flex-shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${card.iconBg}
                      transition-transform
                      duration-300
                      group-hover:scale-110
                    `}
                  >
                    <Icon
                      className={`h-5 w-5 ${card.iconColor}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* List Section */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12 rounded-xl border border-slate-200 bg-white">
            <div className="animate-spin h-6 w-6 border-2 border-slate-200 border-t-blue-600 rounded-full" />
            <span className="ml-3 text-sm text-slate-400">Loading vehicles...</span>
          </div>
        )}
        {!isLoading && reportData.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No vehicle data found for the selected period.
          </div>
        )}
        {!isLoading && reportData.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md"
          >
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {item.vehicleId}
                </span>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.statusBg} ${item.statusText} ${item.statusBorder}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${item.statusColor}`} />
                  {item.status}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Clock className="h-4 w-4" />
                {item.date}
              </div>
            </div>

            {/* Title and Stats Row */}
            <div className="mt-2 flex items-start justify-between">
              <h3 className="text-xl font-bold text-slate-900">{item.vehicleName}</h3>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-bold text-blue-600">{item.distance}</span>
                  <span className="text-sm font-semibold text-blue-600">km</span>
                </div>
                <p className="text-xs font-medium text-slate-400">{item.duration}</p>
              </div>
            </div>

            {/* Timeline Row */}
            <div className="mt-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-600">{item.startLocation}</span>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{item.startDateTime ? formatDisplayDateTime(item.startDateTime) : item.startTime}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-blue-600">{item.endLocation}</span>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{item.endDateTime ? formatDisplayDateTime(item.endDateTime) : item.endTime}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="flex h-1.5 w-full overflow-visible rounded-full bg-slate-100 relative">
                {item.segments.map((segment, idx) => (
                  <SegmentTooltip key={idx} segment={segment} />
                ))}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Hand className="h-4 w-4" />
                {item.halts} Halts
              </div>
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {expandedId === item.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>

             {/* Dropdown Content */}
            {expandedId === item.id && item.timeline && item.timeline.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h4 className="text-[10px] font-bold text-slate-900 mb-2 uppercase tracking-wider">Activity Timeline</h4>
                <div className="relative pl-6 space-y-1 max-h-80 overflow-y-auto pr-1">
                  {item.timeline.map((entry, idx) => {
                    // Show a date header when the date changes
                    const prevDate = idx > 0 ? item.timeline[idx - 1].date : null;
                    const showDateHeader = idx === 0 || entry.date !== prevDate;

                    return (
                      <React.Fragment key={idx}>
                        {showDateHeader && entry.date && (
                          <div className="flex items-center gap-2 py-1.5">
                            <div className="h-px flex-1 bg-blue-200/60" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                              {entry.date}
                            </span>
                            <div className="h-px flex-1 bg-blue-200/60" />
                          </div>
                        )}
                        <div className="relative">
                          {/* Top half line */}
                          {idx !== 0 && entry.date === prevDate && (
                            <div className="absolute -left-[12px] top-0 bottom-1/2 w-[2px] bg-slate-200"></div>
                          )}
                          {/* Bottom half line */}
                          {idx !== item.timeline.length - 1 && entry.date === item.timeline[idx + 1]?.date && (
                            <div className="absolute -left-[12px] top-1/2 -bottom-1 w-[2px] bg-slate-200"></div>
                          )}

                          {/* Timeline Dot */}
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full z-10"></div>

                          {/* Timeline Card */}
                          <div className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:border-blue-600/30 transition-colors py-1 px-3">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">

                              {/* Column 1: Locations & Times */}
                              <div className="lg:col-span-4 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col min-w-[130px]">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</span>
                                    <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{formatDisplayDateTime(entry.startFull)}</span>
                                  </div>
                                  <div className="h-6 w-px bg-slate-200"></div>
                                  <span className="text-sm text-slate-500">{entry.startLoc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col min-w-[130px]">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</span>
                                    <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{formatDisplayDateTime(entry.endFull)}</span>
                                  </div>
                                  <div className="h-6 w-px bg-slate-200"></div>
                                  <span className="text-sm text-slate-500">{entry.endLoc}</span>
                                </div>
                              </div>

                              {/* Columns 2 & 3: Durations */}
                              <div className="lg:col-span-5 grid grid-cols-2 gap-2 border-l border-slate-200 pl-3 py-0.5">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-blue-50 rounded-lg">
                                    <Clock className="text-blue-600 text-[18px] h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500">Driving duration</div>
                                    <div className="text-sm font-bold text-slate-900">{entry.drivingDuration}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-orange-50 rounded-lg">
                                    <Pause className="text-orange-600 text-[18px] h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500">Halt Duration</div>
                                    <div className="text-sm font-bold text-slate-900">{entry.haltDuration}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 4: Distances */}
                              <div className="lg:col-span-3 text-right flex flex-col justify-center border-l border-slate-200 pl-3 py-0.5">
                                <div className="flex items-center justify-end gap-1 text-slate-400 mb-0">
                                  <Clock className="text-[14px] h-3 w-3" />
                                  <span className="text-[10px] font-normal">{entry.date}</span>
                                </div>
                                <div className="mb-1 mt-0.5">
                                  <div className="text-base font-bold text-blue-600 leading-none">{entry.distance}</div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Distance Travelled</div>
                                </div>
                                <div className="pt-1 border-t border-slate-200/60">
                                  <div className="text-sm font-bold text-slate-900 leading-none">{entry.cumulative}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Cumulative distance</div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <span className="text-sm text-slate-500">
              Showing {pageIndex * itemsPerPage + 1} to {Math.min((pageIndex + 1) * itemsPerPage, totalRows)} of {totalRows} vehicles
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-700 px-2">
                Page {pageIndex + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistanceReport2;
