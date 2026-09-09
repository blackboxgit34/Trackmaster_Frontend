import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  vehicles as mockVehicles,
  consolidatedReportTableData,
  LOCATIONS,
  DRIVERS,
  ERROR_CODES,
} from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FileSpreadsheet,
  Settings2,
  PlusCircle,
  Calendar as CalendarIcon,
  MoreHorizontal,
  ChevronsUpDown,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  Gauge,
  Clock,
  Fuel,
  MapPin,
  Activity,
  Layers,
  Radio,
  Trash2,
  Edit,
  RotateCcw,
  Users,
  Zap,
  Thermometer,
  AlertTriangle,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  subWeeks,
  subDays,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SaveTemplateDialog from './SaveTemplateDialog';
import EditTemplateDialog from './EditTemplateDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

// ==========================================
// 1. COLUMN DEFINITIONS (COMPREHENSIVE)
// ==========================================

export type ColumnCategory =
  | 'basic'
  | 'trips'
  | 'engine'
  | 'speed'
  | 'fuel'
  | 'zones'
  | 'health';

export interface ColumnDefinition {
  key: string;
  label: string;
  category: ColumnCategory;
  unit?: string;
  description?: string;
  defaultVisible?: boolean;
}

export const CATEGORY_INFO: Record<
  ColumnCategory,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  basic: { label: 'Vehicle & Info', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  trips: { label: 'Distance & Trips', icon: MapPin, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  engine: { label: 'Time & Engine Activity', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  speed: { label: 'Speed & Safety', icon: Gauge, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
  fuel: { label: 'Fuel & Consumption', icon: Fuel, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  zones: { label: 'Zones & Geofencing', icon: Radio, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  health: { label: 'Health & Sensors', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40' },
};

export const ALL_COLUMNS: ColumnDefinition[] = [
  // 1. Basic Info
  { key: 'date', label: 'Date', category: 'basic', defaultVisible: true },
  { key: 'regNo', label: 'Registration Number', category: 'basic', defaultVisible: true },
  { key: 'bbid', label: 'BBID', category: 'basic', defaultVisible: true },
  { key: 'machineName', label: 'Vehicle Name', category: 'basic', defaultVisible: true },
  { key: 'vehicleType', label: 'Vehicle Type', category: 'basic' },
  { key: 'driverName', label: 'Driver Name', category: 'basic' },
  { key: 'driverMobile', label: 'Driver Mobile', category: 'basic' },
  { key: 'location', label: 'Current / Last Location', category: 'basic', defaultVisible: true },

  // 2. Distance & Trips
  { key: 'distance', label: 'Distance Travelled', category: 'trips', unit: 'km', defaultVisible: true },
  { key: 'tripCount', label: 'Trip Count', category: 'trips' },
  { key: 'startLocation', label: 'Start Location', category: 'trips' },
  { key: 'endLocation', label: 'End Location', category: 'trips' },
  { key: 'startTime', label: 'Start Time', category: 'trips' },
  { key: 'endTime', label: 'End Time', category: 'trips' },

  // 3. Engine & Time Activity
  { key: 'workingHours', label: 'Working Hours', category: 'engine', unit: 'hrs', defaultVisible: true },
  { key: 'cumulativeHours', label: 'Cumulative Engine Hours', category: 'engine', unit: 'hrs' },
  { key: 'stoppageTime', label: 'Stoppage Duration', category: 'engine', unit: 'hrs' },
  { key: 'stoppageCount', label: 'Stoppage Count', category: 'engine' },
  { key: 'idlingTime', label: 'Idling Duration', category: 'engine', unit: 'hrs' },
  { key: 'idlingCount', label: 'Idling Count', category: 'engine' },
  { key: 'totalHaltTime', label: 'Total Halt Time', category: 'engine', unit: 'hrs' },
  { key: 'idlingRatio', label: 'Idling Ratio', category: 'engine', unit: '%' },
  { key: 'ignitionCycles', label: 'Ignition Cycles', category: 'engine' },

  // 4. Speed & Safety
  { key: 'avgSpeed', label: 'Average Speed', category: 'speed', unit: 'km/h', defaultVisible: true },
  { key: 'maxSpeed', label: 'Max Speed', category: 'speed', unit: 'km/h' },
  { key: 'speedLimit', label: 'Speed Limit', category: 'speed', unit: 'km/h' },
  { key: 'overspeedCount', label: 'Overspeed Violations', category: 'speed' },
  { key: 'overspeedDuration', label: 'Overspeed Duration', category: 'speed', unit: 'min' },

  // 5. Fuel & Consumption
  { key: 'fuelConsumed', label: 'Fuel Consumed', category: 'fuel', unit: 'L', defaultVisible: true },
  { key: 'currentFuelLevel', label: 'Fuel Level', category: 'fuel', unit: '%' },
  { key: 'fuelEfficiency', label: 'Fuel Efficiency', category: 'fuel', unit: 'km/L' },
  { key: 'fuelWasted', label: 'Idling Fuel Wasted', category: 'fuel', unit: 'L' },
  { key: 'fuelFillingCount', label: 'Fuel Refill Events', category: 'fuel' },
  { key: 'fuelTheftCount', label: 'Fuel Theft / Drop Events', category: 'fuel' },

  // 6. Zones & Geofencing
  { key: 'poisCovered', label: 'POIs Visited', category: 'zones' },
  { key: 'fenceViolations', label: 'Geofence Violations', category: 'zones' },
  { key: 'lastFenceName', label: 'Last Geofence Name', category: 'zones' },
  { key: 'stayDuration', label: 'Zone Stay Duration', category: 'zones', unit: 'min' },

  // 7. Health & Sensors
  { key: 'engineTemp', label: 'Engine Temp', category: 'health', unit: '°C' },
  { key: 'hydraulicTemp', label: 'Hydraulic Temp', category: 'health', unit: '°C' },
  { key: 'reeferTemp', label: 'Reefer Temp', category: 'health', unit: '°C' },
  { key: 'batteryStatus', label: 'Battery Status', category: 'health' },
  { key: 'batteryDisconnections', label: 'Battery Disconnects', category: 'health' },
  { key: 'errorCount', label: 'Diagnostic Errors', category: 'health' },
  { key: 'lastErrorCode', label: 'Last Error Code', category: 'health' },
  { key: 'serviceStatus', label: 'Service Status', category: 'health' },
  { key: 'nextServiceAt', label: 'Next Service Due', category: 'health', unit: 'hrs' },
  { key: 'alertsCount', label: 'Alerts Dispatched', category: 'health' },
];

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  date: 130,
  regNo: 170,
  bbid: 140,
  machineId: 160,
  machineName: 180,
  vehicleType: 130,
  driverName: 160,
  driverMobile: 150,
  location: 230,
  distance: 150,
  tripCount: 120,
  startLocation: 200,
  endLocation: 200,
  startTime: 170,
  endTime: 170,
  workingHours: 140,
  cumulativeHours: 160,
  stoppageTime: 140,
  stoppageCount: 130,
  idlingTime: 140,
  idlingCount: 120,
  totalHaltTime: 140,
  idlingRatio: 130,
  ignitionCycles: 130,
  avgSpeed: 140,
  maxSpeed: 130,
  speedLimit: 130,
  overspeedCount: 150,
  overspeedDuration: 150,
  fuelConsumed: 140,
  currentFuelLevel: 160,
  fuelEfficiency: 140,
  fuelWasted: 150,
  fuelFillingCount: 140,
  fuelTheftCount: 150,
  poisCovered: 130,
  fenceViolations: 150,
  lastFenceName: 190,
  stayDuration: 150,
  engineTemp: 130,
  hydraulicTemp: 140,
  reeferTemp: 130,
  batteryStatus: 150,
  batteryDisconnections: 160,
  errorCount: 140,
  lastErrorCode: 140,
  serviceStatus: 140,
  nextServiceAt: 150,
  alertsCount: 140,
};

// ==========================================
// 2. QUICK COLUMN PRESETS
// ==========================================

export const PRESET_PACKS = [
  {
    id: 'executive',
    name: 'Executive Summary',
    badge: 'Popular',
    icon: Sparkles,
    color: 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/30',
    columns: ['date', 'regNo', 'bbid', 'machineName', 'vehicleType', 'distance', 'workingHours', 'fuelConsumed', 'avgSpeed', 'alertsCount', 'serviceStatus'],
  },
  {
    id: 'fuel_audit',
    name: 'Fuel & Efficiency Audit',
    badge: 'Fuel Suite',
    icon: Fuel,
    color: 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30',
    columns: ['date', 'regNo', 'machineName', 'distance', 'workingHours', 'fuelConsumed', 'fuelEfficiency', 'currentFuelLevel', 'fuelWasted', 'fuelFillingCount', 'fuelTheftCount'],
  },
  {
    id: 'driver_safety',
    name: 'Driver Safety & Speed',
    badge: 'Compliance',
    icon: Gauge,
    color: 'border-red-500/40 bg-red-50/50 dark:bg-red-950/30',
    columns: ['date', 'regNo', 'machineName', 'driverName', 'driverMobile', 'avgSpeed', 'maxSpeed', 'overspeedCount', 'overspeedDuration', 'fenceViolations', 'batteryDisconnections'],
  },
  {
    id: 'time_halts',
    name: 'Time & Halt Analysis',
    badge: 'Activity',
    icon: Clock,
    color: 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/30',
    columns: ['date', 'regNo', 'machineName', 'startLocation', 'endLocation', 'workingHours', 'stoppageTime', 'stoppageCount', 'idlingTime', 'idlingCount', 'totalHaltTime', 'idlingRatio'],
  },
  {
    id: 'health_maintenance',
    name: 'Vehicle Health & Telemetry',
    badge: 'Diagnostics',
    icon: Activity,
    color: 'border-purple-500/40 bg-purple-50/50 dark:bg-purple-950/30',
    columns: ['date', 'regNo', 'bbid', 'machineName', 'cumulativeHours', 'engineTemp', 'hydraulicTemp', 'reeferTemp', 'batteryStatus', 'errorCount', 'lastErrorCode', 'serviceStatus', 'nextServiceAt'],
  },
  {
    id: 'trip_operations',
    name: 'Trip & POI Operations',
    badge: 'Logistics',
    icon: MapPin,
    color: 'border-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/30',
    columns: ['date', 'regNo', 'machineName', 'driverName', 'startLocation', 'endLocation', 'distance', 'tripCount', 'poisCovered', 'lastFenceName', 'stayDuration'],
  },
];

// ==========================================
// 3. TYPES & SYSTEM TEMPLATES
// ==========================================

export interface CustomReportRow {
  id: string;
  date: string;
  regNo: string;
  bbid: string;
  machineId?: string;
  machineName: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  location: string;
  distance: number;
  tripCount: number;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  workingHours: number;
  cumulativeHours: number;
  stoppageTime: number;
  stoppageCount: number;
  idlingTime: number;
  idlingCount: number;
  totalHaltTime: number;
  idlingRatio: number;
  ignitionCycles: number;
  avgSpeed: number;
  maxSpeed: number;
  speedLimit: number;
  overspeedCount: number;
  overspeedDuration: number;
  fuelConsumed: number;
  currentFuelLevel: number;
  fuelEfficiency: number;
  fuelWasted: number;
  fuelFillingCount: number;
  fuelTheftCount: number;
  poisCovered: number;
  fenceViolations: number;
  lastFenceName: string;
  stayDuration: number;
  engineTemp: number;
  hydraulicTemp: number;
  reeferTemp: number;
  batteryStatus: 'Connected' | 'Disconnected';
  batteryDisconnections: number;
  errorCount: number;
  lastErrorCode: string;
  serviceStatus: 'OK' | 'Due Soon' | 'Overdue';
  nextServiceAt: number;
  alertsCount: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  columns: Set<string>;
  vehicle: string;
  dateRange?: DateRange;
  isSystem?: boolean;
}

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'sys-exec',
    name: 'Fleet Executive Summary',
    description: 'Key distance, operational hours, fuel, and health status indicators.',
    columns: new Set(['date', 'regNo', 'bbid', 'machineName', 'vehicleType', 'distance', 'workingHours', 'fuelConsumed', 'avgSpeed', 'alertsCount', 'serviceStatus']),
    vehicle: 'all',
    isSystem: true,
  },
  {
    id: 'sys-fuel',
    name: 'Complete Fuel Consumption Audit',
    description: 'Tracks fuel efficiency, idle fuel wastage, refills, and drop alerts.',
    columns: new Set(['date', 'regNo', 'machineName', 'distance', 'workingHours', 'fuelConsumed', 'fuelEfficiency', 'currentFuelLevel', 'fuelWasted', 'fuelFillingCount', 'fuelTheftCount']),
    vehicle: 'all',
    isSystem: true,
  },
  {
    id: 'sys-safety',
    name: 'Driver Safety & Speed Report',
    description: 'Overspeed alerts, max speeds, geofence violations, and power disconnects.',
    columns: new Set(['date', 'regNo', 'machineName', 'driverName', 'driverMobile', 'avgSpeed', 'maxSpeed', 'overspeedCount', 'overspeedDuration', 'fenceViolations', 'batteryDisconnections']),
    vehicle: 'all',
    isSystem: true,
  },
  {
    id: 'sys-maintenance',
    name: 'Preventative Maintenance & Telemetry',
    description: 'Engine temperatures, diagnostic codes, service thresholds, and battery status.',
    columns: new Set(['date', 'regNo', 'bbid', 'machineName', 'cumulativeHours', 'engineTemp', 'hydraulicTemp', 'reeferTemp', 'batteryStatus', 'errorCount', 'lastErrorCode', 'serviceStatus', 'nextServiceAt']),
    vehicle: 'all',
    isSystem: true,
  },
];

export interface ColumnMetricConfig {
  key: string;
  label: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  borderColor: string;
  compute: (data: CustomReportRow[]) => string | number;
}

export const COLUMN_METRIC_CONFIGS: ColumnMetricConfig[] = [
  // 1. Basic / Fleet Identifiers
  {
    key: 'regNo',
    label: 'Active Vehicles',
    unit: 'vehicles',
    icon: Layers,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    compute: (data) => new Set(data.map((d) => d.regNo || d.machineName)).size,
  },
  {
    key: 'machineName',
    label: 'Fleet Vehicles',
    unit: 'units',
    icon: Layers,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    compute: (data) => new Set(data.map((d) => d.machineName)).size,
  },
  {
    key: 'machineId',
    label: 'Active Fleet Units',
    unit: 'units',
    icon: Layers,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    compute: (data) => new Set(data.map((d) => d.regNo || d.machineId)).size,
  },
  {
    key: 'driverName',
    label: 'Assigned Drivers',
    unit: 'drivers',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40',
    compute: (data) => new Set(data.map((d) => d.driverName).filter(Boolean)).size,
  },
  {
    key: 'location',
    label: 'Locations Visited',
    unit: 'locations',
    icon: MapPin,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50/50 dark:bg-sky-950/20',
    borderColor: 'border-sky-200 dark:border-sky-800/40',
    compute: (data) => new Set(data.map((d) => d.location).filter(Boolean)).size,
  },

  // 2. Distance & Trips
  {
    key: 'distance',
    label: 'Total Distance',
    unit: 'km',
    icon: MapPin,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    compute: (data) => Math.round(data.reduce((sum, d) => sum + (d.distance || 0), 0)),
  },
  {
    key: 'tripCount',
    label: 'Total Completed Trips',
    unit: 'trips',
    icon: MapPin,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.tripCount || 0), 0),
  },

  // 3. Engine & Time Activity
  {
    key: 'workingHours',
    label: 'Fleet Working Hours',
    unit: 'hrs',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.workingHours || 0), 0).toFixed(1)),
  },
  {
    key: 'cumulativeHours',
    label: 'Cumulative Engine Hours',
    unit: 'hrs',
    icon: Clock,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.cumulativeHours || 0), 0).toFixed(1)),
  },
  {
    key: 'stoppageTime',
    label: 'Total Stoppage Time',
    unit: 'hrs',
    icon: Clock,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50/50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.stoppageTime || 0), 0).toFixed(1)),
  },
  {
    key: 'stoppageCount',
    label: 'Stoppage Events',
    unit: 'events',
    icon: Clock,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50/50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.stoppageCount || 0), 0),
  },
  {
    key: 'idlingTime',
    label: 'Total Idling Duration',
    unit: 'hrs',
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.idlingTime || 0), 0).toFixed(1)),
  },
  {
    key: 'idlingCount',
    label: 'Idling Occurrences',
    unit: 'events',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.idlingCount || 0), 0),
  },
  {
    key: 'totalHaltTime',
    label: 'Total Halt Time',
    unit: 'hrs',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.totalHaltTime || 0), 0).toFixed(1)),
  },
  {
    key: 'idlingRatio',
    label: 'Avg Idling Ratio',
    unit: '%',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    compute: (data) =>
      data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + (d.idlingRatio || 0), 0) / data.length)
        : 0,
  },
  {
    key: 'ignitionCycles',
    label: 'Total Ignition Cycles',
    unit: 'cycles',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.ignitionCycles || 0), 0),
  },

  // 4. Speed & Safety
  {
    key: 'avgSpeed',
    label: 'Fleet Average Speed',
    unit: 'km/h',
    icon: Gauge,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800/40',
    compute: (data) =>
      data.length > 0
        ? Number((data.reduce((sum, d) => sum + (d.avgSpeed || 0), 0) / data.length).toFixed(1))
        : 0,
  },
  {
    key: 'maxSpeed',
    label: 'Peak Speed Recorded',
    unit: 'km/h',
    icon: Gauge,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderColor: 'border-rose-200 dark:border-rose-800/40',
    compute: (data) => {
      const max = Math.max(...data.map((d) => d.maxSpeed || 0), 0);
      return max > 0 ? Number(max.toFixed(1)) : 0;
    },
  },
  {
    key: 'overspeedCount',
    label: 'Overspeed Violations',
    unit: 'violations',
    icon: Gauge,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.overspeedCount || 0), 0),
  },
  {
    key: 'overspeedDuration',
    label: 'Overspeed Duration',
    unit: 'min',
    icon: Clock,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.overspeedDuration || 0), 0).toFixed(1)),
  },

  // 5. Fuel & Consumption
  {
    key: 'fuelConsumed',
    label: 'Total Fuel Consumed',
    unit: 'L',
    icon: Fuel,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    compute: (data) => Math.round(data.reduce((sum, d) => sum + (d.fuelConsumed || 0), 0)),
  },
  {
    key: 'currentFuelLevel',
    label: 'Average Fuel Level',
    unit: '%',
    icon: Fuel,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    compute: (data) =>
      data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + (d.currentFuelLevel || 0), 0) / data.length)
        : 0,
  },
  {
    key: 'fuelEfficiency',
    label: 'Avg Fuel Efficiency',
    unit: 'km/L',
    icon: Fuel,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    compute: (data) => {
      const valid = data.filter((d) => (d.fuelEfficiency || 0) > 0);
      return valid.length > 0
        ? Number((valid.reduce((sum, d) => sum + d.fuelEfficiency, 0) / valid.length).toFixed(2))
        : 0;
    },
  },
  {
    key: 'fuelWasted',
    label: 'Idling Fuel Wasted',
    unit: 'L',
    icon: Fuel,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800/40',
    compute: (data) => Number(data.reduce((sum, d) => sum + (d.fuelWasted || 0), 0).toFixed(1)),
  },
  {
    key: 'fuelFillingCount',
    label: 'Fuel Refill Events',
    unit: 'refills',
    icon: Fuel,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50/50 dark:bg-teal-950/20',
    borderColor: 'border-teal-200 dark:border-teal-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.fuelFillingCount || 0), 0),
  },
  {
    key: 'fuelTheftCount',
    label: 'Fuel Theft / Drops',
    unit: 'events',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.fuelTheftCount || 0), 0),
  },

  // 6. Zones & Geofencing
  {
    key: 'poisCovered',
    label: 'POIs Visited',
    unit: 'visits',
    icon: Radio,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.poisCovered || 0), 0),
  },
  {
    key: 'fenceViolations',
    label: 'Geofence Violations',
    unit: 'violations',
    icon: Radio,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.fenceViolations || 0), 0),
  },
  {
    key: 'stayDuration',
    label: 'Total Zone Stay',
    unit: 'min',
    icon: Radio,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800/40',
    compute: (data) => Math.round(data.reduce((sum, d) => sum + (d.stayDuration || 0), 0)),
  },

  // 7. Health & Diagnostics
  {
    key: 'engineTemp',
    label: 'Avg Engine Temp',
    unit: '°C',
    icon: Thermometer,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800/40',
    compute: (data) =>
      data.length > 0
        ? Number((data.reduce((sum, d) => sum + (d.engineTemp || 0), 0) / data.length).toFixed(1))
        : 0,
  },
  {
    key: 'hydraulicTemp',
    label: 'Avg Hydraulic Temp',
    unit: '°C',
    icon: Thermometer,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderColor: 'border-rose-200 dark:border-rose-800/40',
    compute: (data) =>
      data.length > 0
        ? Number((data.reduce((sum, d) => sum + (d.hydraulicTemp || 0), 0) / data.length).toFixed(1))
        : 0,
  },
  {
    key: 'reeferTemp',
    label: 'Avg Reefer Temp',
    unit: '°C',
    icon: Thermometer,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800/40',
    compute: (data) =>
      data.length > 0
        ? Number((data.reduce((sum, d) => sum + (d.reeferTemp || 0), 0) / data.length).toFixed(1))
        : 0,
  },
  {
    key: 'batteryDisconnections',
    label: 'Battery Disconnects',
    unit: 'events',
    icon: Activity,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderColor: 'border-rose-200 dark:border-rose-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.batteryDisconnections || 0), 0),
  },
  {
    key: 'errorCount',
    label: 'Diagnostic Errors',
    unit: 'errors',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.errorCount || 0), 0),
  },
  {
    key: 'alertsCount',
    label: 'Dispatched Alerts',
    unit: 'alerts',
    icon: Activity,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    compute: (data) => data.reduce((sum, d) => sum + (d.alertsCount || 0), 0),
  },
];

// Helper to generate realistic rich datasets for custom reports
const generateCustomReportDataset = (): CustomReportRow[] => {
  const baseData = consolidatedReportTableData || [];
  const driverPhones = ['+91 98201 44512', '+91 97123 99821', '+91 99887 11234', '+91 98450 67123', '+91 91234 56789'];
  const fenceNames = ['Central Logistics Hub', 'JNPT Port Gate 2', 'Bhiwandi Warehouse Complex', 'Pune Industrial Zone', 'Airport Cargo Terminal'];

  return baseData.map((d, index) => {
    const matchedVehicle = mockVehicles.find((v) => v.id === d.machineId);
    const vehicleType = matchedVehicle?.type || (index % 2 === 0 ? 'Truck' : 'Tipper');
    const driver = matchedVehicle?.driver || DRIVERS[index % DRIVERS.length] || 'Driver';
    const loc = (LOCATIONS[index % LOCATIONS.length]?.name) || 'Main Yard';
    const destLoc = (LOCATIONS[(index + 2) % LOCATIONS.length]?.name) || 'Regional Hub';

    const workingHours = Number((d.workingHours || 4.5 + (index % 5) * 1.2).toFixed(1));
    const avgSpeed = Number((18 + (index % 4) * 6.5).toFixed(1));
    const distance = Number((workingHours * avgSpeed * (0.85 + (index % 3) * 0.1)).toFixed(1));
    const fuelConsumed = Number((d.fuelConsumed || distance * (0.28 + (index % 4) * 0.04)).toFixed(1));
    const fuelEfficiency = fuelConsumed > 0 ? Number((distance / fuelConsumed).toFixed(2)) : 0;

    const stoppageHours = Number((Math.max(0, 8 - workingHours) * 0.7).toFixed(1));
    const idlingHours = Number((workingHours * (0.12 + (index % 5) * 0.05)).toFixed(1));
    const totalHalt = Number((stoppageHours + idlingHours).toFixed(1));
    const idlingRatio = totalHalt > 0 ? Math.round((idlingHours / totalHalt) * 100) : 0;

    const overspeedCount = index % 3 === 0 ? 0 : (index % 4) + 1;
    const fenceViolations = index % 4 === 0 ? 1 : 0;
    const batteryDisconnected = index % 9 === 0;
    const errorCount = index % 5 === 0 ? 1 : index % 8 === 0 ? 2 : 0;

    const regNo = d.machineId || matchedVehicle?.id || `MH-02-AX-${1001 + (index % 50)}`;
    const bbid = `BB-${8000 + ((index * 37) % 2000)}`;

    return {
      id: `CR-${d.id || index + 1000}`,
      date: d.date || '2026-06-15',
      regNo,
      bbid,
      machineId: regNo,
      machineName: d.machineName || matchedVehicle?.name || `Vehicle ${index + 1}`,
      vehicleType,
      driverName: driver,
      driverMobile: driverPhones[index % driverPhones.length],
      location: loc,
      distance,
      tripCount: 1 + (index % 4),
      startLocation: loc,
      endLocation: destLoc,
      startTime: `${d.date || '2026-06-15'} 08:${String((index * 13) % 60).padStart(2, '0')}:00`,
      endTime: `${d.date || '2026-06-15'} 18:${String((index * 17) % 60).padStart(2, '0')}:00`,
      workingHours,
      cumulativeHours: Number((d.cumulativeHours || 1200 + index * 45).toFixed(0)),
      stoppageTime: stoppageHours,
      stoppageCount: 2 + (index % 5),
      idlingTime: idlingHours,
      idlingCount: 1 + (index % 3),
      totalHaltTime: totalHalt,
      idlingRatio,
      ignitionCycles: 3 + (index % 4),
      avgSpeed,
      maxSpeed: Math.round(avgSpeed * 1.6 + (index % 5) * 3),
      speedLimit: 60,
      overspeedCount,
      overspeedDuration: overspeedCount * 4,
      fuelConsumed,
      currentFuelLevel: 35 + ((index * 17) % 60),
      fuelEfficiency,
      fuelWasted: Number((idlingHours * 1.8).toFixed(1)),
      fuelFillingCount: index % 4 === 0 ? 1 : 0,
      fuelTheftCount: index % 11 === 0 ? 1 : 0,
      poisCovered: 2 + (index % 4),
      fenceViolations,
      lastFenceName: fenceNames[index % fenceNames.length],
      stayDuration: 25 + (index % 6) * 15,
      engineTemp: 78 + (index % 6) * 3,
      hydraulicTemp: 55 + (index % 5) * 4,
      reeferTemp: -18 + (index % 4) * 2,
      batteryStatus: batteryDisconnected ? 'Disconnected' : 'Connected',
      batteryDisconnections: batteryDisconnected ? 1 : 0,
      errorCount,
      lastErrorCode: errorCount > 0 ? ERROR_CODES[index % ERROR_CODES.length].code : 'None',
      serviceStatus: d.serviceStatus || (index % 6 === 0 ? 'Due Soon' : index % 11 === 0 ? 'Overdue' : 'OK'),
      nextServiceAt: Number((d.nextServiceAt || 250 - ((index * 25) % 200)).toFixed(0)),
      alertsCount: d.alertsCount || overspeedCount + fenceViolations + errorCount,
    };
  });
};

// ==========================================
// 4. MAIN CUSTOM REPORT COMPONENT
// ==========================================

const CustomReport: React.FC = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State: Columns Selection
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(['date', 'regNo', 'bbid', 'machineName', 'vehicleType', 'distance', 'workingHours', 'fuelConsumed', 'avgSpeed', 'alertsCount', 'serviceStatus'])
  );
  const [columnSearch, setColumnSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // State: 2-Step Template Creation Wizard
  const [isTemplateWizardActive, setIsTemplateWizardActive] = useState(false);
  const [wizardColumns, setWizardColumns] = useState<Set<string>>(
    new Set(['date', 'regNo', 'bbid', 'machineName', 'vehicleType', 'distance', 'workingHours', 'fuelConsumed', 'avgSpeed', 'alertsCount', 'serviceStatus'])
  );

  const currentModalColumns = isTemplateWizardActive ? wizardColumns : selectedColumns;

  // State: Column Widths & Resizing
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const savedWidths = localStorage.getItem('trackmaster_custom_report_column_widths');
      if (savedWidths) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(savedWidths) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const resizingRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const justResizedRef = useRef(false);
  const [activeResizingKey, setActiveResizingKey] = useState<string | null>(null);

  // Save column widths to localStorage when updated
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem('trackmaster_custom_report_column_widths', JSON.stringify(widths));
    } catch {
      // ignore
    }
  }, []);

  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidth = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 150;
    resizingRef.current = {
      columnKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };
    setActiveResizingKey(columnKey);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(90, Math.min(650, resizingRef.current.startWidth + deltaX));

      setColumnWidths((prev) => {
        const next = { ...prev, [resizingRef.current!.columnKey]: newWidth };
        return next;
      });
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        setColumnWidths((prev) => {
          saveColumnWidths(prev);
          return prev;
        });
      }
      resizingRef.current = null;
      setActiveResizingKey(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      justResizedRef.current = true;
      setTimeout(() => {
        justResizedRef.current = false;
      }, 150);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetColumnWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    saveColumnWidths(DEFAULT_COLUMN_WIDTHS);
    toast({
      title: 'Column Widths Reset',
      description: 'Default column proportions have been restored.',
    });
  };

  // State: Filters
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [tableSearch, setTableSearch] = useState('');
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // State: Pagination & Sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  // State: Templates
  const [templates, setTemplates] = useState<ReportTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('trackmaster_custom_templates');
      const deletedSysTemplates: string[] = JSON.parse(
        localStorage.getItem('trackmaster_deleted_system_templates') || '[]'
      );
      const activeSysTemplates = DEFAULT_TEMPLATES.filter(
        (t) => !deletedSysTemplates.includes(t.id)
      );

      if (saved) {
        const parsed = JSON.parse(saved);
        const userTemplates = parsed
          .filter((t: any) => !t.isSystem)
          .map((t: any) => ({ ...t, columns: new Set(t.columns) }));
        return [
          ...activeSysTemplates,
          ...userTemplates,
        ];
      }
      return activeSysTemplates;
    } catch {
      // ignore
    }
    return DEFAULT_TEMPLATES;
  });

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  // Load custom raw data
  const rawData = useMemo(() => generateCustomReportDataset(), []);

  // Save custom templates to localStorage whenever updated
  useEffect(() => {
    const userTemplates = templates.filter((t) => !t.isSystem);
    localStorage.setItem(
      'trackmaster_custom_templates',
      JSON.stringify(
        userTemplates.map((t) => ({
          ...t,
          columns: Array.from(t.columns),
        }))
      )
    );
  }, [templates]);

  // Tab handling
  const validSubpages = ['create', 'templates'];
  if (subpage && !validSubpages.includes(subpage)) {
    return <NotFound />;
  }
  const activeTab = subpage || 'create';

  const handleTabChange = (value: string) => {
    navigate(`/reports/custom-report/${value}`);
  };

  // Preset pack selection
  const handleApplyPresetPack = (pack: (typeof PRESET_PACKS)[0]) => {
    setSelectedColumns(new Set(pack.columns));
    toast({
      title: `Preset Applied: ${pack.name}`,
      description: `Loaded ${pack.columns.length} pre-configured parameters.`,
    });
  };

  // Column management
  const handleToggleColumn = (colKey: string) => {
    const setTarget = isTemplateWizardActive ? setWizardColumns : setSelectedColumns;
    setTarget((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        if (next.size <= 1) {
          toast({
            title: 'Minimum 1 parameter required',
            description: 'You must keep at least one parameter selected.',
            variant: 'destructive',
          });
          return prev;
        }
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
  };

  const handleSelectAllCategory = (cat: ColumnCategory | 'all') => {
    const setTarget = isTemplateWizardActive ? setWizardColumns : setSelectedColumns;
    setTarget((prev) => {
      const next = new Set(prev);
      const colsToSelect =
        cat === 'all'
          ? ALL_COLUMNS
          : ALL_COLUMNS.filter((c) => c.category === cat);
      colsToSelect.forEach((c) => next.add(c.key));
      return next;
    });
  };

  const handleDeselectCategory = (cat: ColumnCategory | 'all') => {
    const setTarget = isTemplateWizardActive ? setWizardColumns : setSelectedColumns;
    setTarget((prev) => {
      const next = new Set(prev);
      const colsToDeselect =
        cat === 'all'
          ? ALL_COLUMNS
          : ALL_COLUMNS.filter((c) => c.category === cat);
      colsToDeselect.forEach((c) => next.delete(c.key));
      if (next.size === 0) {
        next.add('date');
        next.add('machineName');
      }
      return next;
    });
  };

  // Filtering data with strict null-safety
  const filteredData = useMemo(() => {
    let result = [...rawData];

    // Filter by Date Range
    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      result = result.filter((item) => {
        try {
          if (!item.date) return true;
          const itemDate = parseISO(item.date);
          return isWithinInterval(itemDate, { start, end });
        } catch {
          return true;
        }
      });
    }

    // Filter by Vehicle
    if (selectedVehicle && selectedVehicle !== 'all') {
      const vQuery = selectedVehicle.toLowerCase();
      result = result.filter((item) => {
        const idMatch = item.machineId ? String(item.machineId).toLowerCase() === vQuery : false;
        const regMatch = item.regNo ? String(item.regNo).toLowerCase() === vQuery : false;
        const bbidMatch = item.bbid ? String(item.bbid).toLowerCase() === vQuery : false;
        const nameMatch = item.machineName ? String(item.machineName).toLowerCase().includes(vQuery) : false;
        return idMatch || regMatch || bbidMatch || nameMatch;
      });
    }

    // Filter by live text search (Ultra-safe null-checks)
    if (tableSearch && tableSearch.trim()) {
      const query = tableSearch.trim().toLowerCase();
      result = result.filter((item) => {
        const regMatch = item.regNo ? String(item.regNo).toLowerCase().includes(query) : false;
        const bbidMatch = item.bbid ? String(item.bbid).toLowerCase().includes(query) : false;
        const nameMatch = item.machineName ? String(item.machineName).toLowerCase().includes(query) : false;
        const idMatch = item.machineId ? String(item.machineId).toLowerCase().includes(query) : false;
        const driverMatch = item.driverName ? String(item.driverName).toLowerCase().includes(query) : false;
        const locMatch = item.location ? String(item.location).toLowerCase().includes(query) : false;
        const errMatch = item.lastErrorCode ? String(item.lastErrorCode).toLowerCase().includes(query) : false;
        const typeMatch = item.vehicleType ? String(item.vehicleType).toLowerCase().includes(query) : false;
        const phoneMatch = item.driverMobile ? String(item.driverMobile).toLowerCase().includes(query) : false;
        const fenceMatch = item.lastFenceName ? String(item.lastFenceName).toLowerCase().includes(query) : false;
        const statusMatch = item.serviceStatus ? String(item.serviceStatus).toLowerCase().includes(query) : false;

        return (
          regMatch ||
          bbidMatch ||
          nameMatch ||
          idMatch ||
          driverMatch ||
          locMatch ||
          errMatch ||
          typeMatch ||
          phoneMatch ||
          fenceMatch ||
          statusMatch
        );
      });
    }

    return result;
  }, [rawData, date, selectedVehicle, tableSearch]);

  // Sorting
  const sortedData = useMemo(() => {
    const sortable = [...filteredData];
    if (sortConfig.key) {
      sortable.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [filteredData, sortConfig]);

  const handleSort = (key: string) => {
    if (justResizedRef.current) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const activeColumnsList = useMemo(() => {
    return ALL_COLUMNS.filter((col) => selectedColumns.has(col.key));
  }, [selectedColumns]);

  const totalTableWidth = useMemo(() => {
    return activeColumnsList.reduce((sum, col) => {
      return sum + (columnWidths[col.key] || DEFAULT_COLUMN_WIDTHS[col.key] || 150);
    }, 0);
  }, [activeColumnsList, columnWidths]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  // Live Dynamic KPI Cards derived directly from active selected columns
  const dynamicKpiCards = useMemo(() => {
    if (filteredData.length === 0) {
      return [
        {
          key: 'empty-state',
          label: 'Total Matching Records',
          value: 0,
          unit: 'records',
          icon: FileText,
          color: 'text-muted-foreground',
          bg: 'bg-muted/40',
          borderColor: 'border-border',
        },
      ];
    }

    // Match metrics against currently selected columns
    const matched = COLUMN_METRIC_CONFIGS.filter((cfg) => selectedColumns.has(cfg.key));

    // If no numeric or direct metrics match (e.g. user selected basic non-registered columns), provide foundational fallback metrics
    if (matched.length === 0) {
      return [
        {
          key: 'records',
          label: 'Total Records',
          value: filteredData.length,
          unit: 'records',
          icon: FileText,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50/50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800/40',
        },
        {
          key: 'vehicles',
          label: 'Active Vehicles',
          value: new Set(filteredData.map((d) => d.machineId)).size,
          unit: 'units',
          icon: Layers,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
          borderColor: 'border-indigo-200 dark:border-indigo-800/40',
        },
        {
          key: 'drivers',
          label: 'Unique Drivers',
          value: new Set(filteredData.map((d) => d.driverName).filter(Boolean)).size,
          unit: 'drivers',
          icon: Users,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
          borderColor: 'border-emerald-200 dark:border-emerald-800/40',
        },
      ];
    }

    return matched.map((cfg) => ({
      key: cfg.key,
      label: cfg.label,
      value: cfg.compute(filteredData),
      unit: cfg.unit,
      icon: cfg.icon,
      color: cfg.color,
      bg: cfg.bg,
      borderColor: cfg.borderColor,
    }));
  }, [filteredData, selectedColumns]);

  // Template Management Handlers
  const handleSaveTemplate = (data: {
    name: string;
    description?: string;
    vehicle?: string;
    dateRange?: DateRange;
  }) => {
    const colsToSave = isTemplateWizardActive ? wizardColumns : selectedColumns;
    const newTemplate: ReportTemplate = {
      id: `template-${Date.now()}`,
      name: data.name,
      description: data.description,
      columns: new Set(colsToSave),
      vehicle: data.vehicle || selectedVehicle || 'all',
      dateRange: data.dateRange || date,
      isSystem: false,
    };
    setTemplates((prev) => [newTemplate, ...prev]);
    toast({
      title: 'Template Created Successfully',
      description: `"${data.name}" with ${colsToSave.size} parameters has been added to My Templates.`,
    });
    setIsSaveDialogOpen(false);
    setIsTemplateWizardActive(false);
  };

  const handleApplyTemplate = (template: ReportTemplate) => {
    setSelectedColumns(new Set(template.columns));
    setSelectedVehicle(template.vehicle);
    if (template.dateRange) {
      setDate(template.dateRange);
    }
    toast({
      title: `Loaded Template: ${template.name}`,
      description: `Loaded ${template.columns.size} parameters.`,
    });
    navigate('/reports/custom-report/create');
  };

  const handleDeleteTemplate = (templateId: string) => {
    const target = templates.find((t) => t.id === templateId);
    if (target?.isSystem) {
      try {
        const deletedSysTemplates: string[] = JSON.parse(
          localStorage.getItem('trackmaster_deleted_system_templates') || '[]'
        );
        if (!deletedSysTemplates.includes(templateId)) {
          deletedSysTemplates.push(templateId);
          localStorage.setItem(
            'trackmaster_deleted_system_templates',
            JSON.stringify(deletedSysTemplates)
          );
        }
      } catch {
        // ignore
      }
    }
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    toast({
      title: target?.isSystem ? 'System Preset Deleted' : 'Template Deleted',
      description: target ? `"${target.name}" has been removed.` : undefined,
      variant: 'destructive',
    });
  };

  const handleRestoreSystemTemplates = () => {
    try {
      localStorage.removeItem('trackmaster_deleted_system_templates');
    } catch {
      // ignore
    }
    setTemplates((prev) => {
      const userTemplates = prev.filter((t) => !t.isSystem);
      return [...DEFAULT_TEMPLATES, ...userTemplates];
    });
    toast({
      title: 'System Presets Restored',
      description: 'Default system templates have been re-enabled.',
    });
  };

  const hasDeletedSystemTemplates = useMemo(() => {
    return DEFAULT_TEMPLATES.some((dt) => !templates.some((t) => t.id === dt.id));
  }, [templates]);

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedTemplate = (updatedTemplate: ReportTemplate) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
    );
    toast({
      title: 'Template Updated',
      description: `"${updatedTemplate.name}" has been updated.`,
    });
  };

  // Export handlers
  const generateExportData = (dataToExport: CustomReportRow[]) => {
    const activeCols = ALL_COLUMNS.filter((c) => selectedColumns.has(c.key));
    return dataToExport.map((row: any) => {
      const newRow: Record<string, any> = {};
      activeCols.forEach((col) => {
        const val = row[col.key];
        newRow[col.label + (col.unit ? ` (${col.unit})` : '')] = val ?? '-';
      });
      return newRow;
    });
  };

  const handleExportPDF = () => {
    const exportData = generateExportData(sortedData);
    if (exportData.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('Trackmaster Custom Fleet Telemetry Report', 14, 15);
    doc.setFontSize(9);
    doc.text(
      `Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')} | Period: ${date?.from ? format(date.from, 'dd MMM yyyy') : 'All'} - ${date?.to ? format(date.to, 'dd MMM yyyy') : 'All'} | Records: ${exportData.length}`,
      14,
      21
    );

    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map((row) => Object.values(row).map(String));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    doc.save(`custom-fleet-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData(sortedData);
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `custom-fleet-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered columns for the column manager modal
  const filteredColumnsToDisplay = useMemo(() => {
    return ALL_COLUMNS.filter((col) => {
      const matchCat =
        activeCategoryFilter === 'all' || col.category === activeCategoryFilter;
      const q = (columnSearch || '').trim().toLowerCase();
      const matchSearch =
        !q ||
        (col.label ? col.label.toLowerCase().includes(q) : false) ||
        (col.key ? col.key.toLowerCase().includes(q) : false);
      return matchCat && matchSearch;
    });
  }, [activeCategoryFilter, columnSearch]);

  // Formatter for table values
  const renderCellContent = (row: CustomReportRow, colKey: string) => {
    const val = (row as any)[colKey];

    if (val === undefined || val === null || val === '') {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (colKey) {
      case 'serviceStatus':
        return (
          <Badge
            variant={
              val === 'OK'
                ? 'secondary'
                : val === 'Due Soon'
                  ? 'default'
                  : 'destructive'
            }
            className="text-[11px] font-medium"
          >
            {val}
          </Badge>
        );
      case 'batteryStatus':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
              val === 'Connected'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                val === 'Connected' ? 'bg-emerald-500' : 'bg-red-500'
              )}
            />
            {val}
          </span>
        );
      case 'currentFuelLevel':
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  val > 50 ? 'bg-emerald-500' : val > 20 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
              />
            </div>
            <span className="text-xs font-medium">{val}%</span>
          </div>
        );
      case 'overspeedCount':
        return val > 0 ? (
          <Badge variant="destructive" className="font-semibold text-xs px-2 py-0.5">
            {val} alert(s)
          </Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        );
      case 'errorCount':
        return val > 0 ? (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
            {val} Error(s)
          </Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        );
      case 'idlingRatio':
        return (
          <span
            className={cn(
              'font-semibold text-xs',
              val > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
            )}
          >
            {val}%
          </span>
        );
      case 'regNo':
        return <span className="font-semibold font-mono text-foreground">{val}</span>;
      case 'bbid':
        return (
          <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
            {val}
          </span>
        );
      case 'machineName':
        return <span className="font-semibold text-foreground">{val}</span>;
      case 'distance':
        return <span className="font-semibold text-blue-600 dark:text-blue-400">{val} km</span>;
      case 'fuelConsumed':
        return <span className="font-medium text-emerald-600 dark:text-emerald-400">{val} L</span>;
      case 'workingHours':
        return <span className="font-medium">{val} hrs</span>;
      default:
        return <span className="truncate block max-w-full">{String(val)}</span>;
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Navigation Tab Header */}
        <div className="px-6 bg-card border-b">
          <div className="flex items-baseline justify-between py-2">
            <div className="flex items-baseline gap-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Custom Report Generator
              </h1>
              <TabsList>
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Create Report
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  My Templates ({templates.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {ALL_COLUMNS.length} Available Telemetry Parameters
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* TAB 1: CREATE CUSTOM REPORT */}
          <TabsContent value="create" className="space-y-6 m-0">
            {/* Quick Preset Packs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                  Quick Parameter Packs
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setIsTemplateWizardActive(false);
                    setIsColumnModalOpen(true);
                  }}
                  className="h-auto p-0 text-xs font-semibold text-blue-600 dark:text-blue-400"
                >
                  Manage All {ALL_COLUMNS.length} Columns ({selectedColumns.size} Selected)
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {PRESET_PACKS.map((pack) => {
                  const Icon = pack.icon;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => handleApplyPresetPack(pack)}
                      className={cn(
                        'flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-card',
                        pack.color
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className="h-4 w-4 text-foreground" />
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground border">
                          {pack.badge}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-foreground line-clamp-1">
                        {pack.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {pack.columns.length} parameters
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter & Control Bar */}
            <Card className="shadow-sm border">
              <CardContent className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Date Range Picker */}
                  <DateRangePicker date={date} setDate={setDate} />

                  {/* Vehicle Selector */}
                  <VehicleCombobox
                    vehicles={mockVehicles}
                    value={selectedVehicle}
                    onChange={setSelectedVehicle}
                    className="w-full sm:w-[200px]"
                  />

                  {/* Search within Results */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vehicle, driver, location, errors..."
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setPage(0);
                      }}
                      className="pl-8 h-9 text-xs"
                    />
                    {tableSearch && (
                      <button
                        onClick={() => {
                          setTableSearch('');
                          setPage(0);
                        }}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Manage Columns Dialog Trigger */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTemplateWizardActive(false);
                      setIsColumnModalOpen(true);
                    }}
                    className="flex items-center gap-2 h-9 text-xs"
                  >
                    <Settings2 className="h-4 w-4" />
                    Columns ({selectedColumns.size})
                  </Button>

                  {/* Save as Template */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTemplateWizardActive(false);
                      setIsSaveDialogOpen(true);
                    }}
                    className="flex items-center gap-2 h-9 text-xs"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Save Template
                  </Button>

                  {/* Export Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-foreground text-background hover:bg-foreground/90 h-9 text-xs">
                        <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={handleExportPDF}>
                        <FileText className="mr-2 h-4 w-4 text-red-500" /> Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleExportCSV}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Export as Excel (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <WhatsappPopup />
                </div>
              </CardContent>
            </Card>

            {/* Active Selected Columns Tags Bar */}
            <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-muted/40 rounded-lg border text-xs">
              <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Active Columns ({selectedColumns.size}):
              </span>
              {ALL_COLUMNS.filter((c) => selectedColumns.has(c.key)).map((col) => (
                <Badge
                  key={col.key}
                  variant="secondary"
                  className="gap-1.5 pl-2 pr-1 py-0.5 font-normal bg-background border text-foreground"
                >
                  {col.label}
                  <button
                    onClick={() => handleToggleColumn(col.key)}
                    className="hover:bg-muted rounded p-0.5 text-muted-foreground hover:text-foreground"
                    title="Remove column"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsColumnModalOpen(true)}
                className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400"
              >
                + Add / Remove
              </Button>
            </div>

            {/* Dynamic Computed KPI Stat Highlights Based on Selected Columns */}
            {dynamicKpiCards.length > 0 && (
              <div
                className="grid gap-3 w-full"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                }}
              >
                {dynamicKpiCards.map((card) => {
                  const IconComp = card.icon;
                  return (
                    <Card
                      key={card.key}
                      className={cn(
                        'border shadow-sm p-3.5 transition-all duration-200 hover:shadow-md relative overflow-hidden flex flex-col justify-between',
                        card.bg,
                        card.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
                          {card.label}
                        </p>
                        {IconComp && (
                          <IconComp className={cn('h-3.5 w-3.5 shrink-0 opacity-75', card.color)} />
                        )}
                      </div>
                      <p className={cn('text-xl font-bold tracking-tight mt-1', card.color)}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}{' '}
                        {card.unit && (
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">
                            {card.unit}
                          </span>
                        )}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Custom Report Data Table */}
            <Card className="shadow-sm overflow-hidden border">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-3.5 border-b bg-card">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Custom Generated Report Results
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Displaying {sortedData.length} records with {selectedColumns.size} active columns. Drag column borders to resize.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reset Widths Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetColumnWidths}
                    className="h-8 text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    title="Reset column widths to default"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Widths
                  </Button>

                  {/* Density Mode */}
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border text-xs">
                    <button
                      onClick={() => setTableDensity('comfortable')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-medium',
                        tableDensity === 'comfortable' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      Comfortable
                    </button>
                    <button
                      onClick={() => setTableDensity('compact')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-medium',
                        tableDensity === 'compact' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      Compact
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto select-none w-full">
                  <Table
                    style={{ width: `${Math.max(1000, totalTableWidth)}px`, minWidth: `${Math.max(1000, totalTableWidth)}px`, tableLayout: 'fixed' }}
                    className="relative border-collapse"
                  >
                    <colgroup>
                      {activeColumnsList.map((col) => {
                        const colWidth = columnWidths[col.key] || DEFAULT_COLUMN_WIDTHS[col.key] || 150;
                        return (
                          <col
                            key={col.key}
                            style={{
                              width: `${colWidth}px`,
                              minWidth: `${colWidth}px`,
                              maxWidth: `${colWidth}px`,
                            }}
                          />
                        );
                      })}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                        {activeColumnsList.map((column, idx) => {
                          const colWidth = columnWidths[column.key] || DEFAULT_COLUMN_WIDTHS[column.key] || 150;
                          const isResizingThis = activeResizingKey === column.key;

                          return (
                            <TableHead
                              key={column.key}
                              style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                              className={cn(
                                'relative px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group transition-colors whitespace-nowrap select-none overflow-visible',
                                idx === 0 && 'sticky left-0 bg-muted/95 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]'
                              )}
                            >
                              <div
                                className="flex items-center justify-between gap-1.5 cursor-pointer pr-3 overflow-hidden select-none"
                                onClick={() => handleSort(column.key)}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="truncate">{column.label}</span>
                                  {column.unit && (
                                    <span className="lowercase text-[10px] text-muted-foreground/80 font-normal shrink-0">
                                      ({column.unit})
                                    </span>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  {sortConfig.key === column.key ? (
                                    sortConfig.direction === 'asc' ? (
                                      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                                    ) : (
                                      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                                    )
                                  ) : (
                                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100" />
                                  )}
                                </div>
                              </div>

                              {/* Interactive Drag Handle for Column Resizing */}
                              <div
                                onMouseDown={(e) => handleResizeStart(e, column.key)}
                                className={cn(
                                  'absolute top-0 -right-2 bottom-0 w-4 cursor-col-resize flex items-center justify-center group/handle z-30 transition-colors pointer-events-auto',
                                  isResizingThis ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'
                                )}
                                title="Drag to adjust column width"
                              >
                                <div
                                  className={cn(
                                    'w-[2px] h-4/5 rounded-full transition-colors',
                                    isResizingThis
                                      ? 'bg-blue-600 dark:bg-blue-400 w-[3px]'
                                      : 'bg-muted-foreground/30 group-hover/handle:bg-blue-500 group-hover/handle:w-[3px]'
                                  )}
                                />
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={activeColumnsList.length || 1}
                            className="h-32 text-center text-muted-foreground text-sm"
                          >
                            No records found matching your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedData.map((row) => (
                          <TableRow
                            key={row.id}
                            className="bg-card hover:bg-muted/40 border-b transition-colors"
                          >
                            {activeColumnsList.map((col, idx) => {
                              const colWidth = columnWidths[col.key] || DEFAULT_COLUMN_WIDTHS[col.key] || 150;

                              return (
                                <TableCell
                                  key={col.key}
                                  style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                                  className={cn(
                                    'whitespace-nowrap text-sm text-foreground overflow-hidden text-ellipsis',
                                    tableDensity === 'comfortable' ? 'px-3 py-3' : 'px-3 py-1.5 text-xs',
                                    idx === 0 && 'sticky left-0 bg-card z-10 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.05)]'
                                  )}
                                >
                                  {renderCellContent(row, col.key)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rows per page:</span>
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(val) => {
                      setRowsPerPage(Number(val));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue placeholder={rowsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {sortedData.length > 0
                      ? `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedData.length)} of ${sortedData.length}`
                      : '0 of 0'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(0)}
                      disabled={page === 0}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(totalPages - 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TAB 2: MY TEMPLATES */}
          <TabsContent value="templates" className="space-y-6 m-0">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Saved & System Report Templates</CardTitle>
                  <CardDescription>
                    Quickly launch saved column configurations and automated presets.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hasDeletedSystemTemplates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreSystemTemplates}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore Default Presets
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setIsTemplateWizardActive(true);
                      setWizardColumns(
                        new Set([
                          'date',
                          'regNo',
                          'bbid',
                          'machineName',
                          'vehicleType',
                          'distance',
                          'workingHours',
                          'fuelConsumed',
                          'avgSpeed',
                          'alertsCount',
                          'serviceStatus',
                        ])
                      );
                      setIsColumnModalOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 border-b">
                        <TableHead className="px-6 py-3">Template Name & Description</TableHead>
                        <TableHead className="px-6 py-3">Target Fleet</TableHead>
                        <TableHead className="px-6 py-3">Included Parameters</TableHead>
                        <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                            No templates found. Click "Create New Template" or "Restore Default Presets" to add templates.
                          </TableCell>
                        </TableRow>
                      ) : (
                        templates.map((template) => (
                          <TableRow key={template.id} className="hover:bg-muted/30 border-b">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{template.name}</span>
                                {template.isSystem && (
                                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                                    System Preset
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {template.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm">
                              {template.vehicle === 'all' ? 'All Vehicles' : template.vehicle}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                                <Badge variant="outline" className="font-bold text-xs bg-muted/40">
                                  {template.columns.size} Columns
                                </Badge>
                                {Array.from(template.columns)
                                  .slice(0, 4)
                                  .map((colKey) => {
                                    const col = ALL_COLUMNS.find((c) => c.key === colKey);
                                    return (
                                      <span
                                        key={colKey}
                                        className="text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground"
                                      >
                                        {col?.label || colKey}
                                      </span>
                                    );
                                  })}
                                {template.columns.size > 4 && (
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    +{template.columns.size - 4} more
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApplyTemplate(template)}
                                  className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90"
                                >
                                  Apply Template
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Configuration
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete {template.isSystem ? 'Preset' : 'Template'}
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete {template.isSystem ? 'System Preset' : 'Template'}?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {template.isSystem
                                              ? `Are you sure you want to delete the system preset "${template.name}"? You can restore default presets anytime.`
                                              : `Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteTemplate(template.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* ==========================================
          5. MODAL: FULL COLUMN & PARAMETER MANAGER
         ========================================== */}
      <Dialog
        open={isColumnModalOpen}
        onOpenChange={(open) => {
          setIsColumnModalOpen(open);
          if (!open && isTemplateWizardActive) {
            setIsTemplateWizardActive(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-brand-orange" />
                  {isTemplateWizardActive
                    ? 'Step 1: Select Template Parameters'
                    : 'Select Report Parameters'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {isTemplateWizardActive
                    ? `Choose telemetry parameters to include in your new template (${currentModalColumns.size} selected).`
                    : `Choose from all ${ALL_COLUMNS.length} available parameters to build your personalized report.`}
                </DialogDescription>
              </div>
              <Badge variant="secondary" className="font-bold text-xs">
                {currentModalColumns.size} / {ALL_COLUMNS.length} Selected
              </Badge>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setActiveCategoryFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0',
                    activeCategoryFilter === 'all'
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({ALL_COLUMNS.length})
                </button>
                {(Object.keys(CATEGORY_INFO) as ColumnCategory[]).map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const count = ALL_COLUMNS.filter((c) => c.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 flex items-center gap-1',
                        activeCategoryFilter === cat
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{info.label}</span>
                      <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search parameter..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Column Checkboxes Grid */}
          <ScrollArea className="flex-1 p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-6">
              {(Object.keys(CATEGORY_INFO) as ColumnCategory[])
                .filter(
                  (cat) =>
                    activeCategoryFilter === 'all' || activeCategoryFilter === cat
                )
                .map((cat) => {
                  const catColumns = filteredColumnsToDisplay.filter((c) => c.category === cat);
                  if (catColumns.length === 0) return null;

                  const info = CATEGORY_INFO[cat];
                  const Icon = info.icon;
                  const allSelectedInCat = catColumns.every((c) => currentModalColumns.has(c.key));

                  return (
                    <div key={cat} className="space-y-2.5">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1 rounded', info.bg)}>
                            <Icon className={cn('h-4 w-4', info.color)} />
                          </div>
                          <h4 className="font-bold text-sm text-foreground">{info.label}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              allSelectedInCat
                                ? handleDeselectCategory(cat)
                                : handleSelectAllCategory(cat)
                            }
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            {allSelectedInCat ? 'Deselect Category' : 'Select All in Category'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {catColumns.map((col) => {
                          const isChecked = currentModalColumns.has(col.key);
                          return (
                            <label
                              key={col.key}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-150 text-xs',
                                isChecked
                                  ? 'bg-blue-50/60 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 font-medium text-foreground'
                                  : 'bg-card hover:bg-muted/50 border-muted text-muted-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleColumn(col.key)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{col.label}</span>
                              </div>
                              {col.unit && (
                                <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                                  {col.unit}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAllCategory('all')}
                className="text-xs"
              >
                Select All ({ALL_COLUMNS.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeselectCategory('all')}
                className="text-xs text-red-500"
              >
                Reset to Default
              </Button>
            </div>
            {isTemplateWizardActive ? (
              <Button
                onClick={() => {
                  if (wizardColumns.size === 0) {
                    toast({
                      title: 'Select Parameters',
                      description: 'Please select at least 1 parameter for your template.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setIsColumnModalOpen(false);
                  setIsSaveDialogOpen(true);
                }}
                className="bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold"
              >
                Next: Template Details → ({wizardColumns.size} Selected)
              </Button>
            ) : (
              <Button
                onClick={() => setIsColumnModalOpen(false)}
                className="bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold"
              >
                Done & Apply ({selectedColumns.size} Columns)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save & Edit Dialogs */}
      <SaveTemplateDialog
        open={isSaveDialogOpen}
        onOpenChange={(open) => {
          setIsSaveDialogOpen(open);
          if (!open) {
            setIsTemplateWizardActive(false);
          }
        }}
        onSave={handleSaveTemplate}
        isWizard={isTemplateWizardActive}
        selectedColumnCount={isTemplateWizardActive ? wizardColumns.size : selectedColumns.size}
        initialVehicle={selectedVehicle}
        initialDateRange={date}
        onBack={
          isTemplateWizardActive
            ? () => {
                setIsSaveDialogOpen(false);
                setIsColumnModalOpen(true);
              }
            : undefined
        }
      />
      <EditTemplateDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={editingTemplate}
        onSave={handleSaveEditedTemplate}
      />
    </>
  );
};
export default CustomReport;