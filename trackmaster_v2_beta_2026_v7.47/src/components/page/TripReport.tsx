import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { PoiCombobox } from './PoiCombobox';
import { DateRange } from 'react-day-picker';
import {
  subDays,
  isWithinInterval,
  parse,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import { tripReportData, type TripReportData } from '@/data/tripReportData';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  PlayCircle,
  Clock,
  Pause,
  Fuel,
  ArrowRight,
  ArrowLeftRight,
  Navigation,
  Route,
  MapPin,
  Car,
  RotateCcw,
} from 'lucide-react';
import { usePois } from '@/context/PoiContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '../WhatsappPopup';
import { actualVehicles } from '@/data/mockData';
import { API_BASE_URL } from '@/config/Api';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- Types ---
type SortKey = 'vehicleId' | 'vehicleName' | 'tripCount' | 'distance' | 'duration' | 'stopTime' | 'fuelConsumed' | 'startTime';

interface AggregatedTripGroup {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  totalStopTime: number;
  totalFuel: number;
  trips: (TripReportData & {
    startPoiName: string;
    endPoiName: string;
    efficiency: number;
  })[];
}

// --- Helper: Vehicle icon badge component ---
const VehicleIconBadge = ({ vehicleType }: { vehicleType?: string }) => {
  const vType = vehicleType || 'Truck';
  const imageName = vType.toLowerCase().replace(/\s+/g, '-');
  return (
    <img
      src={`/vehicle-images/${imageName}.png`}
      alt={vType}
      className="flex-shrink-0 w-10 h-10 object-contain drop-shadow-xs"
      onError={(e) => {
        e.currentTarget.src = '/vehicle-images/truck.png';
      }}
    />
  );
};

// --- Helper: Format Minutes ---
const formatMinutes = (minutes: number) => {
  if (isNaN(minutes) || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const TripReport = () => {
  const { pois } = usePois();
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  // Filter States
  const [startPoi, setStartPoi] = useState<string>('');
  const [endPoi, setEndPoi] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicleFromUrl || 'all');
  const [tripType, setTripType] = useState<'one-way' | 'two-way'>('one-way');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // UI States
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'distance',
    direction: 'desc',
  });
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  // Vehicle list from API / fallback
  const [vehicles, setVehicles] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = auth.custId;

        if (custId) {
          const response = await fetch(
            `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
          );
          if (response.ok) {
            const data = await response.json();
            const formattedVehicles = [
              { label: 'All Vehicles', value: 'all' },
              ...(data.data || []).map((v: any) => ({
                label: v.vehName,
                value: v.bbid,
              })),
            ];
            setVehicles(formattedVehicles);
            return;
          }
        }
      } catch (error) {
        console.error('Vehicle list load error', error);
      }

      setVehicles([
        { label: 'All Vehicles', value: 'all' },
        ...actualVehicles.map((v) => ({ label: v.name, value: v.id })),
      ]);
    };

    loadVehicles();
  }, []);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSwapLocations = () => {
    const temp = startPoi;
    setStartPoi(endPoi);
    setEndPoi(temp);
    setPage(0);
  };

  const handleResetRoute = () => {
    setStartPoi('');
    setEndPoi('');
    setPage(0);
  };

  // Filtered and calculated Trips
  const filteredData = useMemo(() => {
    let rawTrips: TripReportData[] = [];

    const baseTrips = tripReportData.filter((trip) => {
      const tripDate = parse(trip.startTime, 'yyyy-MM-dd HH:mm', new Date());
      const inDateRange =
        date?.from &&
        date?.to &&
        isWithinInterval(tripDate, {
          start: startOfDay(date.from),
          end: endOfDay(date.to),
        });
      const vehicleMatch =
        selectedVehicle === 'all' ||
        trip.vehicleId === selectedVehicle ||
        trip.vehicleId.toLowerCase() === selectedVehicle.toLowerCase();

      return inDateRange && vehicleMatch;
    });

    if (tripType === 'one-way') {
      rawTrips = baseTrips.filter((trip) => {
        const matchStart = !startPoi || startPoi === 'all' || trip.startPoiId === startPoi;
        const matchEnd = !endPoi || endPoi === 'all' || trip.endPoiId === endPoi;
        return matchStart && matchEnd;
      });
    } else {
      // 'two-way' / Round-trip logic
      const roundTrips: TripReportData[] = [];
      const tripsByVehicle = baseTrips.reduce((acc, trip) => {
        if (!acc[trip.vehicleId]) {
          acc[trip.vehicleId] = [];
        }
        acc[trip.vehicleId].push(trip);
        return acc;
      }, {} as Record<string, TripReportData[]>);

      for (const vehicleId in tripsByVehicle) {
        const vehicleTrips = tripsByVehicle[vehicleId].sort(
          (a, b) =>
            parse(a.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime() -
            parse(b.startTime, 'yyyy-MM-dd HH:mm', new Date()).getTime()
        );

        const outboundTrips = vehicleTrips.filter((t) => {
          const matchStart = !startPoi || startPoi === 'all' || t.startPoiId === startPoi;
          const matchEnd = !endPoi || endPoi === 'all' || t.endPoiId === endPoi;
          return matchStart && matchEnd;
        });

        const inboundTrips = vehicleTrips.filter((t) => {
          const matchStart = !endPoi || endPoi === 'all' || t.startPoiId === endPoi;
          const matchEnd = !startPoi || startPoi === 'all' || t.endPoiId === startPoi;
          return matchStart && matchEnd;
        });

        const usedInboundTrips = new Set<string>();

        outboundTrips.forEach((outbound) => {
          const outboundEndTime = parse(outbound.endTime, 'yyyy-MM-dd HH:mm', new Date());

          const correspondingInbound = inboundTrips.find(
            (inbound) =>
              !usedInboundTrips.has(inbound.id) &&
              parse(inbound.startTime, 'yyyy-MM-dd HH:mm', new Date()) > outboundEndTime
          );

          if (correspondingInbound) {
            const combinedTrip: TripReportData = {
              id: `roundtrip-${outbound.id}-${correspondingInbound.id}`,
              vehicleId: outbound.vehicleId,
              startPoiId: outbound.startPoiId,
              endPoiId: outbound.endPoiId,
              startTime: outbound.startTime,
              endTime: correspondingInbound.endTime,
              duration: outbound.duration + correspondingInbound.duration,
              stopTime: outbound.stopTime + correspondingInbound.stopTime,
              distance: Number((outbound.distance + correspondingInbound.distance).toFixed(1)),
              fuelConsumed: Number(
                (outbound.fuelConsumed + correspondingInbound.fuelConsumed).toFixed(1)
              ),
              tripCount: (outbound.tripCount || 1) + (correspondingInbound.tripCount || 1),
              path: [],
            };
            roundTrips.push(combinedTrip);
            usedInboundTrips.add(correspondingInbound.id);
          }
        });
      }

      rawTrips = roundTrips;
    }

    // Group trips by vehicle
    const vehicleGroups: Record<string, AggregatedTripGroup> = {};

    rawTrips.forEach((trip) => {
      const vId = trip.vehicleId;
      const startP = pois.find((p) => p.id === trip.startPoiId);
      const endP = pois.find((p) => p.id === trip.endPoiId);
      const veh = actualVehicles.find((v) => v.id === vId);

      const enrichedTrip = {
        ...trip,
        startPoiName: startP ? startP.poiName : `POI ${trip.startPoiId}`,
        endPoiName: endP ? endP.poiName : `POI ${trip.endPoiId}`,
        efficiency: trip.fuelConsumed > 0 ? Number((trip.distance / trip.fuelConsumed).toFixed(1)) : 0,
      };

      if (!vehicleGroups[vId]) {
        vehicleGroups[vId] = {
          id: vId,
          vehicleId: vId,
          vehicleName: veh ? veh.name : vId,
          vehicleType: veh ? veh.type : 'Truck',
          totalTrips: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalStopTime: 0,
          totalFuel: 0,
          trips: [],
        };
      }

      vehicleGroups[vId].totalTrips += trip.tripCount || 1;
      vehicleGroups[vId].totalDistance = Number(
        (vehicleGroups[vId].totalDistance + trip.distance).toFixed(1)
      );
      vehicleGroups[vId].totalDuration += trip.duration;
      vehicleGroups[vId].totalStopTime += trip.stopTime;
      vehicleGroups[vId].totalFuel = Number(
        (vehicleGroups[vId].totalFuel + trip.fuelConsumed).toFixed(1)
      );
      vehicleGroups[vId].trips.push(enrichedTrip);
    });

    return Object.values(vehicleGroups);
  }, [date, selectedVehicle, startPoi, endPoi, tripType, pois]);

  // Sort groups
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof AggregatedTripGroup];
      let bVal: any = b[sortConfig.key as keyof AggregatedTripGroup];

      if (sortConfig.key === 'tripCount') {
        aVal = a.totalTrips;
        bVal = b.totalTrips;
      } else if (sortConfig.key === 'distance') {
        aVal = a.totalDistance;
        bVal = b.totalDistance;
      } else if (sortConfig.key === 'duration') {
        aVal = a.totalDuration;
        bVal = b.totalDuration;
      } else if (sortConfig.key === 'stopTime') {
        aVal = a.totalStopTime;
        bVal = b.totalStopTime;
      } else if (sortConfig.key === 'fuelConsumed') {
        aVal = a.totalFuel;
        bVal = b.totalFuel;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [filteredData, sortConfig]);

  // Pagination Slice
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const firstRowIndex = sortedData.length === 0 ? 0 : page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, sortedData.length);

  // PDF Exporter
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const formattedDateRange = `${
      date?.from ? format(date.from, 'MMM dd, yyyy') : ''
    } - ${date?.to ? format(date.to, 'MMM dd, yyyy') : ''}`;

    doc.setFontSize(16);
    doc.text('Trackmaster - Trip Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Interval: ${formattedDateRange} | Type: ${tripType === 'one-way' ? 'One Way' : 'Round Trip'}`, 14, 22);

    const rows: any[] = [];
    sortedData.forEach((group, idx) => {
      group.trips.forEach((trip) => {
        rows.push([
          group.vehicleId,
          trip.startPoiName,
          trip.endPoiName,
          trip.startTime,
          trip.endTime,
          formatMinutes(trip.duration),
          formatMinutes(trip.stopTime),
          formatMinutes(trip.duration + trip.stopTime),
          `${trip.distance.toFixed(1)} km`,
          `${trip.fuelConsumed.toFixed(1)} L`,
        ]);
      });
    });

    autoTable(doc, {
      head: [[
        'Vehicle',
        'Origin',
        'Destination',
        'Start Time',
        'End Time',
        'Running',
        'Stoppage',
        'Total Time',
        'Distance',
        'Fuel',
      ]],
      body: rows,
      startY: 26,
    });

    doc.save(`Trip_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Excel Exporter
  const exportExcel = () => {
    const rows: any[] = [];
    sortedData.forEach((group) => {
      group.trips.forEach((trip) => {
        rows.push({
          'Vehicle ID': group.vehicleId,
          'Vehicle Name': group.vehicleName,
          'Trip Type': tripType === 'one-way' ? 'One Way' : 'Round Trip',
          'Origin Location': trip.startPoiName,
          'Destination Location': trip.endPoiName,
          'Start Date & Time': trip.startTime,
          'End Date & Time': trip.endTime,
          'Running Duration': formatMinutes(trip.duration),
          'Stop Duration': formatMinutes(trip.stopTime),
          'Total Duration': formatMinutes(trip.duration + trip.stopTime),
          'Distance Travelled (km)': trip.distance.toFixed(1),
          'Fuel Consumed (L)': trip.fuelConsumed.toFixed(1),
        });
      });
    });

    if (rows.length === 0) return;
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Trip_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 py-4 border-b bg-card">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Trip Report
          </CardTitle>
          <CardDescription className="mt-0.5">
            Detailed breakdown of vehicle journeys between locations with duration, stoppage, distance, and fuel metrics.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
          {/* Vehicle Combobox */}
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={(val) => {
              setSelectedVehicle(val);
              setPage(0);
            }}
            className="w-full sm:w-[160px]"
          />

          {/* Date Range */}
          <DateRangePicker date={date} setDate={setDate} />

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ChevronsUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort('distance')}>
                Total Distance{' '}
                {sortConfig.key === 'distance' &&
                  (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('vehicleName')}>
                Vehicle Name{' '}
                {sortConfig.key === 'vehicleName' &&
                  (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('tripCount')}>
                Trip Count{' '}
                {sortConfig.key === 'tripCount' &&
                  (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('duration')}>
                Running Duration{' '}
                {sortConfig.key === 'duration' &&
                  (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('fuelConsumed')}>
                Fuel Consumed{' '}
                {sortConfig.key === 'fuelConsumed' &&
                  (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPdf} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-rose-500" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <WhatsappPopup />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Dedicated Route Selection Panel (Origin & Destination) */}
        <div className="p-4 sm:p-5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Route className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Trip Route Selection
                  <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
                    • Select origin and destination to generate trip report
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground sm:hidden">
                  Select origin and destination to generate trip report
                </p>
              </div>
            </div>

            {(startPoi || endPoi) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRoute}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Route
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-3">
            {/* Origin Selector */}
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Origin (Start Location)</span>
                </label>
                {startPoi && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartPoi('');
                      setPage(0);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <PoiCombobox
                pois={pois}
                value={startPoi}
                onChange={(val) => {
                  setStartPoi(val);
                  setPage(0);
                }}
                placeholder="Select Origin..."
                allLabel="All Origins (Any Start)"
                icon={<MapPin className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />}
                className="w-full bg-background"
              />
            </div>

            {/* Swap Button / Route Direction Connector */}
            <div className="flex items-center justify-center self-center md:self-end pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Swap Origin and Destination"
                onClick={handleSwapLocations}
                className="h-9 w-9 rounded-lg border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-muted-foreground hover:text-blue-600 transition-colors shrink-0 shadow-xs"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Destination Selector */}
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Destination (End Location)</span>
                </label>
                {endPoi && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndPoi('');
                      setPage(0);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <PoiCombobox
                pois={pois}
                value={endPoi}
                onChange={(val) => {
                  setEndPoi(val);
                  setPage(0);
                }}
                placeholder="Select Destination..."
                allLabel="All Destinations (Any End)"
                icon={<MapPin className="mr-2 h-4 w-4 shrink-0 text-rose-500" />}
                className="w-full bg-background"
              />
            </div>

            {/* Trip Direction */}
            <div className="w-full md:w-[150px] space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Trip Direction
              </label>
              <Select
                value={tripType}
                onValueChange={(val: 'one-way' | 'two-way') => {
                  setTripType(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full h-9 bg-background">
                  <SelectValue placeholder="Trip Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One Way</SelectItem>
                  <SelectItem value="two-way">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route Status feedback */}
          <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              {startPoi && endPoi ? (
                <span>
                  Generating report for trips from{' '}
                  <strong className="text-foreground">
                    {pois.find((p) => p.id === startPoi)?.poiName || 'Origin'}
                  </strong>{' '}
                  ➔{' '}
                  <strong className="text-foreground">
                    {pois.find((p) => p.id === endPoi)?.poiName || 'Destination'}
                  </strong>{' '}
                  ({tripType === 'one-way' ? 'One Way' : 'Round Trip'})
                </span>
              ) : startPoi ? (
                <span>
                  Generating report for trips starting from{' '}
                  <strong className="text-foreground">
                    {pois.find((p) => p.id === startPoi)?.poiName || 'Origin'}
                  </strong>{' '}
                  to any destination
                </span>
              ) : endPoi ? (
                <span>
                  Generating report for trips arriving at{' '}
                  <strong className="text-foreground">
                    {pois.find((p) => p.id === endPoi)?.poiName || 'Destination'}
                  </strong>{' '}
                  from any origin
                </span>
              ) : (
                <span>
                  All locations included. Select specific origin and destination above to generate route-based trip report.
                </span>
              )}
            </div>

            <span className="font-medium text-foreground">
              {sortedData.length} {sortedData.length === 1 ? 'vehicle' : 'vehicles'} matching
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {paginatedData.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="text-center">
                <Navigation className="h-12 w-12 mx-auto mb-3 opacity-30 text-blue-500" />
                <p className="text-lg font-medium">No trips found</p>
                <p className="text-sm mt-1">Try adjusting your locations, vehicle, or date interval.</p>
              </div>
            </div>
          )}

          {paginatedData.map((group) => {
            const isExpanded = expandedRows.has(group.id);

            return (
              <div key={group.id} className="group">
                {/* Main Vehicle Trip Card */}
                <div
                  className={cn(
                    'relative bg-card border rounded-xl transition-all duration-300 overflow-hidden',
                    'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50',
                    isExpanded
                      ? 'border-blue-200 dark:border-blue-800/50 shadow-md rounded-b-none'
                      : 'shadow-xs'
                  )}
                >
                  {/* Left accent border */}
                  <div
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300',
                      isExpanded
                        ? 'bg-gradient-to-b from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-blue-400 group-hover:to-indigo-500'
                    )}
                  />

                  <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 sm:py-3.5 pl-5 sm:pl-7 flex-wrap md:flex-nowrap">
                    {/* Vehicle icon */}
                    <VehicleIconBadge vehicleType={group.vehicleType} />

                    {/* Vehicle info */}
                    <div className="flex-1 min-w-[140px]">
                      <h3 className="text-sm sm:text-[15px] font-semibold text-foreground truncate leading-tight">
                        {group.vehicleName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                        {group.vehicleId}
                      </p>
                    </div>

                    {/* Trips Count */}
                    <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Trips
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full text-xs border border-blue-200 dark:border-blue-800">
                          <Route className="h-3 w-3 text-blue-500" />
                          {group.totalTrips} {tripType === 'one-way' ? 'Legs' : 'Rounds'}
                        </span>
                      </div>
                    </div>

                    {/* Total Distance */}
                    <div className="hidden md:flex flex-col items-end min-w-[90px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Distance
                      </span>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {group.totalDistance.toFixed(1)}{' '}
                        <span className="text-xs font-normal text-muted-foreground">km</span>
                      </div>
                    </div>

                    {/* Running Time */}
                    <div className="hidden lg:flex flex-col items-end min-w-[90px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Running Time
                      </span>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(group.totalDuration)}
                      </div>
                    </div>

                    {/* Stoppage Time */}
                    <div className="hidden lg:flex flex-col items-end min-w-[90px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Stop Time
                      </span>
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                        <Pause className="h-3 w-3" />
                        {formatMinutes(group.totalStopTime)}
                      </div>
                    </div>

                    {/* Fuel Consumed */}
                    <div className="hidden xl:flex flex-col items-end min-w-[80px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                        Fuel
                      </span>
                      <div className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                        <Fuel className="h-3 w-3 text-rose-500" />
                        {group.totalFuel.toFixed(1)} L
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-8 bg-border mx-1" />

                    {/* Detailed log toggle */}
                    <button
                      onClick={() => toggleRow(group.id)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3 py-2 rounded-lg ml-auto sm:ml-0',
                        isExpanded
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                          : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      )}
                    >
                      <span className="hidden sm:inline">Trip Log</span>
                      <span className="sm:hidden">Trips</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-300',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[650px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="border border-t-0 border-blue-200 dark:border-blue-800/50 rounded-b-xl bg-muted/20 p-4 sm:p-5">
                    <div className="bg-card rounded-lg shadow-xs overflow-hidden border">
                      <div className="p-3.5 sm:px-5 border-b bg-muted/30 flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-foreground">
                            Journey History: {group.vehicleName}
                          </h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {group.trips.length} {group.trips.length === 1 ? 'trip recorded' : 'trips recorded'} in the selected period
                          </p>
                        </div>
                      </div>

                      <ScrollArea className="h-[280px]">
                        <div className="divide-y">
                          {group.trips.map((trip, idx) => {
                            const tripDate = trip.startTime.split(' ')[0];
                            return (
                              <div
                                key={trip.id || idx}
                                className="p-3.5 sm:px-5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                {/* Route Origin ➔ Destination */}
                                <div className="space-y-1 sm:min-w-[240px]">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">{trip.startPoiName}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">{trip.endPoiName}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Departed: {trip.startTime} • Arrived: {trip.endTime}
                                  </div>
                                </div>

                                {/* Metrics Chips */}
                                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Distance</span>
                                    <span className="font-bold text-foreground">{trip.distance.toFixed(1)} km</span>
                                  </div>

                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Running</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatMinutes(trip.duration)}
                                    </span>
                                  </div>

                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Stoppage</span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {formatMinutes(trip.stopTime)}
                                    </span>
                                  </div>

                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Fuel</span>
                                    <span className="font-bold text-foreground">
                                      {trip.fuelConsumed.toFixed(1)} L
                                    </span>
                                  </div>

                                  {/* Route Playback */}
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 ml-auto sm:ml-2 font-medium"
                                  >
                                    <Link
                                      to={`/vehicle-status/route-playback?vehicle=${trip.vehicleId}&date=${tripDate}`}
                                    >
                                      <PlayCircle className="h-3.5 w-3.5" />
                                      Playback
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Pagination Footer */}
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 sm:px-6 border-t bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <span className="text-xs text-muted-foreground font-medium">
            {firstRowIndex}–{lastRowIndex} of {sortedData.length} records
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="text-xs font-semibold px-2">
              Page {page + 1} of {Math.max(1, totalPages)}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(0, totalPages - 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TripReport;