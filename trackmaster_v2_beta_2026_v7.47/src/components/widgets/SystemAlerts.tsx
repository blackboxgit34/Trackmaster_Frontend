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
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-transparent hover:border-border/60 transition-colors">
      <Icon className={cn("h-5 w-5 flex-shrink-0", item.color)} strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-base text-foreground leading-none">{item.count}</p>
        <p 
          className="text-[11px] text-muted-foreground leading-tight truncate mt-1" 
          title={item.label}
        >
          {item.label}
        </p>
      </div>
    </div>
  );
};

const SystemAlerts = () => {
  return (
    <Card className="h-full flex flex-col w-full overflow-hidden">
      <CardHeader className="p-4 pb-2 shrink-0 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Today's Alerts</CardTitle>
            <CardDescription className="text-xs">Last 24 hours</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-4 flex flex-col gap-6 min-w-[600px]">
            
            {/* Vehicle Alerts Category */}
            <div>
              <h4 className="text-[11px] font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Vehicle Alerts
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {dashboardAlertsData.vehicleAlerts.map(item => (
                  <AlertItem key={item.id} item={item} />
                ))}
              </div>
            </div>
            
            {/* Driving Behaviour Category */}
            <div>
              <h4 className="text-[11px] font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Driving Behaviour
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {dashboardAlertsData.drivingBehaviourAlerts.map(item => (
                  <AlertItem key={item.id} item={item} />
                ))}
              </div>
            </div>
            
            {/* Fuel Alerts Category */}
            <div>
              <h4 className="text-[11px] font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Fuel Alerts
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {dashboardAlertsData.fuelAlerts.map(item => (
                  <AlertItem key={item.id} item={item} />
                ))}
              </div>
            </div>
            
            {/* Addon Alerts Category */}
            <div>
              <h4 className="text-[11px] font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Addon Alerts
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {dashboardAlertsData.addonAlerts.map(item => (
                  <AlertItem key={item.id} item={item} />
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SystemAlerts;