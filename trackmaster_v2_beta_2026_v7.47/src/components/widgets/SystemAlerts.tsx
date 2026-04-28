import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { dashboardAlertsData } from '@/data/mockData';
import { Bell, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  item: {
    id: string;
    label: string;
    count: number;
    Icon: LucideIcon;
    color: string;
  };
}

const AlertItem = ({ item }: AlertItemProps) => {
  const { Icon } = item;
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      <Icon className={cn("h-5 w-5 flex-shrink-0", item.color)} />
      <div className="flex-1">
        <p className="font-bold text-base text-foreground">{item.count}</p>
        <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
      </div>
    </div>
  );
};

const SystemAlerts = () => {
  return (
    <Card className="h-full flex flex-col w-full">
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Alerts</CardTitle>
            <CardDescription className="text-xs">From 31st Jul - 7th Aug</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Vehicle Alerts</h4>
          <div className="grid grid-cols-2 gap-2">
            {dashboardAlertsData.vehicleAlerts.map(item => (
              <AlertItem key={item.id} item={item} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Driving Behaviour Alerts</h4>
          <div className="grid grid-cols-2 gap-2">
            {dashboardAlertsData.drivingBehaviourAlerts.map(item => (
              <AlertItem key={item.id} item={item} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Fuel Alerts</h4>
          <div className="grid grid-cols-2 gap-2">
            {dashboardAlertsData.fuelAlerts.map(item => (
              <AlertItem key={item.id} item={item} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Addon Alerts</h4>
          <div className="grid grid-cols-2 gap-2">
            {dashboardAlertsData.addonAlerts.map(item => (
              <AlertItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemAlerts;