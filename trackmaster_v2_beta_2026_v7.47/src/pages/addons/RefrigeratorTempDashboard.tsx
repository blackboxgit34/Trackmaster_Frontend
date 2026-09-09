import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Filter,
  Phone,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceArea, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { actualVehicles } from '@/data/mockData';
import { eachHourOfInterval } from 'date-fns';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { useSettings } from '@/context/SettingsContext';
import { formatAppDate, formatAppTime, formatAppDateTime } from '@/lib/date-utils';

// --- MOCK DATA GENERATION ---
const reeferVehicles = actualVehicles.filter((v, i) => v.type === 'Reefer' || i % 4 === 0).map((v, i) => {
  const setPoint = i % 2 === 0 ? -18 : 2;
  const minSafe = setPoint === -18 ? -22 : 0;
  const maxSafe = setPoint === -18 ? -15 : 5;
  const currentTemp = setPoint + (Math.random() * 4 - 1.5);
  const relativeHumidity = Math.floor(Math.random() * (85 - 40 + 1)) + 40;

  let status: 'COMPLIANT' | 'WARNING' | 'CRITICAL' = 'COMPLIANT';
  if (currentTemp > maxSafe + 1 || currentTemp < minSafe - 1) status = 'CRITICAL';
  else if (currentTemp > maxSafe || currentTemp < minSafe) status = 'WARNING';

  const movementStatus: 'MOVING' | 'STOPPED' | 'IDLING' = i % 3 === 0 ? 'MOVING' : i % 3 === 1 ? 'STOPPED' : 'IDLING';
  const speed = movementStatus === 'MOVING' ? Math.floor(Math.random() * 45 + 35) : 0;

  const minSafeHum = 45;
  const maxSafeHum = 80;
  const hasDoorSensor = i % 4 !== 3;

  return {
    ...v,
    setPoint,
    minSafe,
    maxSafe,
    minSafeHum,
    maxSafeHum,
    hasDoorSensor,
    currentTemp: parseFloat(currentTemp.toFixed(1)),
    highestTemp: parseFloat((setPoint + Math.random() * 5).toFixed(1)),
    lowestTemp: parseFloat((setPoint - Math.random() * 3).toFixed(1)),
    relativeHumidity,
    status,
    movementStatus,
    speed,
  };
});

const allVehiclesOption = { value: 'all', label: 'All Reefer Units' };
const reeferComboboxOptions = [allVehiclesOption, ...reeferVehicles.map(v => ({ value: v.id, label: v.name }))];

// --- LIVE ALERTS SIMULATION TYPES ---
type AlertSeverity = 'CRITICAL' | 'WARNING';
interface TempAlert {
  id: string;
  vehicleId: string;
  route: string;
  currentTemp: number;
  minSafe: number;
  maxSafe: number;
  message: string;
  timeStr: string;
  driver: string;
  severity: AlertSeverity;
  isNew?: boolean;
}

// --- CUSTOM DOT FOR CHART EXCURSIONS ---
const CustomizedTempDot = (props: { cx?: number, cy?: number, payload?: { isIssue?: boolean; isAllUnits?: boolean } }) => {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  if (payload.isIssue) {
    return (
      <g key={`temp-dot-${cx}-${cy}`}>
        {/* Static aura for temperature threshold violation */}
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="#ef4444"
          fillOpacity={0.4}
        />
        {/* Red Outer Violation Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={5.5}
          fill="#ef4444"
          stroke="hsl(var(--background))"
          strokeWidth={1.5}
        />
        {/* Inner White Core */}
        <circle
          cx={cx}
          cy={cy}
          r={2}
          fill="#ffffff"
        />
      </g>
    );
  }

  if (payload.isAllUnits) {
    return <circle cx={cx} cy={cy} r={2.5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1} />;
  }

  return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1.5} />;
};

// --- CUSTOM ACTIVE DOT ON HOVER ---
const CustomActiveDot = (props: { cx?: number, cy?: number, payload?: { isIssue?: boolean } }) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;

  if (payload?.isIssue) {
    return (
      <g key={`active-dot-${cx}-${cy}`}>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="#ef4444"
          fillOpacity={0.3}
        />
        <circle
          cx={cx}
          cy={cy}
          r={7.5}
          fill="#dc2626"
          stroke="#ffffff"
          strokeWidth={2.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#ffffff"
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="hsl(var(--primary))"
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
};

// --- CUSTOM TOOLTIP & LEGEND FOR GRAPH ---
const CustomGraphTooltip = ({ active, payload }: { active?: boolean, payload?: { payload: Record<string, unknown> }[] }) => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isAll = Boolean(data.isAllUnits);
    const isIssue = Boolean(data.isIssue);
    const deviation = data.deviation as number | undefined;

    const formattedDateTime = data.timestamp
      ? formatAppDateTime(data.timestamp as number, timeFormat)
      : (data.date ? `${data.date as string}, ${data.time as string}` : (data.time as string));

    return (
      <div className={cn(
        "rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl min-w-[210px] space-y-2 transition-all",
        isIssue ? "border-red-500/60 bg-red-500/10 dark:bg-red-950/40" : "border-border"
      )}>
        <div className="flex justify-between items-center border-b pb-1 gap-2">
          <p className="font-bold text-xs text-foreground">{formattedDateTime}</p>
          {isAll ? (
            <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">Fleet Overview</span>
          ) : (
            <span className="text-[10px] text-muted-foreground font-medium">Setpoint: {data.setPoint as number}°C</span>
          )}
        </div>

        {isAll ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Fleet Avg Temp:</span>
              <span className="font-bold text-primary">{(data.temp as number)?.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Avg Humidity:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{(data.humidity as number)?.toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Temperature:</span>
              <span className={cn("font-bold text-xs", isIssue ? "text-red-600 dark:text-red-400 font-extrabold" : "text-foreground")}>
                {(data.temp as number)?.toFixed(1)}°C
              </span>
            </div>
            {isIssue && (
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground text-[11px]">Deviation:</span>
                <span className="font-bold text-[11px] text-red-600 dark:text-red-400">
                  {deviation !== undefined ? (deviation > 0 ? `+${deviation.toFixed(1)}` : `${deviation.toFixed(1)}`) : '0.0'}°C
                </span>
              </div>
            )}
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Temp. Range:</span>
              <span className="text-[11px] font-medium text-muted-foreground">{data.minSafe as number}°C to {data.maxSafe as number}°C</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Humidity:</span>
              <span className="font-semibold text-foreground text-[11px]">{(data.humidity as number)?.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-[11px]">Humidity Range:</span>
              <span className="text-[11px] font-medium text-muted-foreground">{(data.minSafeHum as number) ?? 45}% to {(data.maxSafeHum as number) ?? 80}%</span>
            </div>
            <div className="pt-1.5 border-t border-border/60 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
              <div>AC: <span className="font-semibold text-foreground">{(data.acStatus || data.compressor) as string}</span></div>
              <div>Door: <span className={cn("font-semibold", data.door === 'Not Installed' ? "text-muted-foreground font-normal italic" : "text-foreground")}>{data.door as string}</span></div>
            </div>
          </div>
        )}

        {isIssue && (
          <p className="text-[10px] text-red-600 dark:text-red-400 font-bold pt-1 border-t border-red-500/30 flex items-center gap-1 animate-pulse">
            ⚠️ Temp Excursion Violation Detected
          </p>
        )}
      </div>
    );
  }
  return null;
};

const CustomGraphLegend = ({ data, isAllUnits }: { data: Array<Record<string, unknown>>; isAllUnits?: boolean }) => {
  if (!data || data.length === 0) return null;
  const avgTemp = data.reduce((acc, curr) => acc + (curr.temp as number || 0), 0) / data.length;
  const avgHum = data.reduce((acc, curr) => acc + (curr.humidity as number || 0), 0) / data.length;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 pb-1.5 text-xs text-muted-foreground">
      {!isAllUnits ? (
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 bg-emerald-500/20 border border-emerald-500/40 rounded-sm" />
          <span className="text-[10px]">Safe Target Band</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 bg-blue-500/20 rounded-sm border border-blue-500/40" />
          <span className="text-[10px]">Fleet Temp Range</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-3 bg-primary" />
        <span className="text-[10px]">{isAllUnits ? 'Fleet Avg Temp' : 'Recorded Temp'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500 border border-background" />
        <span className="text-[10px]">Excursion</span>
      </div>
      <div className="flex items-center gap-1.5 border-r border-border pr-4">
        <div className="h-2.5 w-2.5 rounded-sm bg-cyan-500/20 border border-cyan-500" />
        <span className="text-[10px]">Humidity</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]">Avg Temp:</span>
        <span className="font-bold text-foreground text-[11px]">{avgTemp.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]">Avg Hum:</span>
        <span className="font-bold text-foreground text-[11px]">{avgHum.toFixed(1)}%</span>
      </div>
    </div>
  );
};

const RefrigeratorTempDashboard = () => {
  const { uiSettings } = useSettings();
  const timeFormat = uiSettings?.timeFormat ?? '12h';

  const [selectedVehicle, setSelectedVehicle] = useState('all');

  // Graph State
  const [graphSortOrder, setGraphSortOrder] = useState<'asc' | 'desc' | 'default'>('default');
  const [timeRangeHours, setTimeRangeHours] = useState<6 | 12 | 24>(24);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollGraph = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Live Alerts State
  const [liveAlerts, setLiveAlerts] = useState<TempAlert[]>([
    {
      id: 'initial-1',
      vehicleId: 'MH-12-RS-1102',
      route: 'Dairy Route B',
      currentTemp: 8.2,
      minSafe: 2.0,
      maxSafe: 4.0,
      message: 'Excursion detected on MH-12-RS-1102. Temp exceeded limits for > 15 mins.',
      timeStr: '10 mins ago',
      driver: 'M. Johnson',
      severity: 'CRITICAL',
      isNew: false,
    },
    {
      id: 'initial-2',
      vehicleId: 'MH-04-CB-1084',
      route: 'Frozen Meat Express',
      currentTemp: -15.5,
      minSafe: -20.0,
      maxSafe: -18.0,
      message: 'Defrost cycle prolonged on MH-04-CB-1084. Monitor closely.',
      timeStr: '45 mins ago',
      driver: 'System Auto-Alert',
      severity: 'WARNING',
      isNew: false,
    }
  ]);

  // Simulate incoming live alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const isCritical = Math.random() > 0.6;
      const v = reeferVehicles[Math.floor(Math.random() * reeferVehicles.length)];

      const newAlert: TempAlert = {
        id: Math.random().toString(36).substring(7),
        vehicleId: `#${v.id}`,
        route: `Route ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
        currentTemp: parseFloat((v.maxSafe + (isCritical ? 3.2 : 0.8)).toFixed(1)),
        minSafe: v.minSafe,
        maxSafe: v.maxSafe,
        message: isCritical
          ? `Excursion detected on #${v.id}. Temp exceeded limits for > 15 mins.`
          : `Defrost cycle prolonged on #${v.id}. Monitor closely.`,
        timeStr: 'Just now',
        driver: isCritical ? 'A. Smith' : 'System Auto-Alert',
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        isNew: true,
      };

      setLiveAlerts(prev => {
        const markedOld = prev.map(p => ({ ...p, isNew: false }));
        return [newAlert, ...markedOld].slice(0, 6);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - timeRangeHours * 60 * 60 * 1000);
    const hours = eachHourOfInterval({ start, end: end > start ? end : new Date(start.getTime() + 1) });

    const isAllUnits = selectedVehicle === 'all';

    const data = hours.map((hour, idx) => {
      const hourOfDay = hour.getHours();

      if (isAllUnits) {
        const vehicleTemps = reeferVehicles.map((v, i) => {
          const base = v.setPoint;
          const isExcursion = (idx + i) % 7 === 0;
          const excursionOffset = isExcursion ? (v.maxSafe - v.setPoint + 1.2) : 0;
          const fluctuation = Math.sin((hourOfDay + i) / 24 * Math.PI) * 1.8 + (Math.random() * 1.2 - 0.6) + excursionOffset;
          return parseFloat((base + fluctuation).toFixed(1));
        });

        const fleetMin = Math.min(...vehicleTemps);
        const fleetMax = Math.max(...vehicleTemps);
        const fleetAvg = parseFloat((vehicleTemps.reduce((a, b) => a + b, 0) / vehicleTemps.length).toFixed(1));

        const humFluctuation = Math.cos(hourOfDay / 24 * Math.PI) * 5 + (Math.random() * 4 - 2);
        const humidity = Math.max(0, Math.min(100, parseFloat((62 + humFluctuation).toFixed(1))));

        return {
          time: formatAppTime(hour, timeFormat),
          date: formatAppDate(hour),
          timestamp: hour.getTime(),
          temp: fleetAvg,
          fleetMin,
          fleetMax,
          fleetRange: [fleetMin, fleetMax],
          humidity,
          isAllUnits: true,
          isIssue: vehicleTemps.some((t, i) => t > reeferVehicles[i].maxSafe || t < reeferVehicles[i].minSafe)
        };
      }

      const targetVehicle = reeferVehicles.find(v => v.id === selectedVehicle) || reeferVehicles[0];
      const baseTemp = targetVehicle.setPoint;
      const baseHum = targetVehicle.relativeHumidity;

      const acStatus = idx % 5 === 0 ? 'Standby/Defrost' : 'Active';
      const hasDoorSensor = targetVehicle.hasDoorSensor ?? true;
      const doorStatus = !hasDoorSensor ? 'Not Installed' : (idx % 9 === 0 ? 'Open' : 'Closed');

      // Simulate threshold violation spikes during Standby/Defrost or Door Open events
      let excursionOffset = 0;
      if (acStatus === 'Standby/Defrost') {
        excursionOffset = (targetVehicle.maxSafe - targetVehicle.setPoint) + 1.2;
      } else if (doorStatus === 'Open') {
        excursionOffset = (targetVehicle.maxSafe - targetVehicle.setPoint) + 0.8;
      }

      const fluctuation = Math.sin(hourOfDay / 24 * Math.PI) * 1.5 + (Math.random() * 1.2 - 0.6) + excursionOffset;
      const temp = parseFloat((baseTemp + fluctuation).toFixed(1));

      const humFluctuation = Math.cos(hourOfDay / 24 * Math.PI) * 5 + (Math.random() * 4 - 2);
      const humidity = Math.max(0, Math.min(100, parseFloat((baseHum + humFluctuation).toFixed(1))));

      const isIssue = temp > targetVehicle.maxSafe || temp < targetVehicle.minSafe;

      return {
        time: formatAppTime(hour, timeFormat),
        date: formatAppDate(hour),
        timestamp: hour.getTime(),
        temp,
        humidity,
        setPoint: targetVehicle.setPoint,
        minSafe: targetVehicle.minSafe,
        maxSafe: targetVehicle.maxSafe,
        minSafeHum: targetVehicle.minSafeHum,
        maxSafeHum: targetVehicle.maxSafeHum,
        deviation: parseFloat((temp - targetVehicle.setPoint).toFixed(1)),
        acStatus,
        compressor: acStatus,
        door: doorStatus,
        isAllUnits: false,
        isIssue
      };
    });

    if (graphSortOrder === 'asc') return [...data].sort((a, b) => a.temp - b.temp);
    if (graphSortOrder === 'desc') return [...data].sort((a, b) => b.temp - a.temp);
    return data;
  }, [selectedVehicle, graphSortOrder, timeRangeHours, timeFormat]);

  const tempDomain = useMemo(() => {
    if (!chartData.length) return [-30, 20];
    const temps = chartData.flatMap(d => d.isAllUnits ? [d.fleetMin ?? d.temp, d.fleetMax ?? d.temp] : [d.temp, d.minSafe ?? d.temp, d.maxSafe ?? d.temp]);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const low = Math.floor((min - 3) / 5) * 5;
    const high = Math.ceil((max + 3) / 5) * 5;
    return [low, high];
  }, [chartData]);

  const stats = useMemo(() => {
    const data = selectedVehicle === 'all' ? reeferVehicles : reeferVehicles.filter(v => v.id === selectedVehicle);
    const compliantCount = data.filter(v => v.status === 'COMPLIANT').length;
    const criticalCount = data.filter(v => v.status === 'CRITICAL').length;
    const avgTemp = data.reduce((sum, v) => sum + v.currentTemp, 0) / (data.length || 1);

    return {
      total: data.length,
      complianceRate: data.length > 0 ? Math.round((compliantCount / data.length) * 100) : 0,
      criticalCount: criticalCount + liveAlerts.filter(a => a.severity === 'CRITICAL').length,
      avgTemp: avgTemp.toFixed(1),
    };
  }, [selectedVehicle, liveAlerts]);

  const Y_AXIS_WIDTH = 55;

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="space-y-4 max-w-full overflow-hidden">

        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-1">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight leading-tight">Fleet Temperature Overview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Live monitoring for active refrigerated units. Last updated: Just now.</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">

            <VehicleCombobox
              vehicles={reeferComboboxOptions}
              value={selectedVehicle}
              onChange={setSelectedVehicle}
              className="w-[140px] h-8 text-xs shadow-sm"
            />

            <Button className="h-8 text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground">
              <Filter className="h-3.5 w-3.5 mr-1.5" /> Apply
            </Button>
            <Button variant="outline" className="h-8 text-xs shadow-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">

          {/* LEFT COLUMN: Stats + Chart (spans 8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-3 flex flex-col justify-center min-h-[90px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Overall Compliance</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-bold text-foreground leading-none">{stats.complianceRate}%</span>
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center h-4">
                      <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> 2%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-3 flex flex-col justify-center min-h-[90px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Active Refrigerators</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-bold text-foreground leading-none">{stats.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-red-500/20 bg-red-50 dark:bg-red-500/10">
                <CardContent className="p-3 flex flex-col justify-center min-h-[90px] relative">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <AlertTriangle className="h-3 w-3" /> Critical Alerts (24h)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 leading-none">{stats.criticalCount}</span>
                    {liveAlerts[0]?.isNew && (
                      <span className="text-[9px] font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full flex items-center h-4 animate-pulse border border-red-200 dark:border-red-500/30">
                        +1 new
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-3 flex flex-col justify-center min-h-[90px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Avg Fleet Temp</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-bold text-foreground leading-none">{stats.avgTemp}°C</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Trend Chart Area */}
            <Card className="shadow-sm overflow-hidden flex flex-col h-[320px]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold text-foreground">Live Temp & Humidity</CardTitle>
                  <div className="flex items-center bg-muted/60 p-0.5 rounded-md text-[10px]">
                    {([6, 12, 24] as const).map(hr => (
                      <button
                        key={hr}
                        onClick={() => setTimeRangeHours(hr)}
                        className={cn(
                          "px-2 py-0.5 rounded-sm font-semibold transition-colors",
                          timeRangeHours === hr ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {hr}h
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant={graphSortOrder === 'asc' ? 'secondary' : 'outline'} size="icon" className="h-6 w-6" onClick={() => setGraphSortOrder(prev => prev === 'asc' ? 'default' : 'asc')}>
                    <ArrowUpNarrowWide className="h-3 w-3" />
                  </Button>
                  <Button variant={graphSortOrder === 'desc' ? 'secondary' : 'outline'} size="icon" className="h-6 w-6" onClick={() => setGraphSortOrder(prev => prev === 'desc' ? 'default' : 'desc')}>
                    <ArrowDownNarrowWide className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => scrollGraph('left')}><ChevronLeft className="h-3 w-3" /></Button>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => scrollGraph('right')}><ChevronRight className="h-3 w-3" /></Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 px-3 pb-0 w-full h-full min-h-0 flex flex-col">
                <div className="flex flex-grow w-full h-full">
                  {/* Fixed Left Y-Axis for Temperature */}
                  <div style={{ height: `100%`, width: `${Y_AXIS_WIDTH}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[{}]} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <XAxis height={30} tick={false} axisLine={false} />
                        <YAxis
                          yAxisId="left"
                          domain={tempDomain}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }, offset: 10 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Scrollable Center Area */}
                  <div className="flex-1 overflow-x-auto no-scrollbar min-w-0 h-full" ref={scrollContainerRef}>
                    <div style={{ minWidth: '100%', width: chartData.length > 15 ? `${chartData.length * 38}px` : '100%', height: `100%` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="time"
                            height={30}
                            tickLine={false}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickMargin={8}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis yAxisId="left" domain={tempDomain} hide />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />

                          <RechartsTooltip
                            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
                            content={<CustomGraphTooltip />}
                          />

                          {/* Safe Operating Range Band for Single Vehicle */}
                          {selectedVehicle !== 'all' && chartData[0]?.minSafe !== undefined && (
                            <>
                              <ReferenceArea
                                yAxisId="left"
                                y1={chartData[0].minSafe}
                                y2={chartData[0].maxSafe}
                                fill="#10b981"
                                fillOpacity={0.08}
                                stroke="none"
                              />
                              <ReferenceLine
                                yAxisId="left"
                                y={chartData[0].maxSafe}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                strokeOpacity={0.6}
                              />
                              <ReferenceLine
                                yAxisId="left"
                                y={chartData[0].minSafe}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                strokeOpacity={0.6}
                              />
                            </>
                          )}

                          {/* Humidity Line (Clean secondary dashed line instead of heavy area fill) */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="humidity"
                            stroke="#06b6d4"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 4, fill: "#06b6d4" }}
                          />

                          {/* Fleet Dispersion Range Band for All Vehicles Mode */}
                          {selectedVehicle === 'all' && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="fleetRange"
                              fill="#3b82f6"
                              stroke="#3b82f6"
                              fillOpacity={0.12}
                              strokeWidth={1}
                              strokeDasharray="2 2"
                            />
                          )}

                          {/* Temperature Foreground Line */}
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="temp"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={<CustomizedTempDot />}
                            activeDot={<CustomActiveDot />}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Fixed Right Y-Axis for Humidity */}
                  <div style={{ height: `100%`, width: `${Y_AXIS_WIDTH}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[{}]} margin={{ top: 10, right: -25, left: 0, bottom: 0 }}>
                        <XAxis height={30} tick={false} axisLine={false} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }, offset: 10 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <CustomGraphLegend data={chartData} isAllUnits={selectedVehicle === 'all'} />
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN: At-Risk + Violations (spans 4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* At-Risk Shipments Card */}
            <Card className="overflow-hidden shadow-sm bg-card border-red-500/30">
              <div className="flex flex-row items-center justify-between p-2.5 border-b border-red-500/20 bg-red-50 dark:bg-red-500/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600 dark:text-red-400 h-4 w-4" strokeWidth={2} />
                  <h3 className="text-base font-bold text-red-600 dark:text-red-400">Critical Alerts</h3>
                </div>
                <div className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {liveAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'WARNING').length} Alerts
                </div>
              </div>

              <CardContent className="p-2.5 flex flex-col gap-2.5">
                {liveAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'WARNING').slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "border border-border/60 rounded-lg bg-card flex flex-col relative overflow-hidden shadow-sm",
                      "animate-in slide-in-from-right-16 duration-300 ease-out"
                    )}
                  >
                    <div className={cn(
                      "text-white px-2 py-1 flex justify-between items-center",
                      alert.severity === 'CRITICAL' ? "bg-red-500 text-white" : "bg-orange-500 text-white"
                    )}>
                      <span className="text-[9px] font-medium tracking-wide uppercase">
                        {alert.currentTemp > alert.maxSafe ? 'Temperature Increased' : 'Temperature Decreased'}
                      </span>
                      <span className="text-[10px] font-bold">{alert.vehicleId}</span>
                    </div>

                    <div className="p-2.5">
                      <div className="text-[11px] text-foreground mb-2 font-normal">
                        {alert.route}
                      </div>

                      <div className="border-t border-border/40 mb-2" />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[8px] text-muted-foreground uppercase mb-0.5 block font-medium">Current Temperature</span>
                          <span className={cn(
                            "text-lg font-normal leading-none block",
                            alert.severity === 'CRITICAL' ? "text-red-600 dark:text-red-400" : "text-orange-500"
                          )}>{alert.currentTemp.toFixed(1)}°C</span>
                        </div>
                        <div className="border-l border-border/60 pl-2">
                          <span className="text-[8px] text-muted-foreground uppercase mb-0.5 block font-medium">Threshold</span>
                          <span className="text-lg font-normal text-foreground leading-none block">
                            {alert.minSafe} - {alert.maxSafe}°C
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-border/40 mt-2.5 mb-2" />

                      <div className="grid grid-cols-2 gap-2">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-7 text-[10px] rounded shadow-sm font-medium">
                          <Phone className="w-3 h-3 mr-1" /> Contact Driver
                        </Button>
                        <Button variant="outline" className="w-full h-7 text-[10px] rounded shadow-sm text-foreground font-medium border-border/80">
                          Audio Alert
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actionable Alerts Panel */}
            <Card className="flex flex-col shadow-sm flex-1">
              <CardHeader className="flex flex-row items-center justify-between mb-1 border-b pb-2 px-4 pt-4 space-y-0">
                <CardTitle className="text-sm font-bold">Recent Temp Violations</CardTitle>
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Requires Action</span>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[500px]">
                {liveAlerts.map((alert, idx) => (
                  <React.Fragment key={alert.id}>
                    <div className="flex flex-col gap-1.5 animate-in slide-in-from-right-16 duration-300 ease-out">
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0",
                          alert.severity === 'CRITICAL' ? "bg-red-500" : "bg-orange-500"
                        )} />
                        <div>
                          <p className="text-xs text-foreground leading-snug">
                            {alert.severity === 'CRITICAL' ? 'Excursion detected on ' : 'Defrost cycle prolonged on '}
                            <span className="font-semibold text-primary">{alert.vehicleId}</span>.
                            {alert.severity === 'CRITICAL' ? ` Temp exceeded limits for > 15 mins.` : ' Monitor closely.'}
                          </p>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block font-medium">
                            {alert.timeStr} • Driver: {alert.driver}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-3.5 mt-1">
                        {alert.severity === 'CRITICAL' ? (
                          <>
                            <Button size="sm" className="h-6 text-[10px] font-medium px-2.5 flex items-center gap-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground">
                              <Phone className="w-2.5 h-2.5 mr-1" /> Contact Driver
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] font-medium px-2.5 rounded">
                              Log Action
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] font-medium px-2.5 rounded">
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                    {idx < liveAlerts.length - 1 && <hr className="border-border" />}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </>
  );
};

export default RefrigeratorTempDashboard;