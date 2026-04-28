import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Signal,
  SignalMedium,
  SignalHigh,
  SignalZero,
  TriangleAlert,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  ExternalLink,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MoreHorizontal,
  X,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import VehicleDetailDialog from './VehicleDetailDialog';
import { useApi } from '@/hooks/useApi';
import { getLiveStatusData } from '@/data/mockApi';
import type { VehicleStatus, LiveVehicleStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import LiveLocationDialog from './LiveLocationDialog';
import CarBatteryIcon from '../icons/CarBatteryIcon';
import { Badge } from '@/components/ui/badge';
import BlackboxSignalIcon from '../icons/BlackboxSignalIcon';
import { getIconUrl } from '@/lib/map-utils';

const StatusBadge = ({ status }: { status: VehicleStatus }) => {
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
  return (
    <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full', styles[status])}>
      {status}
    </span>
  );
};

const DeviceSignalIcon = ({ signal }: { signal: number }) => {
  let text, color;
  switch (signal) {
    case 0:
      text = 'Disconnected';
      color = 'text-red-500';
      break;
    case 1:
    case 2:
      text = 'Low';
      color = 'text-yellow-500';
      break;
    case 3:
      text = 'Normal';
      color = 'text-lime-500';
      break;
    case 4:
      text = 'Excellent';
      color = 'text-green-500';
      break;
    default:
      text = 'Unknown';
      color = 'text-muted-foreground';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>
            <BlackboxSignalIcon className={cn('h-5 w-5', color)} />
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
  switch (signal) {
    case 0:
      Icon = TriangleAlert;
      text = 'No Signal';
      color = 'text-red-500';
      break;
    case 1:
    case 2:
      Icon = SignalMedium;
      text = 'Low';
      color = 'text-yellow-500';
      break;
    case 3:
      Icon = SignalHigh;
      text = 'Normal';
      color = 'text-lime-500';
      break;
    case 4:
      Icon = Signal;
      text = 'Excellent';
      color = 'text-green-500';
      break;
    default:
      Icon = SignalZero;
      text = 'Unknown';
      color = 'text-muted-foreground';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>
            <Icon className={cn('h-5 w-5', color)} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>GSM Signal: {text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const BatteryIcon = ({ level, tooltipLabel }: { level: number; tooltipLabel: string }) => {
  let Icon, text, color;
  if (level > 70) {
    Icon = BatteryFull;
    text = 'High';
    color = 'text-green-500';
  } else if (level > 30) {
    Icon = BatteryMedium;
    text = 'Medium';
    color = 'text-yellow-500';
  } else {
    Icon = BatteryLow;
    text = 'Low';
    color = 'text-red-500';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>
            <Icon className={cn('h-5 w-5', color)} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>{tooltipLabel}: {text} ({level}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const VehicleBatteryIcon = ({ level, tooltipLabel }: { level: number; tooltipLabel: string }) => {
  let text, color;
  if (level > 70) {
    text = 'High';
    color = 'text-green-500';
  } else if (level > 30) {
    text = 'Medium';
    color = 'text-yellow-500';
  } else {
    text = 'Low';
    color = 'text-red-500';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>
            <CarBatteryIcon className={cn('h-5 w-5', color)} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white border-black">
          <p>
            {tooltipLabel}: {text} ({level}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const TableSkeleton = () => (
  <TableBody>
    {Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
        <TableCell>
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
);

const LiveStatusTable = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFromUrl = searchParams.get('status');

  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<LiveVehicleStatus | null>(null);
  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);
  const [selectedVehicleForLive, setSelectedVehicleForLive] = useState<LiveVehicleStatus | null>(null);

  const { data: liveStatus, loading } = useApi(getLiveStatusData);

  const handleOpenDetail = (vehicle: LiveVehicleStatus) => {
    setSelectedVehicleForDetail(vehicle);
    setIsDetailOpen(true);
  };

  const handleOpenLiveLocation = (vehicle: LiveVehicleStatus) => {
    setSelectedVehicleForLive(vehicle);
    setIsLiveLocationOpen(true);
  };

  const handleClearStatusFilter = () => {
    navigate('/vehicle-status/live');
  };

  const filteredData = useMemo(() => {
    if (!liveStatus) return [];
    let data = liveStatus;
    if (searchTerm) {
      data = data.filter(row => 
        row.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFromUrl) {
      data = data.filter(row => row.status === statusFromUrl);
    }
    return data;
  }, [liveStatus, searchTerm, statusFromUrl]);

  const pageCount = Math.ceil(filteredData.length / pagination.pageSize);
  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const firstRowIndex = pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Live Vehicle Status</CardTitle>
            <CardDescription>Real-time status of all vehicles in the fleet.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {statusFromUrl && (
              <Badge variant="secondary" className="flex items-center gap-1 pl-3 pr-1 py-1">
                Status: {statusFromUrl}
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleClearStatusFilter}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-[240px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Vehicle</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Status</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Location</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Telemetry</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Addons</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">System Status</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">Alerts</TableHead>
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider text-center">Analysis</TableHead>
                  <TableHead className="px-6 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              {loading ? <TableSkeleton /> : (
                <TableBody>
                  {paginatedData.map((row) => {
                    const alertCounts = (row.alertDetails || []).reduce((acc, alert) => {
                      acc[alert] = (acc[alert] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                      <TableRow key={row.id} className="border-b hover:bg-muted/50">
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <img
                              src={getIconUrl(row.type, 'Parked')}
                              alt={row.vehicleNo}
                              className="h-12 w-12 object-contain"
                            />
                            <div>
                              <div className="font-semibold">{row.vehicleNo}</div>
                              <div className="text-sm text-muted-foreground">{row.model}</div>
                              <div className="text-xs text-muted-foreground">{row.type}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="font-medium text-brand-blue dark:text-blue-400 cursor-pointer hover:underline truncate max-w-xs"
                            onClick={() => handleOpenLiveLocation(row)}
                          >
                            {row.location}
                          </div>
                          <div className="text-xs text-muted-foreground">Updated: {row.lastUpdated}</div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Distance:</span>
                            <span className="font-semibold"> {row.distance.toFixed(1)} km</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Speed:</span>
                            <span className="font-semibold"> {row.speed} km/h</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Fuel Level:</span>
                            <span className="font-semibold"> {row.fuelLiters.toFixed(1)} L</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                              <DeviceSignalIcon signal={row.deviceSignal} />
                              <GsmSignalIcon signal={row.gsmSignal} />
                              <VehicleBatteryIcon level={row.battery} tooltipLabel="Vehicle Battery" />
                              <BatteryIcon level={row.gpsDeviceBattery} tooltipLabel="Blackbox Battery" />
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-baseline gap-1 cursor-pointer">
                                  <span className={cn(
                                    "text-3xl font-bold",
                                    row.alerts > 0 ? "text-red-500" : "text-muted-foreground"
                                  )}>
                                    {row.alerts}
                                  </span>
                                  <span className="text-sm text-muted-foreground">Alerts</span>
                                </div>
                              </TooltipTrigger>
                              {row.alertDetails && row.alertDetails.length > 0 && (
                                <TooltipContent className="bg-black text-white border-black">
                                  <div className="p-1">
                                    <p className="font-semibold mb-1">Alerts:</p>
                                    <ul className="text-xs space-y-1">
                                      {Object.entries(alertCounts).map(([alert, count]) => (
                                        <li key={alert}>{alert} - {String(count)}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/vehicle-status/route-playback?vehicle=${row.vehicleNo}`}>Route Playback</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/speed-driving/speed-analysis?vehicle=${row.vehicleNo}`}>Speed Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/trip-distance/distance?vehicle=${row.vehicleNo}`}>Distance Report</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/trip-distance/trip-report?vehicle=${row.vehicleNo}`}>Trip Report</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/stoppage-analysis?vehicle=${row.vehicleNo}`}>Stoppage Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/idling-analysis?vehicle=${row.vehicleNo}`}>Idling Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/ignition-on-off-analysis?vehicle=${row.vehicleNo}`}>Ignition Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/summary-management/daily-summary?vehicle=${row.vehicleNo}`}>Summary Report</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDetail(row)}>
                            <ExternalLink className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({ pageIndex: 0, pageSize: Number(value) });
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue placeholder={pagination.pageSize} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {firstRowIndex}-{lastRowIndex} of {filteredData.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      <VehicleDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        vehicle={selectedVehicleForDetail}
      />
      <LiveLocationDialog
        open={isLiveLocationOpen}
        onOpenChange={setIsLiveLocationOpen}
        vehicle={selectedVehicleForLive}
      />
    </>
  );
};

export default LiveStatusTable;