import { Card, CardContent } from '@/components/ui/card';
import {
  Truck,
  Plug,
  PlugZap,
  Bug,
  ArrowUpCircle,
  Fuel,
  ArrowDownCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { liveStatusData } from '@/data/mockData';

const SensorStatusWidget = () => {
  const statusData = [
    { label: 'Sensor Installed', value: 45, icon: Plug, color: 'text-green-50', bgColor: 'bg-green-500' },
    { label: 'Sensor Disconnection', value: 2, icon: PlugZap, color: 'text-orange-50', bgColor: 'bg-orange-500' },
    { label: 'Dirt Error', value: 3, icon: Bug, color: 'text-yellow-50', bgColor: 'bg-yellow-500' },
    { label: 'Total Filling', value: '1200 L', icon: ArrowUpCircle, color: 'text-sky-50', bgColor: 'bg-sky-500' },
    { label: 'Total Consumed', value: '850 L', icon: Fuel, color: 'text-blue-50', bgColor: 'bg-blue-500' },
    { label: 'Total Drainage', value: '50 L', icon: ArrowDownCircle, color: 'text-red-50', bgColor: 'bg-red-500' },
  ];

  const totalVehicles = liveStatusData.length;

  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Sensor Status</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md">
            <Truck className="h-4 w-4" />
            <span>Total Vehicle: <strong>{totalVehicles}</strong></span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {statusData.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={`#`}
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

export default SensorStatusWidget;