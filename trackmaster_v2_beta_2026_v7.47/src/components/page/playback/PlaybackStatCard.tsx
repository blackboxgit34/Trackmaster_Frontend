import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaybackStatCardProps {
  Icon: LucideIcon;
  title: string;
  value: string;
  unit: string;
  iconColorClass: string;
}

const PlaybackStatCard = ({ Icon, title, value, unit, iconColorClass }: PlaybackStatCardProps) => {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className={cn("h-4 w-4", iconColorClass)} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">{title}</p>
        <p className="text-base font-bold leading-tight">
          {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
};

export default PlaybackStatCard;