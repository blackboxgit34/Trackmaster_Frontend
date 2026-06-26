import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Signal, SignalMedium, SignalHigh, SignalZero, TriangleAlert, BatteryFull, BatteryMedium, BatteryLow,
  Gauge, Clock, Share2, MapPin, Play, Copy, Thermometer, Wrench, BatteryWarning, AirVent, Power,
  Pause,  Hand, Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LiveVehicleStatus, VehicleStatus } from '@/types';
import FuelGauge from './FuelGauge';
import { useToast } from '@/hooks/use-toast';
import ShareLocationDialog from './ShareLocationDialog';
import { format, parse , isValid, parseISO } from 'date-fns';
import BlackboxSignalIcon from '../icons/BlackboxSignalIcon';
import SpeedGauge from './SpeedGauge';
import { getIconUrl, getVehiclePngUrl } from '@/lib/map-utils';


const DeviceSignalIcon = ({

  gpsAntConStatus,
  GPSFix,
}: {
  gpsAntConStatus: number | null;
  GPSFix: number | null;
}) => {
  let text = 'Unknown';
  let color = 'text-muted-foreground';
  let Icon;
  switch (true) {
    case gpsAntConStatus === 1 && GPSFix === 2:
      Icon = Signal;
      text = 'Full GPS Signal';
      color = 'green';
      break;

    case gpsAntConStatus === 1 && GPSFix === 1:
      Icon = SignalMedium;
      text = 'Low GPS Signal';
      color = 'yellow';
      break;

    case gpsAntConStatus === 1 && GPSFix === 0:
      Icon = SignalZero;
      text = 'GPS Antena Connected But No GPS Signal';
      color = 'red';
      break;

    case gpsAntConStatus === 0:
      Icon = TriangleAlert;
      text = 'GPS Antena Disconnected';
      color = 'gray';
      break;

    default:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'gray';
      break;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center justify-center">
            <img src={`/icons/system%20status%20icons/gps-${color}.svg`} alt="GPS Signal" className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>GPS Signal: {text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


const GsmSignalIcon = ({ signal }: { signal: number }) => {
  let Icon, text, color;

  switch (true) {
    case signal == null:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'gray';
      break;
    // No GSM Signal
    case signal > 31:
      Icon = SignalZero;
      text = 'No GSM Signal';
      color = 'red';
      break;

    // Excellent GSM Signal
    case signal < 32 && signal >= 25:
      Icon = Signal;
      text = 'Full GSM Signal';
      color = 'green';
      break;

    // Good GSM Signal
    case signal < 25 && signal >= 20:
      Icon = SignalHigh;
      text = 'Low GSM Signal';
      color = 'green';
      break;

    // InSufficient GSM Signal
    case signal < 20 && signal >= 10:
      Icon = SignalMedium;
      text = 'Very Low GSM Signal';
      color = 'yellow';
      break;

    // GSM Signal Very Low
    case signal < 10:
      Icon = SignalZero;
      text = 'No GSM Signal';
      color = 'text-orange-500';
      break;

    // Default
    default:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'gray';
      break;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center justify-center">
            <img src={`/icons/system%20status%20icons/gsm-${color}.svg`} alt="GSM Signal" className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>GSM Signal: {text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const BatteryIcon = ({ battery, tooltipLabel }: { battery: number; tooltipLabel: string }) => {
  let Icon, text, color;
  switch (true) {
    case battery == null:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'red';
      break;

    case battery >= 12.5:
      Icon = BatteryFull;
      text = 'High';
      color = 'green';
      break;


    case battery < 12.5 && battery >= 10:
      Icon = BatteryMedium;
      text = 'Low';
      color = 'lime';
      break;


    case battery < 10 && battery >= 5:
      Icon = BatteryLow;
      text = 'Very Low';
      color = 'yellow';
      break;


    case battery < 5:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'red';
      break;

    default:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'red';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center justify-center">
            <img src={`/icons/system%20status%20icons/device-battery-${color}.svg`} alt={tooltipLabel} className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>{tooltipLabel}: {text} ({battery}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

};

const BatteryIconDevice = ({ deviceBattery, tooltipLabel }: { deviceBattery: number; tooltipLabel: string }) => {
  let Icon, text, color;
  switch (true) {
    case deviceBattery == null:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'red';
      break;

    case deviceBattery == 33:
      Icon = BatteryFull;
      text = 'High';
      color = 'green';
      break;


    case deviceBattery == 2:
      Icon = BatteryMedium;
      text = 'Low';
      color = 'lime';
      break;

    case deviceBattery == 1:
      Icon = BatteryLow;
      text = 'Very Low';
      color = 'yellow';
      break;

    default:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'red';
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center justify-center">
            <img src={`/icons/system%20status%20icons/vehicle-battery-${color}.svg`} alt={tooltipLabel} className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>
            {tooltipLabel}: {text} ({deviceBattery}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DistanceDisplay = ({ distance }: { distance: number }) => {

  
  // Format to have up to 4 integer digits and 1 decimal digit.
  const distanceString = distance.toFixed(1);
  const [integerPart, decimalPart] = distanceString.split('.');
  const paddedIntegerPart = integerPart.padStart(4, '0');
  
  const integerDigits = paddedIntegerPart.split('');
  const decimalDigits = decimalPart.split('');

  return (
    <div className="flex items-center gap-2">
      <h4 className="text-xs font-semibold text-muted-foreground">DISTANCE (KM)</h4>
      <div className="flex items-center gap-1">
        {integerDigits.map((digit, index) => (
          <div key={`int-${index}`} className="bg-muted text-foreground font-mono font-bold text-base w-5 h-7 flex items-center justify-center rounded-sm">
            {digit}
          </div>
        ))}
        {decimalDigits.map((digit, index) => (
          <div key={`dec-${index}`} className="bg-blue-500 text-white font-mono font-bold text-base w-5 h-7 flex items-center justify-center rounded-sm">
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
};
const formatHoursMinutes = (hoursDecimal: number, format: 'short' | 'long' = 'short') => {
  const hours = Math.floor(hoursDecimal);
  const minutes = Math.round((hoursDecimal - hours) * 60);
  if (format === 'long') {
    return `${hours} H ${minutes} M`;
  }
  return `${hours}h ${minutes}m`;
};

interface VehicleDataSidebarProps {
  machine: LiveVehicleStatus;
  onRecenter: (vehicle: LiveVehicleStatus) => void;
}

const VehicleDataSidebar = ({ machine: vehicle, onRecenter }: VehicleDataSidebarProps) => {
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const alertCounts = useMemo(() => {
    const counts: { [key: string]: number } = {
        'High RPM': 0,
        'Engine Temp': 0,
        'Geofencing': 0,
        'Low Battery': 0,
        'Service': 0,
    };

    vehicle.alertDetails.forEach(alertType => {
        if (counts.hasOwnProperty(alertType)) {
            counts[alertType]++;
        }
    });

    return {
      ...counts,
      'Error Code': vehicle.errors,
    };
  }, [vehicle]);

  const alertIcons = {
    'High RPM': { icon: Gauge, color: 'text-indigo-500', slug: 'high-rpm' },
    'Engine Temp': { icon: Thermometer, color: 'text-red-500', slug: 'engine-temp' },
    'Geofencing': { icon: MapPin, color: 'text-blue-500', slug: 'geofencing' },
    'Low Battery': { icon: BatteryWarning, color: 'text-orange-500', slug: 'low-battery' },
    'Service': { icon: Wrench, color: 'text-green-500', slug: 'service' },
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: text,
    });
  };

  const getStatusBadgeClasses = (status: VehicleStatus) => {
    const styles: Record<VehicleStatus, string> = {
      Moving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      Parked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Ignition On': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      Unreachable: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
      'Battery Disconnect': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      Breakdown: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'High Speed': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      Towed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Idle: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

const formatDuration = (minutes: number) => {
  if (isNaN(minutes) || minutes < 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
};

const playbackDate = useMemo(() => {
  try {
    const parsedDate = parseISO(vehicle.lastUpdated);

    if (!isValid(parsedDate)) {
      console.error('Invalid date:', vehicle.lastUpdated);
      return todayStr;
    }
    debugger

    console.log(parsedDate );
    console.log(vehicle.lastUpdated);
    return format(parsedDate, 'yyyy-MM-dd');
  } catch (e) {
    console.error('Failed to parse date for playback link:', e);
    return todayStr;
  }
}, [vehicle.lastUpdated, todayStr]);


  const stopTimeHours = Math.floor(vehicle.stoppageTime);
  // const stopTimeMinutes = Math.round((vehicle.idlingHours - stopTimeHours) * 60);

  return (
    <>
      <div className="flex flex-col w-full h-full overflow-hidden bg-card">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Header */}
            {/* Row 1: Vehicle Number + Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold" title={vehicle.vehicleNo}>{vehicle.vehicleNo.length > 10 ? vehicle.vehicleNo.slice(0, 10) + '...' : vehicle.vehicleNo}</h3>
              <span className={cn('px-4 py-1 text-xs font-medium rounded-full shrink-0', getStatusBadgeClasses(vehicle.status))}>
                {vehicle.status}
              </span>
            </div>

            {/* Row 2: Vehicle Image + Details */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 flex items-center justify-center shrink-0">
                <img
                  src={getVehiclePngUrl(vehicle.type)}
                  alt={vehicle.type}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=200&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="flex flex-col justify-center min-w-0 py-1">
                <p className="text-sm text-muted-foreground">Model: {vehicle.model}</p>
                <p className="text-sm text-muted-foreground">Type: {vehicle.type}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground truncate" title={vehicle.bbid}>BBID: {vehicle.bbid}</p>
                  <Copy className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0" onClick={() => handleCopy(vehicle.bbid, 'BBID')} />
                </div>
              </div>
            </div>

            {/* Distance Display Segment */}
            <DistanceDisplay distance={vehicle.distance} />

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-blue-500">{vehicle.location}</p>
                <p className="text-xs text-muted-foreground">Last Updated: {vehicle.lastUpdated}</p>
              </div>
            </div>

            {/* Gauges */}
            <div className="flex items-center justify-around pb-2">
              {vehicle.sensorStatus === 'ok' && <FuelGauge fuelLevel={vehicle.fuelLevel} fuelLiters={vehicle.fuelLiters} />}
              <SpeedGauge speed={vehicle.speed} />
            </div>

            {/* Stacked Stats - Clean Grid layout */}
            <div className="flex flex-col gap-3 pt-2">

              {/* Total Distance */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-[14px] bg-card shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Distance</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{vehicle.distance.toFixed(1)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5">km</span>
                </div>
              </div>

              {/* Travel Time */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-[14px] bg-card shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Travel Time</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{Math.floor(vehicle.workingHours)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5 mr-1.5">h</span>
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{Math.round((vehicle.workingHours % 1) * 60)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5">m</span>
                </div>
              </div>

              {/* Total Halt */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-[14px] bg-card shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                    <Hand className="h-5 w-5 text-red-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Halt</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{Math.floor(vehicle.idlingHours)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5 mr-1.5">h</span>
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{Math.round((vehicle.idlingHours % 1) * 60)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5">m</span>
                </div>
              </div>

              {/* Moving from last halt */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-[14px] bg-card shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0">
                    <Navigation className="h-5 w-5 text-green-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Moving from last halt</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[19px] font-bold text-foreground tracking-tight">{(vehicle.distance % 12).toFixed(1)}</span>
                  <span className="text-[11px] text-muted-foreground font-normal ml-0.5">km</span>
                </div>
              </div>

            </div>

            {/* System Status */}
            <div className="space-y-3 pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground">System Status</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">AC Status</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button>
                        <AirVent className={cn("h-5 w-5", vehicle.acStatus === true ? 'text-green-500' : 'text-red-500')} strokeWidth={1.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AC Status: {vehicle.acStatus}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Ignition Status</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button>
                        <Power className={cn("h-5 w-5", vehicle.ignitionStatus === true ? 'text-green-500' : 'text-red-500')} strokeWidth={1.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ignition Status: {vehicle.ignitionStatus}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">GSM Signal</span>
                <GsmSignalIcon signal={vehicle.gsmSignal} />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">GPS Signal</span>
                <DeviceSignalIcon
                  gpsAntConStatus={vehicle.deviceSignal}
                  GPSFix={vehicle.GPSFix}
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Vehicle Battery</span>
                <BatteryIconDevice deviceBattery={vehicle.gpsDeviceBattery} tooltipLabel="Blackbox Battery" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Blackbox Battery</span>
                <BatteryIcon battery={vehicle.battery} tooltipLabel="Vehicle Battery" />
              </div>
            </div>

<<<<<<< HEAD
            {false && (
              <Card>
                
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Alerts</CardTitle>
                </CardHeader>

                <CardContent className="p-2">
                  <div className="space-y-1">
                    {Object.entries(alertIcons).map(([name, { icon: Icon, color, slug }]) => {
                      const count = alertCounts[name as keyof typeof alertCounts] || 0;

                      return (
                        <Link
                          key={name}
                          to={`/alerts/${slug}?vehicle=${vehicle.vehicleNo}&from=${todayStr}&to=${todayStr}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", color)} />
                            <span className="text-sm font-medium">{name}</span>
                          </div>

                          <div
                            className={cn(
                              "flex items-center justify-center h-6 min-w-[24px] px-1 rounded-full text-xs font-bold",
                              count > 0
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {count}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
=======
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-medium">Alerts</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {Object.entries(alertIcons).map(([name, { icon: Icon, color, slug }]) => {
                    const count = alertCounts[name as keyof typeof alertCounts] || 0;
                    return (
                      <Link
                        key={name}
                        to={`/alerts/${slug}?vehicle=${vehicle.vehicleNo}&from=${todayStr}&to=${todayStr}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-5 w-5", color)} strokeWidth={1.5} />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <div className={cn(
                          "flex items-center justify-center h-6 min-w-[24px] px-1 rounded-full text-xs font-bold",
                          count > 0 ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                        )}>
                          {count}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
>>>>>>> f6018d33add463e20509e9d741261d958eab3269
          </div>
        </ScrollArea>
        {/* Footer Actions */}
        <div className="p-4 border-t shrink-0 grid grid-cols-3 gap-2">
          <Button variant="outline" className="flex flex-col h-16 gap-1 font-medium" onClick={() => onRecenter(vehicle)}>
            <MapPin className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">Recenter</span>
          </Button>
          <Button asChild variant="outline" className="flex flex-col h-16 gap-1 font-medium">
            <Link to={`/vehicle-status/route-playback?vehicle=${vehicle.vehicleNo}&date=${playbackDate}`}>
              <Play className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-xs">Playback</span>
            </Link>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 gap-1 font-medium" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      </div>
      <ShareLocationDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        vehicle={vehicle}
      />
    </>
  );
};

export default VehicleDataSidebar;