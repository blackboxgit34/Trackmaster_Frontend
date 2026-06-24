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
import {
  subWeeks,
  isWithinInterval,
  startOfDay,
  endOfDay,
  format,
  parse,
  differenceInMinutes,
} from 'date-fns';
import DistanceReportToolbar from './reports/DistanceReportToolbar';
import {
  consolidatedReportTableData,
  workingHourDetails,
  actualVehicles,
  liveStatusData,
} from '@/data/mockData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Segment {
  type: 'moving' | 'halt';
  width: string;
  distance?: string;
  duration?: string;
  haltDuration?: string;
}

interface TimelineEntry {
  start: string;
  startLoc: string;
  end: string;
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
  endLocation: string;
  endTime: string;
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

/** Compute minutes between two "HH:mm" strings */
const minutesBetween = (start: string, end: string): number => {
  const base = new Date(2000, 0, 1);
  const s = parse(start, 'HH:mm', base);
  const e = parse(end, 'HH:mm', base);
  return differenceInMinutes(e, s);
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

  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(0);
  }, [dateRange, selectedVehicle]);

  // ── Filter daily records by date range & vehicle ──────────────────────────
  const filteredRecords = useMemo(() => {
    return consolidatedReportTableData.filter((r) => {
      const rDate = new Date(r.date);
      const inRange =
        dateRange?.from && dateRange?.to
          ? isWithinInterval(rDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })
          : true;
      const matchVehicle =
        selectedVehicle === 'all' || r.vehicleId === selectedVehicle;
      return inRange && matchVehicle;
    });
  }, [dateRange, selectedVehicle]);

  // ── Compute KPI Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalDistance = filteredRecords.reduce(
      (sum, r) => sum + (r.distance || 0),
      0,
    );

    // Unique active vehicles in this period
    const activeVehicleIds = new Set(filteredRecords.map((r) => r.vehicleId));
    const activeCount = activeVehicleIds.size;
    const totalFleet = actualVehicles.length;
    const avgDistPerVehicle =
      activeCount > 0 ? totalDistance / activeCount : 0;
    const utilization =
      totalFleet > 0
        ? Math.round((activeCount / totalFleet) * 100)
        : 0;

    // Peak hour bucket (count sessions per hour from workingHourDetails)
    const hourBuckets: Record<number, number> = {};
    const filteredSessionDates = new Set(filteredRecords.map((r) => r.date));
    const filteredVehicleIds =
      selectedVehicle === 'all'
        ? null
        : new Set([selectedVehicle]);

    workingHourDetails.forEach((s) => {
      if (!filteredSessionDates.has(s.date)) return;
      if (filteredVehicleIds && !filteredVehicleIds.has(s.vehicleId)) return;
      const hour = parseInt(s.startTime.split(':')[0], 10);
      hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
    });

    let peakHour = 10;
    let peakCount = 0;
    const totalSessions = Object.values(hourBuckets).reduce(
      (a, b) => a + b,
      0,
    );
    for (const [h, c] of Object.entries(hourBuckets)) {
      if (c > peakCount) {
        peakCount = c;
        peakHour = parseInt(h, 10);
      }
    }
    const peakEndHour = Math.min(peakHour + 4, 23);
    const peakPct =
      totalSessions > 0 ? Math.round((peakCount / totalSessions) * 100) : 0;

    // Previous period for trends (same duration, just shifted back)
    const daySpan =
      dateRange?.from && dateRange?.to
        ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
          (1000 * 60 * 60 * 24),
        ) + 1
        : 7;

    const prevFrom = dateRange?.from
      ? new Date(dateRange.from.getTime() - daySpan * 24 * 60 * 60 * 1000)
      : subWeeks(new Date(), 2);
    const prevTo = dateRange?.from
      ? new Date(dateRange.from.getTime() - 1)
      : subWeeks(new Date(), 1);

    const prevRecords = consolidatedReportTableData.filter((r) => {
      const rDate = new Date(r.date);
      return (
        isWithinInterval(rDate, {
          start: startOfDay(prevFrom),
          end: endOfDay(prevTo),
        }) &&
        (selectedVehicle === 'all' || r.vehicleId === selectedVehicle)
      );
    });

    const prevTotalDistance = prevRecords.reduce(
      (sum, r) => sum + (r.distance || 0),
      0,
    );
    const prevActiveVehicleIds = new Set(
      prevRecords.map((r) => r.vehicleId),
    );
    const prevActiveCount = prevActiveVehicleIds.size;
    const prevAvgDist =
      prevActiveCount > 0 ? prevTotalDistance / prevActiveCount : 0;
    const prevUtilization =
      totalFleet > 0
        ? Math.round((prevActiveCount / totalFleet) * 100)
        : 0;

    const trendDist =
      prevTotalDistance > 0
        ? ((totalDistance - prevTotalDistance) / prevTotalDistance) * 100
        : 0;
    const trendAvg =
      prevAvgDist > 0
        ? ((avgDistPerVehicle - prevAvgDist) / prevAvgDist) * 100
        : 0;
    const trendUtil = utilization - prevUtilization; // percentage point diff

    return [
      {
        label: 'Total Distance',
        value: totalDistance.toLocaleString('en-IN', {
          maximumFractionDigits: 1,
        }),
        unit: 'km',
        trend: `${trendDist >= 0 ? '+' : ''}${trendDist.toFixed(1)}%`,
        trendUp: trendDist >= 0,
        subtitle: `vs previous ${daySpan} days`,
        icon: Route,
        accent: '#2563eb',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        label: 'Avg Distance / Vehicle',
        value: avgDistPerVehicle.toLocaleString('en-IN', {
          maximumFractionDigits: 1,
        }),
        unit: 'km',
        trend: `${trendAvg >= 0 ? '+' : ''}${trendAvg.toFixed(1)}%`,
        trendUp: trendAvg >= 0,
        subtitle: `per active vehicle`,
        icon: Gauge,
        accent: '#7c3aed',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
      },
      {
        label: 'Fleet Utilization',
        value: String(utilization),
        unit: '%',
        trend: `${trendUtil >= 0 ? '+' : ''}${trendUtil.toFixed(1)}%`,
        trendUp: trendUtil >= 0,
        subtitle: `${activeCount} of ${totalFleet} vehicles active`,
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
  }, [filteredRecords, dateRange, selectedVehicle]);

  // ── Build per-vehicle report data ─────────────────────────────────────────
  const reportData: VehicleReportRow[] = useMemo(() => {
    // Group filtered records by vehicleId — keep ALL days, not just latest
    const vehicleMap = new Map<
      string,
      (typeof consolidatedReportTableData)[number][]
    >();
    filteredRecords.forEach((r) => {
      if (!vehicleMap.has(r.vehicleId)) vehicleMap.set(r.vehicleId, []);
      vehicleMap.get(r.vehicleId)!.push(r);
    });

    const rows: VehicleReportRow[] = [];
    let idCounter = 1;

    vehicleMap.forEach((records, vehicleId) => {
      // Sort records chronologically (oldest first)
      const sorted = [...records].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // Compute the date range string for this vehicle's data
      const earliestDate = sorted[0].date;
      const latestDate = sorted[sorted.length - 1].date;
      const dateDisplay =
        earliestDate === latestDate
          ? earliestDate
          : `${earliestDate} to ${latestDate}`;

      // Total distance across the entire selected range
      const totalDistanceKm = sorted.reduce(
        (sum, r) => sum + (r.distance || 0),
        0,
      );

      // Collect ALL working-hour sessions across ALL days in the range
      const allDates = new Set(sorted.map((r) => r.date));
      const allSessions = workingHourDetails
        .filter(
          (s) => s.vehicleId === vehicleId && allDates.has(s.date),
        )
        .sort((a, b) => {
          // Sort by date first, then by start time
          const dateCmp = a.date.localeCompare(b.date);
          if (dateCmp !== 0) return dateCmp;
          return a.startTime.localeCompare(b.startTime);
        });

      if (allSessions.length === 0) return; // skip vehicles with no sessions

      // Get live status
      const liveEntry = liveStatusData.find(
        (v) => v.vehicleNo === vehicleId,
      );
      const status = liveEntry?.status || 'Parked';
      
      let statusColor = 'bg-slate-400';
      let statusBg = 'bg-slate-100';
      let statusText = 'text-slate-700';
      let statusBorder = 'border-slate-200';

      switch (status) {
        case 'Moving':
          statusColor = 'bg-green-500'; statusBg = 'bg-green-50'; statusText = 'text-green-700'; statusBorder = 'border-green-200';
          break;
        case 'Parked':
          statusColor = 'bg-yellow-500'; statusBg = 'bg-yellow-50'; statusText = 'text-yellow-700'; statusBorder = 'border-yellow-200';
          break;
        case 'Ignition On':
          statusColor = 'bg-sky-500'; statusBg = 'bg-sky-50'; statusText = 'text-sky-700'; statusBorder = 'border-sky-200';
          break;
        case 'High Speed':
          statusColor = 'bg-orange-500'; statusBg = 'bg-orange-50'; statusText = 'text-orange-700'; statusBorder = 'border-orange-200';
          break;
        case 'Battery Disconnect':
          statusColor = 'bg-rose-500'; statusBg = 'bg-rose-50'; statusText = 'text-rose-700'; statusBorder = 'border-rose-200';
          break;
        case 'Towed':
          statusColor = 'bg-purple-500'; statusBg = 'bg-purple-50'; statusText = 'text-purple-700'; statusBorder = 'border-purple-200';
          break;
        case 'Unreachable':
          statusColor = 'bg-red-500'; statusBg = 'bg-red-50'; statusText = 'text-red-700'; statusBorder = 'border-red-200';
          break;
        case 'Breakdown':
          statusColor = 'bg-gray-500'; statusBg = 'bg-gray-50'; statusText = 'text-gray-700'; statusBorder = 'border-gray-200';
          break;
        case 'Idle':
          statusColor = 'bg-teal-500'; statusBg = 'bg-teal-50'; statusText = 'text-teal-700'; statusBorder = 'border-teal-200';
          break;
        default:
          statusColor = 'bg-slate-500'; statusBg = 'bg-slate-50'; statusText = 'text-slate-700'; statusBorder = 'border-slate-200';
          break;
      }

      // Vehicle info
      const vehicleInfo = actualVehicles.find((v) => v.id === vehicleId);
      const vehicleName = vehicleInfo
        ? `${vehicleInfo.model} #${vehicleInfo.id}`
        : vehicleId;

      // ── Build timeline & segments from sessions across ALL days ──────
      const timeline: TimelineEntry[] = [];
      const segments: Segment[] = [];
      let cumulativeKm = 0;
      let totalHalts = 0;
      let grandTotalDrivingMins = 0;

      // Group sessions by date for per-day processing
      const sessionsByDate = new Map<
        string,
        typeof allSessions
      >();
      allSessions.forEach((s) => {
        if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
        sessionsByDate.get(s.date)!.push(s);
      });

      // Get day-level distance from daily records for proportional distribution
      const distanceByDate = new Map<string, number>();
      sorted.forEach((r) => distanceByDate.set(r.date, r.distance || 0));

      // Process each day in order
      const dateKeys = [...sessionsByDate.keys()].sort();

      dateKeys.forEach((date, dateIdx) => {
        const daySessions = sessionsByDate.get(date)!;
        const dayDistanceKm = distanceByDate.get(date) || 0;
        const dayTotalDrivingHours = daySessions.reduce(
          (sum, s) => sum + s.duration,
          0,
        );

        // Elapsed span within the day for segment widths
        const dayFirstStart = daySessions[0].startTime;
        const dayLastEnd = daySessions[daySessions.length - 1].endTime;
        const dayElapsedMins = Math.max(
          minutesBetween(dayFirstStart, dayLastEnd),
          1,
        );

        // Add a day separator segment (thin gap) between days
        if (dateIdx > 0 && segments.length > 0) {
          segments.push({
            type: 'halt',
            width: '1.5%',
            haltDuration: `Overnight (${date})`,
          });
        }

        daySessions.forEach((session, idx) => {
          const drivingMins = Math.round(session.duration * 60);
          grandTotalDrivingMins += drivingMins;
          const segDistKm =
            dayTotalDrivingHours > 0
              ? (session.duration / dayTotalDrivingHours) * dayDistanceKm
              : 0;
          cumulativeKm += segDistKm;

          // Halt before this session within the same day
          if (idx > 0) {
            const prevEnd = daySessions[idx - 1].endTime;
            const haltMins = minutesBetween(prevEnd, session.startTime);
            if (haltMins > 0) {
              totalHalts++;
              const haltWidthPct = Math.max(
                (haltMins / dayElapsedMins) * 100 * (1 / dateKeys.length),
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

          // Moving segment — distribute width proportionally across all days
          const moveWidthPct = Math.max(
            (drivingMins / dayElapsedMins) * 100 * (1 / dateKeys.length),
            2,
          );
          segments.push({
            type: 'moving',
            width: `${moveWidthPct.toFixed(1)}%`,
            distance: `${segDistKm.toFixed(1)} km`,
            duration: formatDuration(session.duration),
          });

          // Halt duration (gap after this session, before next within same day)
          let haltDurationStr = '—';
          if (idx < daySessions.length - 1) {
            const nextStart = daySessions[idx + 1].startTime;
            const gapMins = minutesBetween(session.endTime, nextStart);
            haltDurationStr =
              gapMins >= 60
                ? `${Math.floor(gapMins / 60)}h ${gapMins % 60}m`
                : `${gapMins} mins`;
          }

          timeline.push({
            start: session.startTime,
            startLoc: session.location,
            end: session.endTime,
            endLoc:
              idx < daySessions.length - 1
                ? daySessions[idx + 1].location
                : `${session.location} (Last known)`,
            drivingDuration: formatDuration(session.duration),
            haltDuration: haltDurationStr,
            date: date,
            distance: `${segDistKm.toFixed(1)} km`,
            cumulative: `${cumulativeKm.toFixed(1)} km`,
            isLast:
              dateIdx === dateKeys.length - 1 &&
              idx === daySessions.length - 1,
          });
        });

        // Count halts within the day (gaps between sessions)
        if (daySessions.length > 1) {
          // Already counted above in the loop
        }
      });

      // Total duration across all days
      const totalDurationStr = formatDuration(grandTotalDrivingMins / 60);

      // First and last session across ALL days
      const firstSession = allSessions[0];
      const lastSession = allSessions[allSessions.length - 1];

      rows.push({
        id: idCounter++,
        vehicleId,
        status,
        statusColor,
        statusBg,
        statusText,
        statusBorder,
        vehicleName,
        date: dateDisplay,
        distance: Math.round(totalDistanceKm),
        duration: totalDurationStr,
        startLocation: firstSession.location,
        startTime: firstSession.startTime,
        endLocation:
          allSessions.length > 1
            ? lastSession.location
            : firstSession.location,
        endTime: lastSession.endTime,
        halts: totalHalts,
        segments,
        timeline,
      });
    });

    // Sort by distance descending (most active on top)
    rows.sort((a, b) => b.distance - a.distance);
    return rows;
  }, [filteredRecords]);

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
          onExportPDF={() => { }}
          onExportCSV={() => { }}
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
        {reportData.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No vehicle data found for the selected period.
          </div>
        )}
        {reportData.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((item) => (
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
                  <span className="text-xs font-medium text-slate-400">{item.startTime}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-blue-600">{item.endLocation}</span>
                  <span className="text-xs font-medium text-slate-400">{item.endTime}</span>
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
                        {showDateHeader && (
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
                                  <div className="flex flex-col min-w-[40px]">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</span>
                                    <span className="text-sm font-bold text-slate-900">{entry.start}</span>
                                  </div>
                                  <div className="h-6 w-px bg-slate-200"></div>
                                  <span className="text-sm text-slate-500">{entry.startLoc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col min-w-[40px]">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</span>
                                    <span className="text-sm font-bold text-slate-900">{entry.end}</span>
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
        {Math.ceil(reportData.length / itemsPerPage) > 1 && (
          <div className="flex items-center justify-between py-4">
            <span className="text-sm text-slate-500">
              Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, reportData.length)} of {reportData.length} vehicles
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-700 px-2">
                Page {currentPage + 1} of {Math.ceil(reportData.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(reportData.length / itemsPerPage) - 1, p + 1))}
                disabled={currentPage >= Math.ceil(reportData.length / itemsPerPage) - 1}
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