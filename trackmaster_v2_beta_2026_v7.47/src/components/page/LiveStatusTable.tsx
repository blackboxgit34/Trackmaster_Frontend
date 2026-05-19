import { useState, useMemo, useEffect, useRef } from 'react';
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
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import VehicleDetailDialog from './VehicleDetailDialog';
import LiveLocationDialog from './LiveLocationDialog';
import { Skeleton } from '@/components/ui/skeleton';
import CarBatteryIcon from '../icons/CarBatteryIcon';
import { Badge } from '@/components/ui/badge';
import BlackboxSignalIcon from '../icons/BlackboxSignalIcon';
import { getVehicleStatusList } from '@/hooks/useApi';
import { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import type { VehicleStatus, LiveVehicleStatus } from '@/types';


const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Moving:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',

    Parked:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',

    IgnitionOn:
      'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',

    Stopped:
      'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',

    Breakdown:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',

    Idle:
      'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-1 text-xs font-semibold rounded-full',
        styles[status] || styles.Stopped
      )}
    >
      {status}
    </span>
  );
};

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
      color = 'text-green-500';
      break;

    case gpsAntConStatus === 1 && GPSFix === 1:
      Icon = SignalMedium;
      text = 'Low GPS Signal';
      color = 'text-yellow-500';
      break;

    case gpsAntConStatus === 1 && GPSFix === 0:
      Icon = SignalZero;
      text = 'GPS Antena Connected But No GPS Signal';
      color = 'text-red-500';
      break;

    case gpsAntConStatus === 0:
      Icon = TriangleAlert;
      text = 'GPS Antena Disconnected';
      color = 'text-gray-500';
      break;

    default:
      Icon = TriangleAlert;
      text = 'Unknown';
      color = 'text-muted-foreground';
      break;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>
            <BlackboxSignalIcon className={cn('h-5 w-5', color)} />
          </button>
        </TooltipTrigger>

        <TooltipContent>
          <p>{text}</p>
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
      color = 'text-muted-foreground';
      break;
    // No GSM Signal
    case signal > 31:
      Icon = SignalZero;
      text = 'No GSM Signal';
      color = 'text-red-500';
      break;

    // Excellent GSM Signal
    case signal < 32 && signal >= 25:
      Icon = Signal;
      text = 'Full GSM Signal';
      color = 'text-green-500';
      break;

    // Good GSM Signal
    case signal < 25 && signal >= 20:
      Icon = SignalHigh;
      text = 'Low GSM Signal';
      color = 'text-lime-500';
      break;

    // InSufficient GSM Signal
    case signal < 20 && signal >= 10:
      Icon = SignalMedium;
      text = 'Very Low GSM Signal';
      color = 'text-yellow-500';
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
      color = 'text-muted-foreground';
      break;
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
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


// const BatteryIcon = ({
//   level,
//   tooltipLabel,
// }: {
//   level: number;
//   tooltipLabel: string;
// }) => {
//   let Icon, text, color;

//   if (level > 70) {
//     Icon = BatteryFull;
//     text = 'High';
//     color = 'text-green-500';
//   } else if (level > 30) {
//     Icon = BatteryMedium;
//     text = 'Medium';
//     color = 'text-yellow-500';
//   } else {
//     Icon = BatteryLow;
//     text = 'Low';
//     color = 'text-red-500';
//   }

//   return (
//     <TooltipProvider>
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <button>
//             <Icon className={cn('h-5 w-5', color)} />
//           </button>
//         </TooltipTrigger>

//         <TooltipContent className="bg-black text-white border-black">
//           <p>
//             {tooltipLabel}: {text} ({level}%)
//           </p>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );
// };
const BatteryIcon = ({ battery, tooltipLabel }: { battery: number; tooltipLabel: string }) => {
  let Icon, text, color;
  switch (true) {
    case battery == null:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'text-muted-foreground';
      break;

    case battery >= 12.5:
      Icon = BatteryFull;
      text = 'High';
      color = 'text-green-500';
      break;


    case battery < 12.5 && battery >= 10:
      Icon = BatteryMedium;
      text = 'Low';
      color = 'text-lime-500';
      break;


    case battery < 10 && battery >= 5:
      Icon = BatteryLow;
      text = 'Very Low';
      color = 'text-yellow-500';
      break;


    case battery < 5:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'text-muted-foreground';
      break;

    default:
      Icon = TriangleAlert;
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
          <p>
            {tooltipLabel}: {text} ({battery}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

};

//   level,
//   tooltipLabel,
// }: {
//   level: number;
//   tooltipLabel: string;
// }) => {
//   let text, color;

//   if (level > 70) {
//     text = 'High';
//     color = 'text-green-500';
//   } else if (level > 30) {
//     text = 'Medium';
//     color = 'text-yellow-500';
//   } else {
//     text = 'Low';
//     color = 'text-red-500';
//   }

//   return (
//     <TooltipProvider>
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <button>
//             <CarBatteryIcon className={cn('h-5 w-5', color)} />
//           </button>
//         </TooltipTrigger>

//         <TooltipContent className="bg-black text-white border-black">
//           <p>
//             {tooltipLabel}: {text} ({level}%)
//           </p>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );
// };
const BatteryIconDevice = ({ deviceBattery, tooltipLabel }: { deviceBattery: number; tooltipLabel: string }) => {
  let Icon, text, color;
  switch (true) {
    case deviceBattery == null:
      Icon = TriangleAlert;
      text = 'Battery Disconnected';
      color = 'text-muted-foreground';
      break;

    case deviceBattery == 3:
      Icon = BatteryFull;
      text = 'High';
      color = 'text-green-500';
      break;


    case deviceBattery == 2:
      Icon = BatteryMedium;
      text = 'Low';
      color = 'text-lime-500';
      break;

    case deviceBattery == 1:
      Icon = BatteryLow;
      text = 'Very Low';
      color = 'text-yellow-500';
      break;

    default:
      Icon = TriangleAlert;
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
          <p>
            {tooltipLabel}: {text} ({deviceBattery}%)
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

        <TableCell>
          <Skeleton className="h-6 w-20 rounded-full" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-32" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-4 w-32" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-5 w-24" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-8 w-16" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-8 w-8 rounded-full" />
        </TableCell>

        <TableCell>
          <Skeleton className="h-8 w-8 rounded-full" />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
);

const LiveStatusTable = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const statusFromUrl = searchParams.get('status');

  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] =
    useState<any | null>(null);

  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);

  const [selectedVehicleForLive, setSelectedVehicleForLive] =
    useState<any | null>(null);

  const [liveStatus, setLiveStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const latestRequestRef  = useRef(0);

  const getLiveStatusData = async () => {
    const requestId = ++latestRequestRef.current;

    try {
      setLoading(true);

      // CLEAR OLD DATA IMMEDIATELY
      setLiveStatus([]);
      setTotalRecords(0);

      const authData = JSON.parse(
        localStorage.getItem('trackmaster-auth') || '{}'
      );

      const requestModel: DataTableRequestModel = {
        CustId: authData?.custId || 0,

        iDisplayStart:
          pagination.pageIndex * pagination.pageSize,

        iDisplayLength: pagination.pageSize,

        sSearch: searchTerm || '',

        sortDirection: 'desc',

        interval: 0,

        Status: statusFromUrl || null,
      };

      const response = await getVehicleStatusList({
        pageName: 'livestatus',
        CustId: authData?.custId || 0,
        requestModel,
      });

      // IGNORE OLD API RESPONSES
      if (requestId !== latestRequestRef.current) {
        return;
      }

      if (response) {
        setLiveStatus(response);

        setTotalRecords(
          response.length > 0
            ? (response[0] as any).totalRecords || 0
            : 0
        );
      }
    } catch (error) {
      console.error('API ERROR:', error);

      setLiveStatus([]);
      setTotalRecords(0);
    } finally {
      // ONLY HIDE LOADER FOR LATEST REQUEST
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    getLiveStatusData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchTerm,
    statusFromUrl,
  ]);

  const handleOpenDetail = (vehicle: any) => {
    setSelectedVehicleForDetail(vehicle);
    setIsDetailOpen(true);
  };

  const handleOpenLiveLocation = (vehicle: any) => {
    setSelectedVehicleForLive(vehicle);
    setIsLiveLocationOpen(true);
  };

  const handleClearStatusFilter = () => {
    navigate('/vehicle-status/live');
  };

  const pageCount = Math.ceil(
    totalRecords / pagination.pageSize
  );

  const paginatedData = liveStatus;

  const firstRowIndex =
    pagination.pageIndex * pagination.pageSize + 1;

  const lastRowIndex = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRecords
  );

  return (
    <>
      <Card>
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/50 rounded-xl">
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-5 py-3 rounded-lg shadow-lg border">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>

              <span className="text-sm font-medium text-foreground">
                Please wait...
              </span>
            </div>
          </div>
        )}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              Live Vehicle Status
            </CardTitle>

            <CardDescription>
              Real-time status of all vehicles in the fleet.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {statusFromUrl && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 pl-3 pr-1 py-1"
              >
                Status: {statusFromUrl}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleClearStatusFilter}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Search vehicle..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);

                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: 0,
                  }));
                }}
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
                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Vehicle
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Status
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Location
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Telemetry
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Addons
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    System Status
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    Alerts
                  </TableHead>

                  <TableHead className="px-6 py-3 uppercase text-xs font-semibold text-muted-foreground tracking-wider text-center">
                    Analysis
                  </TableHead>

                  <TableHead className="px-6 py-3"></TableHead>
                </TableRow>
              </TableHeader>

              {loading ? (
                <TableSkeleton />
              ) : (

                <TableBody>
                  {paginatedData.map((row) => {
                    const alertCounts = (
                      row.alertDetails || []
                    ).reduce((acc: any, alert: any) => {
                      acc[alert] = (acc[alert] || 0) + 1;
                      return acc;
                    }, {});

                    return (
                      <TableRow
                        key={row.bbid}
                        className="border-b hover:bg-muted/50"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <img
                              src={`/icons/${row.type}.png`}
                              alt={row.vehicleNo}
                              className="h-12 w-12 object-contain"
                            />

                            <div>
                              <div className="font-semibold">
                                {row.vehicleNo}
                              </div>

                              {/* <div className="text-sm text-muted-foreground">
                                {row.type}
                              </div> */}

                              <div className="text-xs text-muted-foreground">
                                {row.bbid}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge
                            status={row.status}
                          />
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="font-medium text-brand-blue dark:text-blue-400 cursor-pointer hover:underline truncate max-w-xs"
                            onClick={() =>
                              handleOpenLiveLocation(row)
                            }
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: row.location,
                              }}
                            />
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Updated: {row.lastUpdated}
                          </div>
                        </TableCell>

                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Distance:
                            </span>

                            <span className="font-semibold">
                              {' '}
                              {Number(
                                row.distance || 0
                              ).toFixed(1)}{' '}
                              km
                            </span>
                          </div>

                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Speed:
                            </span>

                            <span className="font-semibold">
                              {' '}
                              {row.speed} km/h
                            </span>
                          </div>
                        </TableCell>

                        {/* SAME ADDON UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Fuel Level:
                            </span>

                            <span className="font-semibold">
                              {' '}
                              {row.curentFuelLevel || 0} L
                            </span>
                          </div>
                        </TableCell>

                        {/* SAME SYSTEM STATUS UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* GPS SIGNAL */}
                            <DeviceSignalIcon
                              gpsAntConStatus={row.deviceSignal}
                              GPSFix={row.GPSFix}
                            />

                            <GsmSignalIcon signal={row.gsmSignal} />

                            <BatteryIcon
                              battery={row.battery}
                              tooltipLabel="Vehicle Battery"
                            />
                            <BatteryIconDevice
                              deviceBattery={row.gpsDeviceBattery}
                              tooltipLabel="Blackbox Battery"
                            />
                          </div>
                        </TableCell>

                        {/* SAME ALERT UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-baseline gap-1 cursor-pointer">
                                  <span
                                    className={cn(
                                      'text-3xl font-bold',
                                      row.alerts > 0
                                        ? 'text-red-500'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {row.alerts || 0}
                                  </span>

                                  <span className="text-sm text-muted-foreground">
                                    Alerts
                                  </span>
                                </div>
                              </TooltipTrigger>

                              {row.alertDetails &&
                                row.alertDetails.length >
                                0 && (
                                  <TooltipContent className="bg-black text-white border-black">
                                    <div className="p-1">
                                      <p className="font-semibold mb-1">
                                        Alerts:
                                      </p>

                                      <ul className="text-xs space-y-1">
                                        {Object.entries(
                                          alertCounts
                                        ).map(
                                          ([
                                            alert,
                                            count,
                                          ]) => (
                                            <li key={alert}>
                                              {alert} -{' '}
                                              {String(
                                                count
                                              )}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </TooltipContent>
                                )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* SAME ANALYSIS UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/vehicle-status/route-playback?vehicle=${row.vehName}`}
                                >
                                  Route Playback
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/reports/speed-driving/speed-analysis?vehicle=${row.vehName}`}
                                >
                                  Speed Analysis
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/reports/trip-distance/distance?vehicle=${row.vehName}`}
                                >
                                  Distance Report
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        {/* SAME DETAIL BUTTON */}
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleOpenDetail(row)
                            }
                          >
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
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>

            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(value),
                });
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue
                  placeholder={pagination.pageSize}
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {firstRowIndex}-{lastRowIndex} of{' '}
              {totalRecords}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    pageIndex: 0,
                  }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    pageIndex: p.pageIndex - 1,
                  }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    pageIndex: p.pageIndex + 1,
                  }))
                }
                disabled={
                  pagination.pageIndex >= pageCount - 1
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    pageIndex: pageCount - 1,
                  }))
                }
                disabled={
                  pagination.pageIndex >= pageCount - 1
                }
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