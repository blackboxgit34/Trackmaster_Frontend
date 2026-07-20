import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  ParkingCircle,
  Power,
  Gauge,
  WifiOff,
  BatteryWarning,
  Truck,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type VehicleStatusType = {
  totalVehicles?: number;
  moving?: number;
  highSpeed?: number;
  ignitionON?: number;
  parked?: number;
  towed?: number;
  unreachable?: number;
  batteryDisconnect?: number;
  breakdown?: number;
};

// Old Changes 
// type Props = {
//   data?: VehicleStatusType;
// };



// New Changes 
type Vehicle = {
  speed: number;
  overSpeedLimit: number;
  lastUpdated: string;
  ignitionStatus: boolean;
};

// New Changes 
type Props = {
  data?: Vehicle[];
};

// New Changes 
const getVehicleStatus = (
  speed: number,
  overspeed: number,
  lastUpdated: string,
  ignitionStatus: boolean
): string => {
   const lastCleaned = lastUpdated.replace('Z', '').replace('T', ' ');
  const now = new Date();
  const last = new Date(lastCleaned);
  const hoursDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  switch (true) {
    case hoursDiff > 6:
      return 'Unreachable';

    case speed > 0 &&
      speed >= overspeed &&
      ignitionStatus:
      return 'High Speed';

    case speed > 0 &&
      speed < overspeed &&
      ignitionStatus:
      return 'Moving';

    case speed <= 0 &&
      ignitionStatus:
      return 'Ignition On';

    case speed <= 0 &&
      !ignitionStatus:
      return 'Parked';

    case speed > 0 &&
      !ignitionStatus:
      return 'Towed';

    default:
      return 'Unknown';
  }
};

const VehicleStatusWidget = ({ data }: Props) => {
debugger;
const statusCounts = (data || []).reduce<Record<string, number>>(
    (acc, v: Vehicle) => {
      const status = getVehicleStatus(
        v.speed,
        v.overSpeedLimit,
        v.lastUpdated,
        v.ignitionStatus
      );

      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );

 const statusData = [
    { label: 'Moving', value: statusCounts['Moving'] || 0, iconUrl: '/icons/vehicle status icons/moving.svg', bgColor: 'bg-green-500' },
    { label: 'Parked', value: statusCounts['Parked'] || 0, iconUrl: '/icons/vehicle status icons/parked.svg', bgColor: 'bg-yellow-500' },
    { label: 'Ignition On', value: statusCounts['Ignition On'] || 0, iconUrl: '/icons/vehicle status icons/ignition-on.svg', bgColor: 'bg-sky-500' },
    { label: 'High Speed', value: statusCounts['High Speed'] || 0, iconUrl: '/icons/vehicle status icons/high-speed.svg', bgColor: 'bg-orange-500' },
    { label: 'Towed', value: statusCounts['Towed'] || 0, iconUrl: '/icons/vehicle status icons/towed.svg', bgColor: 'bg-purple-500' },
    { label: 'Unreachable', value: statusCounts['Unreachable'] || 0, iconUrl: '/icons/vehicle status icons/unreachable.svg', bgColor: 'bg-red-500' },
    { label: 'Battery Disconnect', value: statusCounts['Battery Disconnect'] || 0, iconUrl: '/icons/vehicle status icons/battery-disconnect.svg', bgColor: 'bg-rose-500' },
    { label: 'Breakdown', value: statusCounts['Breakdown'] || 0, iconUrl: '/icons/vehicle status icons/breakdown.svg', bgColor: 'bg-gray-500' },
  ];


  const totalVehicles = data?.length;
 return (
    <Card className="col-span-1 lg:col-span-3">
      <CardContent className="p-2">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Vehicle Status</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md">
            <Truck className="h-4 w-4" />
            <span>Total Vehicle: <strong>{totalVehicles}</strong></span>
          </div>
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {statusData.map((item) => (
            <Link
              key={item.label}
              to={`/vehicle-status/live?status=${encodeURIComponent(item.label)}`}
              className="p-2 flex items-center gap-2 border rounded-md transition-colors duration-150 ease-in-out hover:bg-accent cursor-pointer"
            >
              <div className={`p-1.5 rounded-full ${item.bgColor}`}>
                <img src={item.iconUrl} alt={item.label} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // return (
  //   <Card className="col-span-1 lg:col-span-3">
  //     <CardContent className="p-2">
  //       <div className="flex justify-between items-center mb-2">
  //         <div>
  //           <h2 className="text-base font-semibold text-foreground">Vehicle Status</h2>
  //         </div>
  //         <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md">
  //           <Truck className="h-4 w-4" />
  //           <span>Total Vehicle: <strong>{data?.length || 0}</strong></span>
  //         </div>
  //       </div>
  //       <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
  //         {statusData.map((item) => {
  //           const Icon = item.icon;
  //           return (
  //             <Link
  //               key={item.label}
  //               to={`/vehicle-status/live?status=${encodeURIComponent(item.label)}`}
  //               className="p-2 flex items-center gap-2 border rounded-md transition-colors duration-150 ease-in-out hover:bg-accent cursor-pointer"
  //             >
  //               <div className={`p-1.5 rounded-full ${item.bgColor}`}>
  //                 <Icon className={`h-4 w-4 ${item.color}`} />
  //               </div>
  //               <div>
  //                 <p className="text-base font-bold text-foreground leading-tight">{item.value}</p>
  //                 <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
  //               </div>
  //             </Link>
  //           );
  //         })}
  //       </div>
  //     </CardContent>
  //   </Card>
  // );
};

export default VehicleStatusWidget;