import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, CreditCard, FileText, Leaf, FileHeart, CalendarClock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'safe' | 'warning' | 'expired';

const getStatusInfo = (statusText: string): { text: string; color: string; status: Status } => {
  if (statusText.toLowerCase().includes('expired')) {
    return { text: statusText, color: 'text-red-500', status: 'expired' };
  }
  const daysMatch = statusText.match(/in (\d+) days/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (days <= 15) {
      return { text: statusText, color: 'text-orange-500', status: 'warning' };
    }
  }
  return { text: statusText, color: 'text-muted-foreground', status: 'safe' };
};

const complianceData = [
  {
    count: 20,
    title: 'AIS 140',
    statusText: 'Expires in 30 days',
    Icon: ShieldCheck,
    iconColor: 'blue',
  },
  {
    count: 45,
    title: 'Fastag',
    statusText: 'Expires in 15 days',
    Icon: CreditCard,
    iconColor: 'orange',
  },
  {
    count: 5,
    title: 'Permit',
    statusText: 'Expired 5 days ago',
    Icon: FileText,
    iconColor: 'red',
  },
  {
    count: 50,
    title: 'Pollution',
    statusText: 'Expires in 90 days',
    Icon: Leaf,
    iconColor: 'green',
  },
  {
    count: 35,
    title: 'Insurance',
    statusText: 'Expires in 45 days',
    Icon: FileHeart,
    iconColor: 'pink',
  },
  {
    count: 12,
    title: 'Subscription',
    statusText: 'Expires in 7 days',
    Icon: CalendarClock,
    iconColor: 'orange',
  },
];

const colorVariants = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-600 dark:text-pink-400',
  },
};

const ComplianceStatus = () => {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileWarning className="h-5 w-5 text-muted-foreground" />
          Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {complianceData.map((item) => {
            const variant = colorVariants[item.iconColor as keyof typeof colorVariants];
            const statusInfo = getStatusInfo(item.statusText);
            return (
              <div key={item.title} className="flex items-center gap-2 p-2 bg-card border rounded-lg">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0", variant.bg)}>
                  <item.Icon className={cn("h-4 w-4", variant.text)} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {item.count} {item.title}
                  </p>
                  <p className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceStatus;