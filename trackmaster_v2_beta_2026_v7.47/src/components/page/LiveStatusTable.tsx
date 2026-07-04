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
  DoorOpen,
  Fuel,
  ShieldAlert,
  Snowflake,
  Thermometer,
  Unlock,
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
import { API_BASE_URL } from '@/config/Api';
import { fetchAndCalculatePlaybackData } from '@/lib/playback-utils';
import { ArrowUpDown } from "lucide-react";
import { getVehiclePngUrl } from '@/lib/map-utils';
import { toast } from '@/hooks/use-toast';
import type { VehicleStatus, LiveVehicleStatus } from '@/types';

const minimalDotCache = new Map<string, string>();
const StatusBadge = ({ status }: { status: string }) => {
  if (!minimalDotCache.has(status)) {
    const color = getStatusColorHex(status);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88" width="32" height="32">
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25" />
          </filter>
        </defs>
        <circle cx="61.44" cy="61.44" r="57" fill="#ffffff" filter="url(#shadow)" />
        <circle cx="61.44" cy="61.44" r="50" fill="${color}" />
        <path d="M61.44 28 L87 82 L61.44 72 L35 82 Z" fill="#ffffff" />
      </svg>
    `;

    minimalDotCache.set(
      status,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    );
  }

  const iconUrl = minimalDotCache.get(status)!;

  return (
    <div className="flex items-center gap-2">
      <img
        src={iconUrl}
        alt={status}
        className="h-5 w-5 shrink-0"
      />
      <span className="text-sm font-medium">
        {status}
      </span>
    </div>
  );
};
export const getStatusColorHex = (status: string) => {
  switch (status) {
    case 'Moving': return '#22c55e';
    case 'Parked': return '#eab308';
    case 'Ignition On': return '#0ea5e9';
    case 'Idle': return '#14b8a6';
    case 'High Speed': return '#f97316';
    case 'Breakdown': return '#6b7280';
    case 'Unreachable': return '#ef4444';
    case 'Battery Disconnect': return '#f43f5e';
    case 'Towed': return '#a855f7';
    default: return '#6b7280';
  }
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
      color = 'red';
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
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10, });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<any | null>(null);
  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);
  const [selectedVehicleForLive, setSelectedVehicleForLive] = useState<any | null>(null);
  const [liveStatus, setLiveStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const latestRequestRef = useRef(0);
  const [fuelMap, setFuelMap] = useState<any>({});
  const [playbackMap, setPlaybackMap] = useState<any>({});
  const [sortConfig, setSortConfig] = useState({
    sortColumn: 'vehname',
    sortDirection: 'asc' as 'asc' | 'desc',
  });
  const getLiveStatusData = async (silent = false, forcedPageIndex?: number) => {
    const requestId = ++latestRequestRef.current;

    try {
      if (!silent) {
        setLoading(true);
      }

      const authData = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const effectivePageIndex =
        forcedPageIndex !== undefined ? forcedPageIndex : pagination.pageIndex;

      let vehiclesToDisplay: any[] = [];
      let totalCount = 0;

      if (statusFromUrl) {
        // Server paginates ALL records first then filters, so page 2+ returns empty
        // when a status filter is active. Fix: fetch all vehicles, filter + paginate client-side.
        const requestModel: DataTableRequestModel = {
          CustId: authData?.custId || 0,
          iDisplayStart: 0,
          iDisplayLength: 9999,
          sSearch: searchTerm || "",
          sortColumn: sortConfig.sortColumn,
          sortDirection: sortConfig.sortDirection,
        };

        const allRecords = await getVehicleStatusList({
          pageName: "livestatus",
          CustId: authData?.custId || 0,
          requestModel,
        });

        if (requestId !== latestRequestRef.current) return;

        const filtered = (allRecords || []).filter(r => r.status === statusFromUrl);
        totalCount = filtered.length;

        const start = effectivePageIndex * pagination.pageSize;
        vehiclesToDisplay = filtered.slice(start, start + pagination.pageSize);

        if (vehiclesToDisplay.length === 0 && effectivePageIndex > 0) {
          vehiclesToDisplay = filtered.slice(0, pagination.pageSize);
          setPagination(prev => ({ ...prev, pageIndex: 0 }));
        }
      } else {
        const requestModel: DataTableRequestModel = {
          CustId: authData?.custId || 0,
          iDisplayStart: effectivePageIndex * pagination.pageSize,
          iDisplayLength: pagination.pageSize,
          sSearch: searchTerm || "",
          sortColumn: sortConfig.sortColumn,
          sortDirection: sortConfig.sortDirection,
        };

        const response = await getVehicleStatusList({
          pageName: "livestatus",
          CustId: authData?.custId || 0,
          requestModel,
        });

        if (requestId !== latestRequestRef.current) return;

        vehiclesToDisplay = response || [];
        totalCount =
          vehiclesToDisplay.length > 0
            ? vehiclesToDisplay[0]?.totalRecords || 0
            : 0;
      }

      setLiveStatus(vehiclesToDisplay);
      setTotalRecords(totalCount);

    } catch (error) {
      console.log(error);

    } finally {

      if (
        requestId === latestRequestRef.current &&
        !silent
      ) {
        setLoading(false);
      }

    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      sortColumn: column,
      sortDirection:
        prev.sortColumn === column && prev.sortDirection === 'asc'
          ? 'desc'
          : 'asc',
    }));

    setPagination(p => ({ ...p, pageIndex: 0 }));
  };

  useEffect(() => {

    const interval = setInterval(() => {

      // silent refresh
      getLiveStatusData(true);

    }, 60000);

    return () => clearInterval(interval);

  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchTerm,
    statusFromUrl,
    sortConfig
  ]);

  useEffect(() => {

    getLiveStatusData(false);

  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchTerm,
    sortConfig
  ]);

  useEffect(() => {
    setPagination(prev => ({
      pageIndex: 0,
      pageSize: prev.pageSize,
    }));
    getLiveStatusData(false, 0);
  }, [statusFromUrl]);


  useEffect(() => {
    const pageCount = Math.ceil(totalRecords / pagination.pageSize);

    if (pagination.pageIndex >= pageCount && pageCount > 0) {
      setPagination(prev => ({
        ...prev,
        pageIndex: 0,
      }));
    }
  }, [totalRecords, pagination.pageSize]);



  const handleOpenDetail = (vehicle: any) => {

    setSelectedVehicleForDetail({
      ...vehicle,

      distance:
        playbackMap[vehicle.bbid]?.totalDistance || 0,

      speed:
        vehicle.speed || 0,

      latLongHistory:
        playbackMap[vehicle.bbid]?.latLongHistory ||
        vehicle.latLongHistory ||
        [],
    });

    setIsDetailOpen(true);
  };

  const handleOpenLiveLocation = (vehicle: any) => {
    setSelectedVehicleForLive({
      ...vehicle,
      latLongHistory:
        playbackMap[vehicle.bbid]?.latLongHistory ||
        vehicle.latLongHistory ||
        [],
    });
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

  // useEffect(() => {
  //   if (paginatedData.length === 0)
  //     return;

  //   const bbids =
  //     paginatedData.map(x => x.bbid);

  //   fetch(`${API_BASE_URL}/VehicleStatus/GetFuelLevels`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       bbids
  //     })
  //   })
  //     .then(res => res.json())
  //     .then(result => {

  //       if (!result.success)
  //         return;

  //       const fuelObj =
  //         result.data.reduce(
  //           (acc: any, item: any) => {

  //             acc[item.bbid] = item;

  //             return acc;

  //           }, {});

  //       setFuelMap(fuelObj);

  //     })
  //     .catch(err => {

  //       console.log(err);

  //     });

  // }, [paginatedData]);

  
  // ================= PLAYBACK =================
  useEffect(() => {
    let cancelled = false;

    const currentDateTime = new Date();
    async function load() {
      if (paginatedData.length === 0) return;

      try {
        const results = await Promise.all(
          paginatedData.map(item =>
            fetchAndCalculatePlaybackData(
              item.bbid,
              currentDateTime
            )
          )
        );

        if (cancelled) return;

        const map: any = {};

        results.forEach((res, index) => {
          const bbid = paginatedData[index].bbid;

          map[bbid] = {
            totalDistance: res.totalDistance,
            latLongHistory:
              res.playbackData?.latLongHistory || []
          };
        });

        setPlaybackMap(map);

      } catch (error) {
        console.error("Playback API Error:", error);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [paginatedData]);

  const AddonIcon = ({
    status,
    icon: Icon,
    tooltipLabel,
    addonDataLabel,
    addonDataValue,
    onClick
  }: {
    status: 'working' | 'error' | 'uninstalled';
    icon: any;
    tooltipLabel: string;
    addonDataLabel?: string;
    addonDataValue?: string | number | null;
    onClick: () => void;
  }) => {
    let color = 'text-gray-300 dark:text-gray-600';
    let text = 'Not Installed';

    if (status === 'working') {
      color = 'text-green-500';
      text = 'Active';
    } else if (status === 'error') {
      color = 'text-red-500';
      text = 'Error / Not Working';
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center justify-center p-1 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
              onClick={onClick}
            >
              <Icon className={cn("h-4 w-4", color)} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white border-black">
            <p className="font-medium">{tooltipLabel}: {text}</p>
            {status === 'working' && addonDataLabel && addonDataValue !== undefined && addonDataValue !== null && (
              <p className="text-sm mt-1 text-gray-300">{addonDataLabel}: {addonDataValue}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleAddonClick = (status: 'working' | 'error' | 'uninstalled', addonName: string, link: string) => {
    if (status === 'uninstalled') {
      toast({
        title: `${addonName} Not Installed`,
        description: "To install this addon, please contact support.",
        action: <Button variant="outline" size="sm" onClick={() => window.location.href = 'mailto:support@example.com'}>Contact</Button>
      });
    } else {
      navigate(link);
    }
  };


  return (
    <>
      <Card>
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
              <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
              <span className="text-sm">Please wait ...</span>
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
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('vehname')}
                  >
                    <div className="flex items-center gap-2">
                      Vehicle

                      <ArrowUpDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          sortConfig.sortColumn === 'vehname' &&
                          sortConfig.sortDirection === 'asc' &&
                          "rotate-180"
                        )}
                      />
                    </div>
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
                            {/* <img
                              src={`/icons/${row.type}.png`}
                              alt={row.vehicleNo}
                              className="h-12 w-12 object-contain"
                            /> */}

                            <img
                              src={getVehiclePngUrl(row.type)}
                              alt={row.vehicleNo}
                              className="h-12 w-12 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=200&auto=format&fit=crop';
                              }}
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
                              {Number(playbackMap[row.bbid]?.totalDistance || 0).toFixed(1)} km
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
                          {row.addons ? (
                            <div className="grid grid-cols-3 gap-1 w-[80px]">
                              <AddonIcon
                                status={row.addons.fuel}
                                icon={Fuel}
                                tooltipLabel="Fuel Monitoring"
                                addonDataLabel="Current Fuel Level"
                                addonDataValue={row.fuelLevel != null ? `${Number(row.fuelLevel).toFixed(1)}L` : 'N/A'}
                                onClick={() => handleAddonClick(row.addons.fuel, "Fuel Monitoring", `/addons/fuel-reports/fuel-analysis?vehicle=${row.vehicleNo}`)}
                              />
                              <AddonIcon
                                status={row.addons.temp}
                                icon={Thermometer}
                                tooltipLabel="Temperature Monitoring"
                                addonDataLabel="Cargo Temperature"
                                addonDataValue={`${(row.engineTemp - 80).toFixed(1)}°C`}
                                onClick={() => handleAddonClick(row.addons.temp, "Temperature Monitoring", `/addons/refrigerator-temp?vehicle=${row.vehicleNo}`)}
                              />
                              <AddonIcon
                                status={row.addons.ac}
                                icon={Snowflake}
                                tooltipLabel="AC On/Off"
                                addonDataLabel="AC Status"
                                addonDataValue={row.acStatus}
                                onClick={() => handleAddonClick(row.addons.ac, "AC On/Off", `/reports/summary-management/daily-summary?vehicle=${row.vehicleNo}`)}
                              />
                              <AddonIcon
                                status={row.addons.door}
                                icon={DoorOpen}
                                tooltipLabel="Door Open/Close"
                                onClick={() => handleAddonClick(row.addons.door, "Door Open/Close", `/reports/summary-management/daily-summary?vehicle=${row.vehicleNo}`)}
                              />
                              <AddonIcon
                                status={row.addons.lid}
                                icon={Unlock}
                                tooltipLabel="Lid Open/Close"
                                onClick={() => handleAddonClick(row.addons.lid, "Lid Open/Close", `/addons/fuel-reports/fuel-analysis?vehicle=${row.vehicleNo}`)}
                              />
                              <AddonIcon
                                status={row.addons.immobilizer}
                                icon={ShieldAlert}
                                tooltipLabel="Vehicle Immobilizer"
                                addonDataLabel="Ignition"
                                addonDataValue={row.ignitionStatus}
                                onClick={() => handleAddonClick(row.addons.immobilizer, "Vehicle Immobilizer", `/reports/vehicle-status-health/vehicle-status?vehicle=${row.vehicleNo}`)}
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">N/A</div>
                          )}
                        </TableCell>




                        {/* SAME SYSTEM STATUS UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap">


                          <div className="flex items-center gap-3">
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
                                      row.alertsCount > 0
                                        ? 'text-red-500'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {row.alertsCount || 0}
                                  </span>

                                  <span className="text-sm text-muted-foreground">
                                    Alerts
                                  </span>
                                </div>
                              </TooltipTrigger>

                              <TooltipContent className="bg-black text-white border-black">
                                {row.alertDetails && row.alertDetails.length > 0 ? (
                                  <div className="p-1">
                                    <p className="font-semibold mb-1">Alerts:</p>
                                    <ul className="text-xs space-y-1">
                                      {Object.entries(alertCounts).map(([alert, count]) => (
                                        <li key={alert}>
                                          {alert} - {String(count)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <p className="text-xs font-medium">
                                    Battery Disconnected: {row.alertsCount || 0}{' '}
                                    {(row.alertsCount || 0) === 1 ? 'alert' : 'alerts'}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* SAME ANALYSIS UI */}
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/vehicle-status/route-playback?vehicle=${row.bbid}`}>Route Playback</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/speed-driving/speed-analysis?vehicle=${row.bbid}`}>Speed Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/trip-distance/distance?vehicle=${row.bbid}`}>Distance Report</Link>
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem asChild>
                                <Link to={`/reports/trip-distance/trip-report?vehicle=${row.bbid}`}>Trip Report</Link>
                              </DropdownMenuItem> */}
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/stoppage-analysis?vehicle=${row.bbid}`}>Stoppage Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/idling-analysis?vehicle=${row.bbid}`}>Idling Analysis</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/reports/time-activity/ignition-on-off-analysis?vehicle=${row.bbid}`}>Ignition Analysis</Link>
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem asChild>
                                <Link to={`/reports/summary-management/daily-summary?vehicle=${row.bbid}`}>Summary Report</Link>
                              </DropdownMenuItem> */}
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