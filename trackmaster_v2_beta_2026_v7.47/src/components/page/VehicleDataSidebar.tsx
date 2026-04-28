import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Signal, SignalMedium, SignalHigh, SignalZero, TriangleAlert, BatteryFull, BatteryMedium, BatteryLow,
  Gauge, Clock, Share2, MapPin, Play, Copy, Thermometer, Wrench, BatteryWarning, AirVent, Power,
  Pause
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
import { format, parse } from 'date-fns';
import BlackboxSignalIcon from '../icons/BlackboxSignalIcon';
import SpeedGauge from './SpeedGauge';

const DeviceSignalIcon = ({ signal }: { signal: number }) => {
  let text, color;
  switch (signal) {
    case 0: text = 'Disconnected'; color = 'text-red-500'; break;
    case 1: case 2: text = 'Low'; color = 'text-yellow-500'; break;
    case 3: text = 'Normal'; color = 'text-lime-500'; break;
    case 4: text = 'Excellent'; color = 'text-green-500'; break;
    default: text = 'Unknown'; color = 'text-muted-foreground';
  }
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild><button><BlackboxSignalIcon className={cn('h-5 w-5', color)} /></button></TooltipTrigger><TooltipContent><p>GPS Signal: {text}</p></TooltipContent></Tooltip></TooltipProvider>
  );
};

const GsmSignalIcon = ({ signal }: { signal: number }) => {
  let Icon, text, color;
  switch (signal) {
    case 0: Icon = TriangleAlert; text = 'No Signal'; color = 'text-red-500'; break;
    case 1: case 2: Icon = SignalMedium; text = 'Low'; color = 'text-yellow-500'; break;
    case 3: Icon = SignalHigh; text = 'Normal'; color = 'text-lime-500'; break;
    case 4: Icon = Signal; text = 'Excellent'; color = 'text-green-500'; break;
    default: Icon = SignalZero; text = 'Unknown'; color = 'text-muted-foreground';
  }
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild><button><Icon className={cn('h-5 w-5', color)} /></button></TooltipTrigger><TooltipContent><p>GSM Signal: {text}</p></TooltipContent></Tooltip></TooltipProvider>
  );
};

const BatteryIcon = ({ level, tooltipLabel }: { level: number; tooltipLabel: string }) => {
  let Icon, text, color;
  if (level > 70) { Icon = BatteryFull; text = 'High'; color = 'text-green-500'; }
  else if (level > 30) { Icon = BatteryMedium; text = 'Medium'; color = 'text-yellow-500'; }
  else { Icon = BatteryLow; text = 'Low'; color = 'text-red-500'; }
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild><button><Icon className={cn('h-5 w-5', color)} /></button></TooltipTrigger><TooltipContent><p>{tooltipLabel}: {text} ({level}%)</p></TooltipContent></Tooltip></TooltipProvider>
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

  const playbackDate = useMemo(() => {
    try {
      const parsedDate = parse(vehicle.lastUpdated, 'dd-MMM-yyyy hh:mm:ss a', new Date());
      return format(parsedDate, 'yyyy-MM-dd');
    } catch (e) {
      console.error("Failed to parse date for playback link:", e);
      return format(new Date(), 'yyyy-MM-dd'); // Fallback to today
    }
  }, [vehicle.lastUpdated]);

  const stopTimeHours = Math.floor(vehicle.idlingHours);
  const stopTimeMinutes = Math.round((vehicle.idlingHours - stopTimeHours) * 60);

  return (
    <>
      <div className="flex flex-col w-full h-full overflow-hidden bg-card">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <img
                src="https://www.yanmar.com/ltc/global/construction/products/excavator/vio20/img/e666979970/img_mainvisual_top_01_sp.jpg"
                alt={vehicle.type}
                className="h-16 w-16 object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{vehicle.vehicleNo}</h3>
                  <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full', getStatusBadgeClasses(vehicle.status))}>
                    {vehicle.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Model: {vehicle.model}</p>
                <p className="text-sm text-muted-foreground">Type: {vehicle.type}</p>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  Vehicle ID: {vehicle.id}
                  <Copy className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => handleCopy(vehicle.id, 'Vehicle ID')} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  BBID: 559493339504954
                  <Copy className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => handleCopy('559493339504954', 'BBID')} />
                </div>
              </div>
            </div>

            {/* Distance */}
            <DistanceDisplay distance={vehicle.distance} />

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-500">{vehicle.location}</p>
                <p className="text-xs text-muted-foreground">Last Updated: {vehicle.lastUpdated}</p>
              </div>
            </div>

            {/* Gauges */}
            <div className="flex items-center justify-around">
              {vehicle.sensorStatus === 'ok' && <FuelGauge fuelLevel={vehicle.fuelLevel} fuelLiters={vehicle.fuelLiters} />}
              <SpeedGauge speed={vehicle.speed} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 mb-2">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-muted-foreground uppercase">Driven</p>
                <p className="text-xl font-bold">
                  {vehicle.distance.toFixed(1)}
                  <span className="text-sm font-medium text-muted-foreground ml-1">km</span>
                </p>
              </div>

              <div className="p-4 flex flex-col items-center justify-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-2">
                  <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                </div>
                <p className="text-xs text-muted-foreground uppercase">Stop Time</p>
                <p className="text-xl font-bold">
                  {stopTimeHours}
                  <span className="text-sm font-medium text-muted-foreground">h</span> {stopTimeMinutes}
                  <span className="text-sm font-medium text-muted-foreground">m</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                <Pause className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">PARKING STATUS</p>
                                <p className="text-xs text-muted-foreground">Last: 0h 10m</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">TOTAL TODAY</p>
                            <p className="text-xl font-bold">{formatHoursMinutes(vehicle.idlingHours)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                                <Play className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">MOVING STATUS</p>
                                <p className="text-xs text-muted-foreground">Last: 0h 8m</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">TOTAL TODAY</p>
                            <p className="text-xl font-bold text-green-500">{formatHoursMinutes(vehicle.workingHours - vehicle.idlingHours)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* System Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">System Status</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">AC Status</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button>
                        <AirVent className={cn("h-5 w-5", vehicle.acStatus === 'On' ? 'text-green-500' : 'text-red-500')} />
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
                        <Power className={cn("h-5 w-5", vehicle.ignitionStatus === 'On' ? 'text-green-500' : 'text-red-500')} />
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
                <DeviceSignalIcon signal={vehicle.deviceSignal} />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Vehicle Battery</span>
                <BatteryIcon level={vehicle.battery} tooltipLabel="Vehicle Battery" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Blackbox Battery</span>
                <BatteryIcon level={vehicle.gpsDeviceBattery} tooltipLabel="Blackbox Battery" />
              </div>
            </div>

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
          </div>
        </ScrollArea>
        {/* Footer Actions */}
        <div className="p-4 border-t shrink-0 grid grid-cols-3 gap-2">
          <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={() => onRecenter(vehicle)}>
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Recenter</span>
          </Button>
          <Button asChild variant="outline" className="flex flex-col h-16 gap-1">
            <Link to={`/vehicle-status/route-playback?vehicle=${vehicle.vehicleNo}&date=${playbackDate}`}>
              <Play className="h-5 w-5" />
              <span className="text-xs">Playback</span>
            </Link>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="h-5 w-5" />
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