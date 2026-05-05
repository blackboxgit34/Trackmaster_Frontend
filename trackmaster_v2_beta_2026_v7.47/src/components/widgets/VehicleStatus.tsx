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
  totalVehicles: number;
  moving: number;
  highSpeed: number;
  ignitionON: number;
  parked: number;
  towed: number;
  unreachable: number;
  batteryDisconnect: number;
  breakdown: number;
};

type Props = {
  data: VehicleStatusType;
};
const VehicleStatusWidget = ({ data }: Props) => {
  const statusData = [
    { label: 'Moving', value: data.moving || 0, icon: TrendingUp, color: 'text-green-50', bgColor: 'bg-green-500' },
    { label: 'Parked', value: data.parked || 0, icon: ParkingCircle, color: 'text-yellow-50', bgColor: 'bg-yellow-500' },
    { label: 'Ignition On', value: data.ignitionON || 0, icon: Power, color: 'text-sky-50', bgColor: 'bg-sky-500' },
    { label: 'High Speed', value: data.highSpeed || 0, icon: Gauge, color: 'text-orange-50', bgColor: 'bg-orange-500' },
    { label: 'Towed', value: data.towed || 0, icon: Truck, color: 'text-purple-50', bgColor: 'bg-purple-500' },
    { label: 'Unreachable', value: data.unreachable || 0, icon: WifiOff, color: 'text-gray-50', bgColor: 'bg-gray-500' },
    { label: 'Battery Disconnect', value: data.batteryDisconnect || 0, icon: BatteryWarning, color: 'text-orange-50', bgColor: 'bg-orange-500' },
    { label: 'Breakdown', value: data.breakdown || 0, icon: TriangleAlert, color: 'text-red-50', bgColor: 'bg-red-500' },
  ];

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardContent className="p-2">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Vehicle Status</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md">
            <Truck className="h-4 w-4" />
            <span>Total Vehicle: <strong>{data.totalVehicles}</strong></span>
          </div>
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {statusData.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={`/vehicle-status/live?status=${encodeURIComponent(item.label)}`}
                className="p-2 flex items-center gap-2 border rounded-md transition-colors duration-150 ease-in-out hover:bg-accent cursor-pointer"
              >
                <div className={`p-1.5 rounded-full ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-tight">{item.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleStatusWidget;