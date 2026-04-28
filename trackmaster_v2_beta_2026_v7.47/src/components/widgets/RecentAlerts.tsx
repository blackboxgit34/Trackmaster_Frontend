import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { recentAlertsData } from '@/data/mockData';

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

const getPriorityBadgeClasses = (priority: Priority): string => {
  switch (priority) {
    case 'High':
    case 'Critical':
      return 'bg-destructive text-destructive-foreground border-transparent';
    case 'Medium':
      return 'bg-secondary text-secondary-foreground border-transparent';
    case 'Low':
    default:
      return 'bg-transparent text-foreground border-border';
  }
};

const RecentAlerts = () => {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                  <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>A summary of the most recent critical alerts from your fleet.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[250px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="px-4 py-2">Vehicle</TableHead>
                <TableHead className="px-4 py-2">Alert</TableHead>
                <TableHead className="px-4 py-2">Time</TableHead>
                <TableHead className="px-4 py-2">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAlertsData.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium px-4 py-2">{alert.vehicle}</TableCell>
                  <TableCell className="px-4 py-2">{alert.alert}</TableCell>
                  <TableCell className="text-muted-foreground px-4 py-2">{alert.time}</TableCell>
                  <TableCell className="px-4 py-2">
                    <Badge className={cn(getPriorityBadgeClasses(alert.priority as Priority))}>
                      {alert.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentAlerts;